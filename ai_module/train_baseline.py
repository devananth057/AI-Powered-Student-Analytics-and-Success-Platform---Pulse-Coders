
from pathlib import Path

import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
    average_precision_score,
)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

DATA_FILE = Path("data/raw/oulad/early_warning_dataset.csv")

df = pd.read_csv(DATA_FILE)

# Only information available by the early-warning cutoff.
features = [
    "early_assessment_count",
    "early_average_score",
    "early_lowest_score",
    "early_latest_submission_day",
    "early_total_clicks",
    "early_active_days",
    "early_active_sites",
]

X = df[features]
y = df["risk_target"]
groups = df["id_student"]

# Keep all records for a student in the same split.
splitter = GroupShuffleSplit(
    n_splits=1,
    test_size=0.20,
    random_state=42,
)

train_idx, test_idx = next(
    splitter.split(X, y, groups=groups)
)

X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

print("Training records:", len(X_train))
print("Testing records:", len(X_test))
print(
    "Students shared across splits:",
    len(
        set(groups.iloc[train_idx])
        & set(groups.iloc[test_idx])
    ),
)

# Baseline: always predict the most common training class.
baseline = DummyClassifier(strategy="most_frequent")
baseline.fit(X_train, y_train)
baseline_pred = baseline.predict(X_test)

print("\nBASELINE MODEL")
print("Accuracy:", round(accuracy_score(y_test, baseline_pred), 4))

# Model: median imputation, scaling and logistic regression.
model = Pipeline([
    ("imputer", SimpleImputer(
        strategy="median",
        add_indicator=True,
    )),
    ("scaler", StandardScaler()),
    ("classifier", LogisticRegression(
        max_iter=1000,
        class_weight="balanced",
        random_state=42,
    )),
])

model.fit(X_train, y_train)

pred = model.predict(X_test)
prob = model.predict_proba(X_test)[:, 1]

print("\nLOGISTIC REGRESSION")
print("Accuracy:", round(accuracy_score(y_test, pred), 4))
print("ROC-AUC:", round(roc_auc_score(y_test, prob), 4))
print(
    "PR-AUC:",
    round(average_precision_score(y_test, prob), 4),
)

print("\nClassification report:")
print(classification_report(
    y_test,
    pred,
    target_names=["Pass/Distinction", "Fail/Withdrawn"],
    zero_division=0,
))

print("Confusion matrix:")
print(confusion_matrix(y_test, pred))
