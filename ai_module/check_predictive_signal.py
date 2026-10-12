
from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    classification_report,
)

# Dataset paths
base = Path(__file__).resolve().parent / "data" / "raw"

train = pd.read_csv(base / "train.csv", skipinitialspace=True)
test = pd.read_csv(base / "test.csv", skipinitialspace=True)

train.columns = train.columns.str.strip()
test.columns = test.columns.str.strip()

# Features available for this diagnostic
numeric = [
    "Age",
    "Attendance (%)",
    "Midterm_Score",
    "Final_Score",
    "Assignments_Avg",
    "Quizzes_Avg",
    "Participation_Score",
    "Projects_Score",
    "test_preparation_course",
    "math_score",
    "reading_score",
    "writing_score",
    "science_score",
]

categorical = ["Gender", "Department"]

# Convert numeric columns safely
for df in (train, test):
    for col in numeric:
        df[col] = pd.to_numeric(df[col], errors="coerce")

# Separate inputs and target
X_train = train[numeric + categorical]
y_train = train["Grade"]

X_test = test[numeric + categorical]
y_test = test["Grade"]

# Preprocessing
preprocess = ColumnTransformer([
    ("num", Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scale", StandardScaler()),
    ]), numeric),

    ("cat", Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encode", OneHotEncoder(handle_unknown="ignore")),
    ]), categorical),
])

# Model
model = Pipeline([
    ("preprocess", preprocess),
    ("classifier", RandomForestClassifier(
        n_estimators=200,
        random_state=42,
        class_weight="balanced",
    )),
])

# IMPORTANT: train first, then predict
print("Training model...")
model.fit(X_train, y_train)

print("Generating test predictions...")
pred = model.predict(X_test)

# Evaluation
accuracy = accuracy_score(y_test, pred)
macro_f1 = f1_score(y_test, pred, average="macro")
baseline = float(y_test.value_counts(normalize=True).max())

print("\n===== MODEL EVALUATION =====")
print(f"Test accuracy: {accuracy:.4f}")
print(f"Macro F1: {macro_f1:.4f}")

print("\nClassification report:")
print(classification_report(y_test, pred, zero_division=0))

print(f"Majority-class baseline accuracy: {baseline:.4f}")
