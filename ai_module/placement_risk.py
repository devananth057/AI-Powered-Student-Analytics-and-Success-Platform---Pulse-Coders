
from pathlib import Path

import numpy as np
import pandas as pd
from autogluon.tabular import TabularPredictor

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "outputs" / "placement_predictor"

FEATURES = [
    "CGPA",
    "Internships",
    "Projects",
    "Workshops/Certifications",
    "AptitudeTestScore",
    "SoftSkillsRating",
    "ExtracurricularActivities",
    "PlacementTraining",
    "SSC_Marks",
    "HSC_Marks",
]

NUMERIC_FEATURES = [
    "CGPA",
    "Internships",
    "Projects",
    "Workshops/Certifications",
    "AptitudeTestScore",
    "SoftSkillsRating",
    "SSC_Marks",
    "HSC_Marks",
]

CATEGORICAL_FEATURES = [
    "ExtracurricularActivities",
    "PlacementTraining",
]

predictor = TabularPredictor.load(str(MODEL_PATH))


def calculate_placement_risk(data: dict) -> dict:
    """Predict placement status using the trained AutoGluon model."""

    missing = [
        feature for feature in FEATURES
        if feature not in data or data[feature] is None
    ]

    if missing:
        raise ValueError(f"Missing required features: {missing}")

    row = pd.DataFrame(
        [{feature: data[feature] for feature in FEATURES}],
        columns=FEATURES,
    )

    # Validate numeric features only.
    try:
        for feature in NUMERIC_FEATURES:
            row[feature] = pd.to_numeric(
                row[feature], errors="raise"
            )
    except (TypeError, ValueError) as exc:
        raise ValueError(
            "Numeric placement features must contain valid numbers."
        ) from exc

    numeric_values = row[NUMERIC_FEATURES].to_numpy(dtype=float)

    if not np.isfinite(numeric_values).all():
        raise ValueError("Numeric placement features must be finite numbers.")

    # Keep categorical features as strings.
    for feature in CATEGORICAL_FEATURES:
        row[feature] = row[feature].astype(str).str.strip()

        if row[feature].iloc[0] not in {"Yes", "No"}:
            raise ValueError(
                f"{feature} must be either 'Yes' or 'No'."
            )

    # Predict placement probability.
    probabilities = predictor.predict_proba(row)

    if isinstance(probabilities, pd.DataFrame):
        if "Placed" not in probabilities.columns:
            raise ValueError("The model does not contain the 'Placed' class.")

        placement_probability = float(
            probabilities["Placed"].iloc[0]
        )
    else:
        probability_array = np.asarray(probabilities, dtype=float)
        class_labels = list(predictor.class_labels)

        if "Placed" not in class_labels:
            raise ValueError("The model does not contain the 'Placed' class.")

        placement_probability = float(
            probability_array[0, class_labels.index("Placed")]
        )

    prediction = predictor.predict(row)
    predicted_class = str(np.asarray(prediction).reshape(-1)[0])

    # Configurable presentation thresholds, not learned risk labels.
    if placement_probability >= 0.70:
        risk = "Low"
    elif placement_probability >= 0.40:
        risk = "Medium"
    else:
        risk = "High"

    return {
        "predicted_placement_status": predicted_class,
        "placement_probability": round(placement_probability, 4),
        "placement_risk": risk,
        "model_type": "AutoGluon placement classifier",
        "disclaimer": (
            "Prediction is based on a placement dataset. The probability "
            "and risk bands require validation on representative institutional "
            "data. This result is not a guarantee of placement."
        ),
    }
