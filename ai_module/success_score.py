
from pathlib import Path

import math
import numpy as np
import pandas as pd
from autogluon.tabular import TabularPredictor


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "outputs" / "binary_success_model" / "predictor"

FEATURES = [
    "early_assessment_count",
    "early_average_score",
    "early_lowest_score",
    "early_latest_submission_day",
    "early_total_clicks",
    "early_active_days",
    "early_active_sites",
]

predictor = TabularPredictor.load(str(MODEL_PATH))


def calculate_success_score(data: dict) -> dict:
    """Predict the probability of Pass or Distinction using AutoGluon."""

    missing = [
        feature for feature in FEATURES
        if feature not in data or data[feature] is None
    ]

    if missing:
        return {
            "success_probability": None,
            "success_score": None,
            "status": "insufficient_data",
            "missing_features": missing,
            "model_type": "AutoGluon binary classifier",
        }

    row_data = {}

    for feature in FEATURES:
        value = data[feature]

        if isinstance(value, bool):
            raise ValueError(f"{feature} must be a numeric value.")

        try:
            number = float(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(
                f"{feature} must be a valid number."
            ) from exc

        if not math.isfinite(number) or number < 0:
            raise ValueError(
                f"{feature} must be a finite, non-negative number."
            )

        row_data[feature] = number

    if row_data["early_average_score"] > 100:
        raise ValueError("early_average_score cannot exceed 100.")

    if row_data["early_active_days"] > 28:
        raise ValueError("early_active_days cannot exceed 28.")

    row = pd.DataFrame([row_data], columns=FEATURES)

    probabilities = predictor.predict_proba(row)

    if isinstance(probabilities, pd.DataFrame):
        if 1 not in probabilities.columns:
            raise ValueError(
                "The model does not expose the successful-outcome class."
            )
        probability = float(probabilities[1].iloc[0])
    else:
        labels = list(predictor.class_labels)
        if 1 not in labels:
            raise ValueError(
                "The model does not expose the successful-outcome class."
            )
        probability = float(
            np.asarray(probabilities)[0, labels.index(1)]
        )

    predicted_class = int(
        np.asarray(predictor.predict(row)).reshape(-1)[0]
    )

    return {
        "success_probability": round(probability, 4),
        "success_score": round(probability * 100, 2),
        "predicted_outcome": (
            "Likely successful"
            if predicted_class == 1
            else "At risk of unsuccessful outcome"
        ),
        "status": "complete",
        "model_type": "AutoGluon binary success classifier",
        "target_definition": (
            "Pass or Distinction = successful; "
            "Fail or Withdrawn = unsuccessful"
        ),
        "evaluation_metrics": {
            "accuracy": 0.7294,
            "f1": 0.7215,
            "roc_auc": 0.7995,
        },
        "disclaimer": (
            "The score is a model-estimated probability of Pass or "
            "Distinction, not a guaranteed outcome or a validated "
            "overall student-success score. The model was trained "
            "on OULAD data and may require institutional validation."
        ),
    }
