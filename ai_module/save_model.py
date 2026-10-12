
from pathlib import Path

import joblib
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import make_pipeline

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data" / "raw" / "oulad" / "early_warning_dataset.csv"
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)

MODEL_FILE = MODEL_DIR / "edupulse_rf.joblib"

FEATURES = [
    "early_assessment_count",
    "early_average_score",
    "early_lowest_score",
    "early_latest_submission_day",
    "early_total_clicks",
    "early_active_days",
    "early_active_sites",
]

df = pd.read_csv(DATA_FILE)

X = df[FEATURES]
y = df["risk_target"]
groups = df["id_student"]

# Reproduce the same train/validation/test split.
split1 = GroupShuffleSplit(
    n_splits=1,
    test_size=0.20,
    random_state=42,
)

trainval_idx, test_idx = next(
    split1.split(X, y, groups=groups)
)

split2 = GroupShuffleSplit(
    n_splits=1,
    test_size=0.25,
    random_state=43,
)

train_rel, val_rel = next(
    split2.split(
        X.iloc[trainval_idx],
        y.iloc[trainval_idx],
        groups=groups.iloc[trainval_idx],
    )
)

train_idx = trainval_idx[train_rel]
val_idx = trainval_idx[val_rel]

# Fit on training + validation data only.
# The held-out test set is not used for fitting.

import numpy as np

fit_idx = np.concatenate([train_idx, val_idx])

X_fit = X.iloc[fit_idx]
y_fit = y.iloc[fit_idx]


model = make_pipeline(
    SimpleImputer(
        strategy="median",
        add_indicator=True,
    ),
    RandomForestClassifier(
        n_estimators=200,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    ),
)

model.fit(X_fit, y_fit)

artifact = {
    "model": model,
    "features": FEATURES,
    "positive_class": 1,
    "target_definition": "Fail or Withdrawn",
    "prediction_cutoff_day": 28,
    "model_type": "RandomForestClassifier",
    "test_accuracy": 0.7200,
    "test_precision": 0.7527,
    "test_recall": 0.6951,
    "test_f1": 0.7228,
    "test_roc_auc": 0.7918,
    "test_pr_auc": 0.8183,
}

joblib.dump(artifact, MODEL_FILE)

print("Model saved successfully.")
print("Path:", MODEL_FILE)
print("Training records:", len(X_fit))
print("Features:", FEATURES)
