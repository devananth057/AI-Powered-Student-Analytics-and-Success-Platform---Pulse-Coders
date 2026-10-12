
from pathlib import Path

import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
)
from autogluon.tabular import TabularPredictor

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data" / "raw" / "placement"
MODEL_DIR = BASE_DIR / "outputs" / "placement_predictor"

TARGET = "PlacementStatus"

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

COLUMNS = FEATURES + [TARGET]


def load_dataset(filename):
    path = DATA_DIR / filename

    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    df = pd.read_csv(path)

    missing = set(COLUMNS) - set(df.columns)
    if missing:
        raise ValueError(f"{filename} is missing columns: {sorted(missing)}")

    df = df[COLUMNS].copy()

    if df.isnull().any().any():
        raise ValueError(f"{filename} contains missing values.")

    df[TARGET] = df[TARGET].astype(str).str.strip()

    return df


def main():
    train_df = load_dataset("Placement_train.csv")
    val_df = load_dataset("Placement_validation.csv")
    test_df = load_dataset("Placement_test.csv")

    print("Training records:", len(train_df))
    print("Validation records:", len(val_df))
    print("Test records:", len(test_df))
    print("\nTraining label distribution:")
    print(train_df[TARGET].value_counts())

    # Train using training data; use validation data for model selection.
    predictor = TabularPredictor(
        label=TARGET,
        path=str(MODEL_DIR),
        eval_metric="accuracy",
    )

    predictor.fit(
        train_data=train_df,
        tuning_data=val_df,
        presets="medium_quality_faster_train",
        time_limit=300,
    )

    # Final evaluation uses the untouched test split.
    X_test = test_df[FEATURES]
    y_true = (test_df[TARGET] == "Placed").astype(int)

    predictions = predictor.predict(X_test)
    probabilities = predictor.predict_proba(X_test)

    classes = list(predictor.class_labels)

    if "Placed" not in classes:
        raise ValueError(
            f"'Placed' class not found in model labels: {classes}"
        )

    y_pred = (predictions == "Placed").astype(int)
    import numpy as np

    y_prob = np.asarray(probabilities["Placed"], dtype=float).reshape(-1)

    metrics = {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall": recall_score(y_true, y_pred, zero_division=0),
        "f1_score": f1_score(y_true, y_pred, zero_division=0),
        "roc_auc": roc_auc_score(y_true, y_prob),
    }

    print("\nHELD-OUT TEST RESULTS")
    for name, value in metrics.items():
        print(f"{name}: {value:.4f}")

    print("\nSaved model:", MODEL_DIR)

    # Save metrics for reporting.
    results_path = BASE_DIR / "outputs" / "placement_test_metrics.csv"
    results_path.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame([metrics]).to_csv(results_path, index=False)

    print("Saved metrics:", results_path)


if __name__ == "__main__":
    main()
