
import json
from pathlib import Path

import pandas as pd
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    classification_report,
    confusion_matrix,
)
from autogluon.tabular import TabularPredictor


# Project paths
ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "raw" / "oulad" / "early_warning_dataset.csv"
OUTPUT_DIR = ROOT / "outputs" / "success_outcome_model"
PREDICTOR_PATH = OUTPUT_DIR / "predictor"

# Only use information available during the first 28 days
FEATURES = [
    "early_assessment_count",
    "early_average_score",
    "early_lowest_score",
    "early_latest_submission_day",
    "early_total_clicks",
    "early_active_days",
    "early_active_sites",
]

TARGET = "final_result"
VALID_CLASSES = ["Distinction", "Pass", "Fail", "Withdrawn"]


def main():
    print("Loading early-warning dataset...")
    df = pd.read_csv(DATA_PATH)

    required = FEATURES + [TARGET, "id_student"]
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    # Keep valid outcome labels; exclude IDs and labels from model features
    df = df.dropna(subset=[TARGET, "id_student"]).copy()
    df[TARGET] = df[TARGET].astype(str).str.strip()
    df = df[df[TARGET].isin(VALID_CLASSES)].copy()

    for col in FEATURES:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    print(f"Rows: {len(df)}")
    print("\nOutcome distribution:")
    print(df[TARGET].value_counts())

    # Split by student ID to reduce leakage between repeated student records
    splitter = GroupShuffleSplit(
        n_splits=1, test_size=0.20, random_state=42
    )
    train_idx, test_idx = next(
        splitter.split(df, df[TARGET], groups=df["id_student"])
    )

    train_df = df.iloc[train_idx][FEATURES + [TARGET]].copy()
    test_df = df.iloc[test_idx][FEATURES + [TARGET]].copy()

    print("\nTraining outcomes:")
    print(train_df[TARGET].value_counts())
    print("\nTest outcomes:")
    print(test_df[TARGET].value_counts())

    if train_df[TARGET].nunique() < 2:
        raise ValueError("Training split has too few outcome classes. Try another split.")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("\nTraining AutoGluon multiclass model...")
    predictor = TabularPredictor(
        label=TARGET,
        problem_type="multiclass",
        eval_metric="accuracy",
        path=str(PREDICTOR_PATH),
    ).fit(
        train_data=train_df,
        presets="medium_quality",
        time_limit=180,
    )

    X_test = test_df[FEATURES]
    y_test = test_df[TARGET]

    predictions = predictor.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    macro_f1 = f1_score(y_test, predictions, average="macro", zero_division=0)

    report = classification_report(
        y_test,
        predictions,
        labels=VALID_CLASSES,
        zero_division=0,
        output_dict=True,
    )
    matrix = confusion_matrix(y_test, predictions, labels=VALID_CLASSES)

    print("\n===== HELD-OUT TEST RESULTS =====")
    print(f"Accuracy: {accuracy:.4f}")
    print(f"Macro F1: {macro_f1:.4f}")
    print("\nClassification report:")
    print(classification_report(
        y_test, predictions, labels=VALID_CLASSES, zero_division=0
    ))
    print("Confusion matrix (rows=true, columns=predicted):")
    print(pd.DataFrame(
        matrix,
        index=VALID_CLASSES,
        columns=VALID_CLASSES,
    ))

    metrics = {
        "accuracy": float(accuracy),
        "macro_f1": float(macro_f1),
        "classes": VALID_CLASSES,
        "classification_report": report,
        "confusion_matrix": matrix.tolist(),
        "feature_columns": FEATURES,
        "test_rows": int(len(test_df)),
        "training_rows": int(len(train_df)),
        "split_method": "GroupShuffleSplit by id_student",
    }

    with open(OUTPUT_DIR / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"\nModel saved to: {PREDICTOR_PATH}")
    print(f"Metrics saved to: {OUTPUT_DIR / 'metrics.json'}")


if __name__ == "__main__":
    main()
