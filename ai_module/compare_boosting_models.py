
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
)

from xgboost import XGBClassifier
from catboost import CatBoostClassifier


# =====================================================
# CONFIGURATION
# =====================================================

DATA_PATH = Path("data/raw/oulad/early_warning_dataset.csv")
OUTPUT_DIR = Path("outputs/model_comparison")

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

RANDOM_STATE = 42
THRESHOLD = 0.5


# =====================================================
# LOAD DATA
# =====================================================

print("Loading dataset...")

df = pd.read_csv(DATA_PATH)

required_columns = FEATURES + [TARGET, GROUP]
missing_columns = [
    col for col in required_columns if col not in df.columns
]

if missing_columns:
    raise ValueError(
        f"Missing columns in dataset: {missing_columns}"
    )

df = df[required_columns].dropna(
    subset=[TARGET, GROUP]
).copy()

df[TARGET] = df[TARGET].astype(int)

if not set(df[TARGET].unique()).issubset({0, 1}):
    raise ValueError("risk_target must contain only 0 and 1.")

X = df[FEATURES]
y = df[TARGET]
groups = df[GROUP]

print("Total records:", len(df))
print("Positive class (Fail/Withdrawn):", int(y.sum()))
print("Negative class (Pass/Distinction):", int((y == 0).sum()))


# =====================================================
# GROUPED TRAIN / VALIDATION / TEST SPLIT
# =====================================================

print("\nCreating student-grouped splits...")

# Reserve 20% of students for the final test set.
split1 = GroupShuffleSplit(
    n_splits=1,
    test_size=0.20,
    random_state=42,
)

train_val_idx, test_idx = next(
    split1.split(X, y, groups=groups)
)

# Reserve 25% of the remaining students for validation.
split2 = GroupShuffleSplit(
    n_splits=1,
    test_size=0.25,
    random_state=43,
)

train_relative_idx, val_relative_idx = next(
    split2.split(
        X.iloc[train_val_idx],
        y.iloc[train_val_idx],
        groups=groups.iloc[train_val_idx],
    )
)

train_idx = train_val_idx[train_relative_idx]
val_idx = train_val_idx[val_relative_idx]

X_train = X.iloc[train_idx]
y_train = y.iloc[train_idx]

X_val = X.iloc[val_idx]
y_val = y.iloc[val_idx]

X_test = X.iloc[test_idx]
y_test = y.iloc[test_idx]

# Final training data includes train + validation only.
train_val_indices = np.concatenate([train_idx, val_idx])

X_train_val = X.iloc[train_val_indices]
y_train_val = y.iloc[train_val_indices]

train_students = set(groups.iloc[train_idx])
val_students = set(groups.iloc[val_idx])
test_students = set(groups.iloc[test_idx])

assert train_students.isdisjoint(val_students)
assert train_students.isdisjoint(test_students)
assert val_students.isdisjoint(test_students)

print("Training rows:  ", len(X_train))
print("Validation rows:", len(X_val))
print("Test rows:      ", len(X_test))
print("Student overlap check passed.")


# =====================================================
# DEFINE MODELS
# =====================================================

# Compute class weight from training data only.
negative_count = int((y_train == 0).sum())
positive_count = int((y_train == 1).sum())

positive_weight = negative_count / max(positive_count, 1)

models = {
    "Random Forest": RandomForestClassifier(
        n_estimators=200,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    ),

    "XGBoost": XGBClassifier(
        n_estimators=500,
        max_depth=4,
        learning_rate=0.03,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=5,
        reg_lambda=1.0,
        scale_pos_weight=positive_weight,
        eval_metric="logloss",
        tree_method="hist",
        random_state=RANDOM_STATE,
        n_jobs=4,
    ),

    "CatBoost": CatBoostClassifier(
        iterations=600,
        depth=5,
        learning_rate=0.03,
        loss_function="Logloss",
        eval_metric="Logloss",
        auto_class_weights="Balanced",
        random_seed=RANDOM_STATE,
        verbose=False,
        allow_writing_files=False,
        thread_count=4,
    ),
}


# =====================================================
# PIPELINE AND METRICS
# =====================================================

def make_pipeline(model):
    return Pipeline([
        (
            "imputer",
            SimpleImputer(strategy="median", add_indicator=True),
        ),
        ("model", model),
    ])


def calculate_metrics(model, X_data, y_true):
    probabilities = model.predict_proba(X_data)[:, 1]
    predictions = (probabilities >= THRESHOLD).astype(int)

    return {
        "accuracy": accuracy_score(y_true, predictions),
        "precision": precision_score(
            y_true, predictions, zero_division=0
        ),
        "recall": recall_score(
            y_true, predictions, zero_division=0
        ),
        "f1": f1_score(
            y_true, predictions, zero_division=0
        ),
        "roc_auc": roc_auc_score(y_true, probabilities),
        "pr_auc": average_precision_score(
            y_true, probabilities
        ),
    }


# =====================================================
# TRAIN AND COMPARE ON VALIDATION SET
# =====================================================

validation_results = []

print("\n========== VALIDATION RESULTS ==========")

for name, estimator in models.items():
    print(f"\nTraining {name}...")

    pipeline = make_pipeline(estimator)
    pipeline.fit(X_train, y_train)

    result = calculate_metrics(pipeline, X_val, y_val)

    validation_results.append({
        "model": name,
        **result,
    })

    print(f"Accuracy:  {result['accuracy']:.4f}")
    print(f"Precision: {result['precision']:.4f}")
    print(f"Recall:    {result['recall']:.4f}")
    print(f"F1-score:  {result['f1']:.4f}")
    print(f"ROC-AUC:   {result['roc_auc']:.4f}")
    print(f"PR-AUC:    {result['pr_auc']:.4f}")


validation_df = pd.DataFrame(validation_results)

validation_df = validation_df.sort_values(
    by="f1",
    ascending=False,
)

validation_df.to_csv(
    OUTPUT_DIR / "validation_results.csv",
    index=False,
)

# Select based on validation F1 only.
best_model_name = validation_df.iloc[0]["model"]

print("\nValidation ranking:")
print(validation_df.to_string(index=False))
print("\nSelected model:", best_model_name)


# =====================================================
# RETRAIN AND EVALUATE ON FINAL TEST SET
# =====================================================

print("\n========== FINAL TEST RESULTS ==========")

test_results = []
best_pipeline = None

for name, estimator in models.items():
    print(f"\nFinal training: {name}")

    final_pipeline = make_pipeline(estimator)

    # Do not use the held-out test records for training.
    final_pipeline.fit(X_train_val, y_train_val)

    result = calculate_metrics(
        final_pipeline,
        X_test,
        y_test,
    )

    test_results.append({
        "model": name,
        **result,
    })

    print(f"Accuracy:  {result['accuracy']:.4f}")
    print(f"Precision: {result['precision']:.4f}")
    print(f"Recall:    {result['recall']:.4f}")
    print(f"F1-score:  {result['f1']:.4f}")
    print(f"ROC-AUC:   {result['roc_auc']:.4f}")
    print(f"PR-AUC:    {result['pr_auc']:.4f}")

    if name == best_model_name:
        best_pipeline = final_pipeline


test_df = pd.DataFrame(test_results)

test_df.to_csv(
    OUTPUT_DIR / "test_results.csv",
    index=False,
)

# Save the model selected using validation F1.
model_path = OUTPUT_DIR / "best_validated_model.joblib"

joblib.dump(best_pipeline, model_path)

print("\n========== COMPLETED ==========")
print("Validation results:", OUTPUT_DIR / "validation_results.csv")
print("Test results:      ", OUTPUT_DIR / "test_results.csv")
print("Selected model:    ", best_model_name)
print("Saved model:       ", model_path.resolve())

print(
    "\nNote: Test results are for reporting and final evaluation. "
    "Do not use them to tune model parameters."
)
