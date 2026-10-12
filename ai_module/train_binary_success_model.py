
import json
from pathlib import Path

import pandas as pd
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    classification_report,
)
from autogluon.tabular import TabularPredictor

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "raw" / "oulad" / "early_warning_dataset.csv"
OUTPUT_DIR = ROOT / "outputs" / "binary_success_model"
PREDICTOR_PATH = OUTPUT_DIR / "predictor"

FEATURES = [
    "early_assessment_count",
    "early_average_score",
    "early_lowest_score",
    "early_latest_submission_day",
    "early_total_clicks",
    "early_active_days",
    "early_active_sites",
]


def main():
    df = pd.read_csv(DATA_PATH)

    required = FEATURES + ["final_result", "id_student"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")

    df = df.dropna(subset=["final_result", "id_student"]).copy()
    df["final_result"] = df["final_result"].astype(str).str.strip()

    # 1 = successful outcome, 0 = unsuccessful outcome
    df = df[df["final_result"].isin(
        ["Pass", "Distinction", "Fail", "Withdrawn"]
    )].copy()
    df["success_target"] = df["final_result"].isin(
        ["Pass", "Distinction"]
    ).astype(int)

    for col in FEATURES:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    print("Rows:", len(df))
    print("\nTarget distribution:")
    print(df["success_target"].value_counts().sort_index())

    splitter = GroupShuffleSplit(
        n_splits=1, test_size=0.20, random_state=42
    )
    train_idx, test_idx = next(
        splitter.split(df, df["success_target"], groups=df["id_student"])
    )

    train_df = df.iloc[train_idx][FEATURES + ["success_target"]].copy()
    test_df = df.iloc[test_idx][FEATURES + ["success_target"]].copy()

    print("\nTrain rows:", len(train_df))
    print("Test rows:", len(test_df))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    predictor = TabularPredictor(
        label="success_target",
        problem_type="binary",
        eval_metric="roc_auc",
        path=str(PREDICTOR_PATH),
    ).fit(
        train_data=train_df,
        presets="medium_quality",
        time_limit=180,
    )

    X_test = test_df[FEATURES]
    y_test = test_df["success_target"]

    pred = predictor.predict(X_test).astype(int)
    proba = predictor.predict_proba(X_test)[1]

    metrics = {
        "accuracy": float(accuracy_score(y_test, pred)),
        "precision": float(precision_score(y_test, pred, zero_division=0)),
        "recall": float(recall_score(y_test, pred, zero_division=0)),
        "f1": float(f1_score(y_test, pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, proba)),
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
        "features": FEATURES,
        "target_definition": "Pass/Distinction=1; Fail/Withdrawn=0",
        "split_method": "GroupShuffleSplit by id_student",
    }

    print("\n===== BINARY SUCCESS MODEL =====")
    print(json.dumps(metrics, indent=2))
    print("\nClassification report:")
    print(classification_report(y_test, pred, zero_division=0))

    with open(OUTPUT_DIR / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print("\nModel saved to:", PREDICTOR_PATH)
    print("Metrics saved to:", OUTPUT_DIR / "metrics.json")


if __name__ == "__main__":
    main()
