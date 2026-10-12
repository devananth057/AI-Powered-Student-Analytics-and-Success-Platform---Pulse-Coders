
from pathlib import Path
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent / "data" / "raw"

train = pd.read_csv(DATA_DIR / "train.csv", skipinitialspace=True)

# Clean column names and numeric-looking score fields
train.columns = train.columns.str.strip()

for col in [
    "math_score",
    "reading_score",
    "writing_score",
    "science_score",
    "test_preparation_course",
]:
    train[col] = pd.to_numeric(train[col], errors="coerce")

print("GRADE DISTRIBUTION")
print(train["Grade"].value_counts(dropna=False))

print("\nAVERAGE SCORES BY GRADE")
print(
    train.groupby("Grade")[
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

print("\nCORRELATION WITH TOTAL SCORE")
print(
    train[
        [
            "Midterm_Score",
            "Final_Score",
            "Assignments_Avg",
            "Quizzes_Avg",
            "Projects_Score",
            "Total_Score",
        ]
    ].corr()["Total_Score"].round(3)
)

print("\nDUPLICATE STUDENT IDS")
print("Count:", train["Student_ID"].duplicated().sum())

print("\nNUMERIC CONVERSION MISSING VALUES")
print(
    train[
        ["math_score", "reading_score", "writing_score", "science_score"]
    ].isna().sum()
)
