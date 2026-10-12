
from pathlib import Path
import pandas as pd

path = Path("data/raw/train.csv")
df = pd.read_csv(path, skipinitialspace=True)
df.columns = df.columns.str.strip()

numeric_cols = [
    "Midterm_Score",
    "Final_Score",
    "Assignments_Avg",
    "Quizzes_Avg",
    "Projects_Score",
    "Total_Score",
    "math_score",
]

for col in numeric_cols:
    df[col] = pd.to_numeric(df[col], errors="coerce")

print("1. Invalid numeric values")
for col in numeric_cols:
    bad = df[df[col].isna()]
    if not bad.empty:
        print(f"\n{col}: {len(bad)} invalid rows")
        print(bad[["Student_ID", col]].to_string(index=False))

print("\n2. Average component scores by Grade")
print(
    df.groupby("Grade")[
        [
            "Midterm_Score",
            "Final_Score",
            "Assignments_Avg",
            "Quizzes_Avg",
            "Projects_Score",
            "Total_Score",
        ]
    ].mean().round(2)
)

print("\n3. Total score versus component scores")
print(
    df[numeric_cols[:-1]].corr()["Total_Score"].round(3)
)

print("\n4. Grade versus Total_Score")
print(
    df.groupby("Grade")["Total_Score"]
    .agg(["count", "min", "median", "max", "mean"])
    .round(2)
)
