
from pathlib import Path

import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


# --------------------------------------------------
# 1. Load dataset
# --------------------------------------------------

DATA_FILE = Path("data/raw/oulad/early_warning_dataset.csv")

df = pd.read_csv(DATA_FILE)

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


# --------------------------------------------------
# 2. Split by student to prevent student overlap
# --------------------------------------------------

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

X_train = X.iloc[train_idx]
y_train = y.iloc[train_idx]

X_val = X.iloc[val_idx]
y_val = y.iloc[val_idx]

X_test = X.iloc[test_idx]
y_test = y.iloc[test_idx]

train_students = set(groups.iloc[train_idx])
val_students = set(groups.iloc[val_idx])
test_students = set(groups.iloc[test_idx])

print("=" * 55)
print("EDUPULSE AI - MODEL COMPARISON")
print("=" * 55)

print("Training records:", len(X_train))
print("Validation records:", len(X_val))
print("Final test records:", len(X_test))

print(
    "Students shared across splits:",
    len(train_students & val_students)
    + len(train_students & test_students)
    + len(val_students & test_students),
)


# --------------------------------------------------
# 3. Define models
# --------------------------------------------------

models = {
    "Logistic Regression": make_pipeline(
        SimpleImputer(
            strategy="median",
            add_indicator=True,
        ),
        StandardScaler(),
        LogisticRegression(
            max_iter=1000,
            class_weight="balanced",
            random_state=42,
        ),
    ),

    "Random Forest": make_pipeline(
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
    ),
}


# --------------------------------------------------
# 4. Evaluate models on validation data only
# --------------------------------------------------

results = []

print("\nVALIDATION RESULTS")

for name, model in models.items():

    model.fit(X_train, y_train)

    pred = model.predict(X_val)
    prob = model.predict_proba(X_val)[:, 1]

    accuracy = accuracy_score(y_val, pred)
    precision = precision_score(
        y_val, pred, zero_division=0
    )
    recall = recall_score(
        y_val, pred, zero_division=0
    )
    f1 = f1_score(
        y_val, pred, zero_division=0
    )
    roc_auc = roc_auc_score(y_val, prob)
    pr_auc = average_precision_score(y_val, prob)

    print(f"\n{name}")
    print("-" * 35)
    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1-score:  {f1:.4f}")
    print(f"ROC-AUC:   {roc_auc:.4f}")
    print(f"PR-AUC:    {pr_auc:.4f}")

    results.append({
        "Model": name,
        "Accuracy": accuracy,
        "Precision": precision,
        "Recall": recall,
        "F1-score": f1,
        "ROC-AUC": roc_auc,
        "PR-AUC": pr_auc,
    })


# --------------------------------------------------
# 5. Compare validation results
# --------------------------------------------------

results_df = pd.DataFrame(results)

results_df = results_df.sort_values(
    by="F1-score",
    ascending=False,
)

print("\n" + "=" * 55)
print("VALIDATION COMPARISON")
print("=" * 55)

print(results_df.to_string(
    index=False,
    formatters={
        "Accuracy": "{:.4f}".format,
        "Precision": "{:.4f}".format,
        "Recall": "{:.4f}".format,
        "F1-score": "{:.4f}".format,
        "ROC-AUC": "{:.4f}".format,
        "PR-AUC": "{:.4f}".format,
    },
))

print(
    "\nValidation leader by F1-score:",
    results_df.iloc[0]["Model"],
)

print("\nFinal test data has NOT been used for model selection.")


# --------------------------------------------------
# 6. Final evaluation of the selected model
# --------------------------------------------------

from sklearn.metrics import confusion_matrix, classification_report

print("\n" + "=" * 55)
print("FINAL TEST EVALUATION - RANDOM FOREST")
print("=" * 55)

# Combine training and validation data after model selection.
X_trainval = pd.concat([X_train, X_val])
y_trainval = pd.concat([y_train, y_val])

# Refit the selected model using all development data.
final_model = models["Random Forest"]
final_model.fit(X_trainval, y_trainval)

# Evaluate once on the untouched test data.
test_pred = final_model.predict(X_test)
test_prob = final_model.predict_proba(X_test)[:, 1]

print("Accuracy:", f"{accuracy_score(y_test, test_pred):.4f}")
print("Precision:", f"{precision_score(y_test, test_pred):.4f}")
print("Recall:", f"{recall_score(y_test, test_pred):.4f}")
print("F1-score:", f"{f1_score(y_test, test_pred):.4f}")
print("ROC-AUC:", f"{roc_auc_score(y_test, test_prob):.4f}")
print(
    "PR-AUC:",
    f"{average_precision_score(y_test, test_prob):.4f}",
)

print("\nClassification report:")
print(
    classification_report(
        y_test,
        test_pred,
        target_names=["Pass/Distinction", "Fail/Withdrawn"],
        zero_division=0,
    )
)

print("Confusion matrix:")
print(confusion_matrix(y_test, test_pred))

