
from pathlib import Path

import numpy as np
import pandas as pd
from autogluon.tabular import TabularPredictor
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
)

DATA_PATH = Path("data/raw/oulad/early_warning_dataset.csv")
OUTPUT_DIR = Path("outputs/automl_comparison")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

FEATURES = [
    "early_assessment_count",
    "early_average_score",
    "early_lowest_score",
    "early_latest_submission_day",
    "early_total_clicks",
    "early_active_days",
    "early_active_sites",
]
TARGET = "risk_target"
GROUP = "id_student"


def metrics(y_true, probabilities):
    predictions = (probabilities >= 0.5).astype(int)
    return {
        "accuracy": accuracy_score(y_true, predictions),
        "precision": precision_score(
            y_true, predictions, zero_division=0
        ),
        "recall": recall_score(
            y_true, predictions, zero_division=0
        ),
        "f1": f1_score(y_true, predictions, zero_division=0),
        "roc_auc": roc_auc_score(y_true, probabilities),
        "pr_auc": average_precision_score(y_true, probabilities),
    }


# Load and validate the data.
df = pd.read_csv(DATA_PATH)
required = FEATURES + [TARGET, GROUP]
missing = [column for column in required if column not in df.columns]

if missing:
    raise ValueError(f"Missing dataset columns: {missing}")

df = df[required].dropna(subset=[TARGET, GROUP]).copy()
df[TARGET] = df[TARGET].astype(int)

X = df[FEATURES]
y = df[TARGET]
groups = df[GROUP]

# Hold out 20% of students for final testing.
split1 = GroupShuffleSplit(
    n_splits=1, test_size=0.20, random_state=42
)
train_val_idx, test_idx = next(
    split1.split(X, y, groups=groups)
)

# Hold out 25% of remaining students for validation.
split2 = GroupShuffleSplit(
    n_splits=1, test_size=0.25, random_state=43
)
train_rel, val_rel = next(
    split2.split(
        X.iloc[train_val_idx],
        y.iloc[train_val_idx],
        groups=groups.iloc[train_val_idx],
    )
)

train_idx = train_val_idx[train_rel]
val_idx = train_val_idx[val_rel]

X_train = X.iloc[train_idx]
y_train = y.iloc[train_idx]
X_val = X.iloc[val_idx]
y_val = y.iloc[val_idx]
X_test = X.iloc[test_idx]
y_test = y.iloc[test_idx]

train_val_idx = np.concatenate([train_idx, val_idx])
X_train_val = X.iloc[train_val_idx]
y_train_val = y.iloc[train_val_idx]

# Verify no student occurs across different splits.
student_groups = [
    set(groups.iloc[train_idx]),
    set(groups.iloc[val_idx]),
    set(groups.iloc[test_idx]),
]
assert student_groups[0].isdisjoint(student_groups[1])
assert student_groups[0].isdisjoint(student_groups[2])
assert student_groups[1].isdisjoint(student_groups[2])

print(f"Training rows: {len(train_idx):,}")
print(f"Validation rows: {len(val_idx):,}")
print(f"Test rows: {len(test_idx):,}")

# Fit AutoML on training data only.
train_data = X_train.copy()
train_data[TARGET] = y_train.to_numpy()

validation_predictor = TabularPredictor(
    label=TARGET,
    problem_type="binary",
    eval_metric="f1",
    path=str(OUTPUT_DIR / "validation_predictor"),
    positive_class=1,
).fit(
    train_data=train_data,
    presets="medium_quality_faster_train",
    time_limit=300,
)

val_prob = validation_predictor.predict_proba(X_val)[1].to_numpy()
val_metrics = metrics(y_val.to_numpy(), val_prob)

print("\nAutoML validation metrics:")
for name, value in val_metrics.items():
    print(f"{name}: {value:.4f}")

# Refit separately on training + validation data.
# The final test set remains excluded from fitting.
train_val_data = X_train_val.copy()
train_val_data[TARGET] = y_train_val.to_numpy()

final_predictor = TabularPredictor(
    label=TARGET,
    problem_type="binary",
    eval_metric="f1",
    path=str(OUTPUT_DIR / "final_predictor"),
    positive_class=1,
).fit(
    train_data=train_val_data,
    presets="medium_quality_faster_train",
    time_limit=300,
)

test_prob = final_predictor.predict_proba(X_test)[1].to_numpy()
test_metrics = metrics(y_test.to_numpy(), test_prob)

print("\nAutoML final test metrics:")
for name, value in test_metrics.items():
    print(f"{name}: {value:.4f}")

pd.DataFrame([{"model": "AutoGluon", **val_metrics}]).to_csv(
    OUTPUT_DIR / "validation_results.csv", index=False
)
pd.DataFrame([{"model": "AutoGluon", **test_metrics}]).to_csv(
    OUTPUT_DIR / "test_results.csv", index=False
)

print("\nAutoGluon leaderboard:")
print(final_predictor.leaderboard(silent=True).to_string(index=False))
print("\nResults saved to:", OUTPUT_DIR.resolve())
