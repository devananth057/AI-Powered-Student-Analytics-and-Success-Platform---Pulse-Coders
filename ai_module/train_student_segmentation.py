
from pathlib import Path
import json

import joblib
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


BASE_DIR = Path(__file__).resolve().parent

DATA_PATH = (
    BASE_DIR
    / "data"
    / "raw"
    / "oulad"
    / "early_warning_dataset.csv"
)

OUTPUT_DIR = BASE_DIR / "outputs" / "student_segmentation"
MODEL_PATH = OUTPUT_DIR / "segmentation_pipeline.joblib"
PROFILES_PATH = OUTPUT_DIR / "cluster_profiles.json"

FEATURES = [
    "early_assessment_count",
    "early_average_score",
    "early_lowest_score",
    "early_latest_submission_day",
    "early_total_clicks",
    "early_active_days",
    "early_active_sites",
]

RANDOM_STATE = 42
MAX_TRAIN_ROWS = 100_000
MAX_CLUSTERS = 6
MIN_CLUSTERS = 2


def main():
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATA_PATH}"
        )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Loading OULAD early-warning dataset...")
    df = pd.read_csv(DATA_PATH)

    missing = [col for col in FEATURES if col not in df.columns]
    if missing:
        raise ValueError(f"Dataset is missing features: {missing}")

    # Use features only. Do not use risk_target as a clustering feature.
    data = df[FEATURES].copy()

    for col in FEATURES:
        data[col] = pd.to_numeric(data[col], errors="coerce")

    data = data.dropna(subset=FEATURES)
    data = data.loc[data[FEATURES].notna().all(axis=1)]

    # Remove rows with infinite values.
    data = data.loc[
        data[FEATURES].apply(
            lambda column: column.map(
                lambda value: abs(value) != float("inf")
            )
        ).all(axis=1)
    ]

    if len(data) < MIN_CLUSTERS + 1:
        raise ValueError("Not enough valid rows to train clustering.")

    print(f"Valid rows: {len(data):,}")

    # Limit training size for practical hackathon training time.
    if len(data) > MAX_TRAIN_ROWS:
        train_data = data.sample(
            n=MAX_TRAIN_ROWS,
            random_state=RANDOM_STATE,
        )
    else:
        train_data = data.copy()

    print(f"Rows used for clustering: {len(train_data):,}")

    # Standardize features before evaluating cluster counts.
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(train_data[FEATURES])

    best_k = None
    best_silhouette = -1.0

    upper_k = min(MAX_CLUSTERS, len(train_data) - 1)

    print("Selecting cluster count using silhouette score...")

    for k in range(MIN_CLUSTERS, upper_k + 1):
        candidate = KMeans(
            n_clusters=k,
            random_state=RANDOM_STATE,
            n_init=10,
        )

        labels = candidate.fit_predict(X_scaled)

        if len(set(labels)) < 2:
            continue

        score = silhouette_score(
            X_scaled,
            labels,
            sample_size=min(10_000, len(train_data)),
            random_state=RANDOM_STATE,
        )

        print(f"k={k}, silhouette_score={score:.4f}")

        if score > best_silhouette:
            best_k = k
            best_silhouette = score

    if best_k is None:
        raise RuntimeError("Could not select a valid cluster count.")

    print(f"Selected k={best_k}")
    print(f"Best silhouette score={best_silhouette:.4f}")

    # Save the complete preprocessing + clustering pipeline.
    pipeline = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "kmeans",
                KMeans(
                    n_clusters=best_k,
                    random_state=RANDOM_STATE,
                    n_init=10,
                ),
            ),
        ]
    )

    pipeline.fit(train_data[FEATURES])

    joblib.dump(pipeline, MODEL_PATH)

    # Describe clusters from their original feature values.
    clustered = train_data.copy()

    cluster_predictions = pipeline.predict(train_data[FEATURES])
    clustered["cluster"] = pd.Series(
    cluster_predictions,
    index=clustered.index,
    dtype="int64",
)
    

    overall_medians = train_data[FEATURES].median()
    profiles = {}

    for cluster_id in sorted(
        clustered["cluster"].unique().tolist()
    ):
        group = clustered[clustered["cluster"] == cluster_id]
        means = group[FEATURES].mean()

        higher_performance = (
            means["early_average_score"]
            >= overall_medians["early_average_score"]
        )

        engagement_features = [
            "early_total_clicks",
            "early_active_days",
            "early_active_sites",
        ]

        higher_engagement_count = sum(
            means[feature] >= overall_medians[feature]
            for feature in engagement_features
        )

        engagement_level = (
            "Higher engagement"
            if higher_engagement_count >= 2
            else "Lower engagement"
        )

        performance_level = (
            "Higher assessment performance"
            if higher_performance
            else "Lower assessment performance"
        )

        profiles[str(int(cluster_id))] = {
            "profile_name": (
                f"{performance_level} / {engagement_level}"
            ),
            "student_count_in_training_sample": int(len(group)),
            "feature_means": {
                feature: round(float(means[feature]), 3)
                for feature in FEATURES
            },
        }

    metadata = {
        "features": FEATURES,
        "selected_k": int(best_k),
        "silhouette_score": round(float(best_silhouette), 4),
        "training_rows": int(len(train_data)),
        "source_dataset": str(DATA_PATH),
        "cluster_profiles": profiles,
        "note": (
            "Cluster names describe relative feature averages in the "
            "training sample. They are exploratory profiles, not "
            "validated diagnoses or predictions of student success."
        ),
    }

    with open(PROFILES_PATH, "w", encoding="utf-8") as file:
        json.dump(metadata, file, indent=2)

    print(f"\nSaved pipeline: {MODEL_PATH}")
    print(f"Saved cluster profiles: {PROFILES_PATH}")
    print("Student segmentation training completed.")


if __name__ == "__main__":
    main()
