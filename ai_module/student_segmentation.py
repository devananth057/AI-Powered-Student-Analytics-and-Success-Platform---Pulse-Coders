
from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "outputs" / "student_segmentation"

MODEL_PATH = MODEL_DIR / "segmentation_pipeline.joblib"
PROFILES_PATH = MODEL_DIR / "cluster_profiles.json"

FEATURES = [
    "early_assessment_count",
    "early_average_score",
    "early_lowest_score",
    "early_latest_submission_day",
    "early_total_clicks",
    "early_active_days",
    "early_active_sites",
]

# Load the trained K-Means pipeline and cluster profiles.
if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Trained segmentation model not found: {MODEL_PATH}. "
        "Run train_student_segmentation.py first."
    )

if not PROFILES_PATH.exists():
    raise FileNotFoundError(
        f"Cluster profiles not found: {PROFILES_PATH}. "
        "Run train_student_segmentation.py first."
    )

pipeline = joblib.load(MODEL_PATH)

with open(PROFILES_PATH, "r", encoding="utf-8") as file:
    metadata = json.load(file)

CLUSTER_PROFILES = metadata["cluster_profiles"]


def classify_student(data: dict) -> dict:
    """Assign a student to a trained K-Means cluster."""

    missing = [
        feature
        for feature in FEATURES
        if data.get(feature) is None
    ]

    if missing:
        return {
            "status": "not_assessed_missing_inputs",
            "method": "K-Means clustering",
            "missing_features": missing,
        }

    row = pd.DataFrame(
        [{feature: data[feature] for feature in FEATURES}],
        columns=FEATURES,
    )

    try:
        for feature in FEATURES:
            row[feature] = pd.to_numeric(
                row[feature], errors="raise"
            )
    except (TypeError, ValueError) as exc:
        raise ValueError(
            "All segmentation features must be numeric."
        ) from exc

    values = row.to_numpy(dtype=float)

    if not np.isfinite(values).all():
        raise ValueError(
            "Segmentation features must be finite numbers."
        )

    if row["early_average_score"].iloc[0] > 100:
        raise ValueError(
            "early_average_score must be between 0 and 100."
        )

    if row["early_lowest_score"].iloc[0] > 100:
        raise ValueError(
            "early_lowest_score must be between 0 and 100."
        )

    if (row.select_dtypes(include="number") < 0).any().any():
        raise ValueError(
            "Segmentation features cannot be negative."
        )

    # Predict a cluster using the saved preprocessing + K-Means pipeline.
    cluster_id = int(pipeline.predict(row)[0])
    profile = CLUSTER_PROFILES.get(str(cluster_id), {})

    return {
        "status": "assessed",
        "method": "K-Means clustering",
        "cluster_id": cluster_id,
        "segment": profile.get(
            "profile_name",
            f"Exploratory cluster {cluster_id}",
        ),
        "cluster_profile": profile.get("feature_means", {}),
        "model_quality": {
            "silhouette_score": metadata["silhouette_score"],
            "selected_cluster_count": metadata["selected_k"],
        },
        "interpretation": (
            "This exploratory group is based on early-learning features. "
            "It is not a validated prediction of student success or a "
            "diagnosis of student needs."
        ),
    }
