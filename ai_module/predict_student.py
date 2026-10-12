
from pathlib import Path

import numpy as np
import pandas as pd
import shap
from autogluon.tabular import TabularPredictor

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "outputs" / "automl_comparison" / "final_predictor"
DATA_PATH = BASE_DIR / "data" / "raw" / "oulad" / "early_warning_dataset.csv"

FEATURES = [
    "early_assessment_count",
    "early_average_score",
    "early_lowest_score",
    "early_latest_submission_day",
    "early_total_clicks",
    "early_active_days",
    "early_active_sites",
]

# Load the trained model once.
predictor = TabularPredictor.load(str(MODEL_PATH))

def get_numeric_value(row: pd.DataFrame, feature: str) -> float:
    """Safely extract a finite, real numeric value."""
    scalar = np.asarray(row.at[0, feature]).item()

    if isinstance(scalar, (complex, np.complexfloating)):
        raise ValueError(f"{feature} must be a real number.")

    result = float(scalar)

    if not np.isfinite(result):
        raise ValueError(f"{feature} must be finite.")

    return result





def predict_risk_probability(frame) -> np.ndarray:
    """Return probabilities for historical Fail/Withdrawn (class 1)."""

    # SHAP may supply a NumPy array instead of a DataFrame.
    if isinstance(frame, pd.DataFrame):
        input_frame = frame[FEATURES].copy()
    else:
        input_array = np.asarray(frame)

        if input_array.ndim == 1:
            input_array = input_array.reshape(1, -1)

        if input_array.ndim != 2 or input_array.shape[1] != len(FEATURES):
            raise ValueError(
                f"Expected input with {len(FEATURES)} features; "
                f"received shape {input_array.shape}."
            )

        input_frame = pd.DataFrame(input_array, columns=FEATURES)

    probabilities = predictor.predict_proba(input_frame)

    # Handle AutoGluon's DataFrame output.
    if isinstance(probabilities, pd.DataFrame):
        if 1 not in probabilities.columns:
            raise ValueError("The trained model does not contain class 1.")

        result = probabilities[1].to_numpy(dtype=float)

    else:
        result_array = np.asarray(probabilities, dtype=float)

        if result_array.ndim != 2:
            raise ValueError("Unexpected probability output shape.")

        class_labels = list(predictor.class_labels)

        if 1 not in class_labels:
            raise ValueError("The trained model does not contain class 1.")

        result = result_array[:, class_labels.index(1)]

    return result



# Build a small background dataset for SHAP.
background_data = pd.read_csv(DATA_PATH, usecols=FEATURES)
background_data = background_data.dropna(subset=FEATURES)

if background_data.empty:
    raise ValueError("No complete background records available for SHAP.")

background = background_data.sample(
    n=min(20, len(background_data)),
    random_state=42,
)

# Initialize the explainer only after the prediction function exists.
explainer = shap.KernelExplainer(
    predict_risk_probability,
    background,
)


def explain_prediction(
    row: pd.DataFrame,
    risk_probability: float,
) -> dict:
    """Explain one prediction using approximate SHAP contributions."""
    shap_values = explainer.shap_values(
        row[FEATURES],
        nsamples=100,
        silent=True,
    )

    # Normalize output across common SHAP versions.
    if isinstance(shap_values, list):
        shap_values = shap_values[0]

    values = np.asarray(shap_values, dtype=float)

    # Expected shape: (1, 7). Handle a single-row vector too.
    if values.ndim == 1:
        values = values.reshape(1, -1)
    elif values.ndim == 3:
        values = values[0]
        if values.ndim == 2 and values.shape[-1] == 1:
            values = values[:, 0]
        if values.ndim == 1:
            values = values.reshape(1, -1)

    values = values.reshape(-1)

    if len(values) != len(FEATURES):
        raise ValueError(
            f"Unexpected SHAP output shape: {np.asarray(shap_values).shape}"
        )

    contributions = [
        {
            "feature": feature,
            "contribution": round(float(value), 5),
            "direction": (
                "increases_risk" if value > 0 else "decreases_risk"
            ),
        }
        for feature, value in zip(FEATURES, values)
        if abs(value) > 1e-6
    ]

    positive = sorted(
        [item for item in contributions if item["contribution"] > 0],
        key=lambda item: item["contribution"],
        reverse=True,
    )[:3]

    negative = sorted(
        [item for item in contributions if item["contribution"] < 0],
        key=lambda item: item["contribution"],
    )[:3]

    baseline = float(
        np.asarray(explainer.expected_value, dtype=float).reshape(-1)[0]
    )

    return {
        "method": "SHAP KernelExplainer",
        "baseline_probability": round(baseline, 4),
        "explained_probability": round(float(risk_probability), 4),
        "all_feature_contributions": contributions,
        "top_risk_contributors": positive,
        "top_protective_contributors": negative,
        "interpretation_note": (
            "SHAP contributions explain model behavior, not causation. "
            "The baseline plus all contributions should approximately "
            "reconstruct the prediction; small approximation errors may occur."
        ),
    }


def predict_student(student_data: dict) -> dict:
    """Validate student features and return risk, explanation, and actions."""
    missing = [
        feature
        for feature in FEATURES
        if feature not in student_data or student_data[feature] is None
    ]

    if missing:
        raise ValueError(f"Missing required features: {missing}")

    try:
        row = pd.DataFrame(
            [{feature: student_data[feature] for feature in FEATURES}],
            columns=FEATURES,
        )

        for feature in FEATURES:
            row[feature] = pd.to_numeric(row[feature], errors="raise")

    except (TypeError, ValueError) as exc:
        raise ValueError("All seven features must be numeric.") from exc

    values = row.to_numpy(dtype=float)

    if not np.isfinite(values).all():
        raise ValueError("Feature values must be finite numbers.")

    average_score = get_numeric_value(row, "early_average_score")
    lowest_score = get_numeric_value(row, "early_lowest_score")

    if not 0 <= average_score <= 100:
        raise ValueError("early_average_score must be between 0 and 100.")

    if not 0 <= lowest_score <= 100:
        raise ValueError("early_lowest_score must be between 0 and 100.")

    count_features = [
        "early_assessment_count",
        "early_total_clicks",
        "early_active_days",
        "early_active_sites",
    ]

    for feature in count_features:
        value = get_numeric_value(row, feature)

        if value < 0:
            raise ValueError(f"{feature} cannot be negative.")

        if not value.is_integer():
            raise ValueError(f"{feature} must be a whole number.")

    latest_day = get_numeric_value(row, "early_latest_submission_day")

    if not latest_day.is_integer():
        raise ValueError("early_latest_submission_day must be a whole number.")

    if not 0 <= latest_day <= 28:
        raise ValueError(
            "early_latest_submission_day must be between 0 and 28."
        )

    # Run AutoGluon prediction.
    risk_probability = float(predict_risk_probability(row)[0])
    if risk_probability >= 0.70:
        risk_label = "High"
    elif risk_probability >= 0.40:
        risk_label = "Medium"
    else:
        risk_label = "Low"

    explanation = explain_prediction(row, risk_probability)

    # Rule-based review suggestions are separate from the ML prediction.
    reasons = []
    actions = []

    clicks = get_numeric_value(row, "early_total_clicks")
    active_days = get_numeric_value(row, "early_active_days")
    assessment_count = get_numeric_value(row, "early_assessment_count")

    if clicks < 200:
        reasons.append("Low learning-platform activity")
        actions.append("Help establish a manageable weekly study plan.")

    if active_days < 10:
        reasons.append("Few active learning days")
        actions.append(
            "Agree on regular study sessions and review engagement after one week."
        )

    if assessment_count == 0:
        reasons.append("No early assessments recorded")
        actions.append(
            "Check whether assessments were due, submitted, or unavailable."
        )

    if average_score < 50:
        reasons.append("Low early assessment average")
        actions.append(
            "Offer targeted revision, practice questions, and a follow-up assessment."
        )

    if not reasons:
        reasons.append(
            "Review the student's learning activity and assessment evidence"
        )
        actions.append(
            "Review recent learning activity with faculty before deciding on support."
        )

    return {
        "predicted_outcome_risk": risk_label,
        "probability_of_fail_or_withdrawn": round(risk_probability, 4),
        "model_explanation": explanation,
        "reasons_for_review": reasons,
        "recommended_actions": actions,
        "prediction_cutoff_day": 28,
        "model_type": "AutoGluon AutoML",
        "disclaimer": (
            "Prototype trained on historical OULAD data. The prediction "
            "concerns historical Fail/Withdrawn outcomes, not a verified "
            "need for assistance. SHAP contributions explain model behavior, "
            "not causation. Faculty should review the evidence before acting."
        ),
    }
