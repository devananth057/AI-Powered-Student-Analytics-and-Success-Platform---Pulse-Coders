
from pathlib import Path
import pandas as pd

path = Path("data/raw/train.csv")
df = pd.read_csv(path, skipinitialspace=True)
df.columns = df.columns.str.strip()

score_cols = [
    "Attendance (%)",
    "Midterm_Score",
    "Final_Score",
    "Assignments_Avg",
    "Quizzes_Avg",
    "Projects_Score",
    "Total_Score",
]

for col in score_cols:
    df[col] = pd.to_numeric(df[col], errors="coerce")

print("GRADE COUNTS")
print(df["Grade"].value_counts())

print("\nGRADE VS TOTAL SCORE")
print(
    df.groupby("Grade")["Total_Score"]
    .agg(["min", "max", "mean"])
    .round(2)
)

print("\nSAMPLE STUDENTS WITH LOW AND HIGH SCORES")
print(
    df.sort_values("Total_Score")[
        ["Student_ID", "Grade", "Total_Score", "Attendance (%)"]
    ].head(10).to_string(index=False)
)

print("\nGRADE COUNTS WITH TOTAL SCORE BANDS")
df["score_band"] = pd.cut(
    df["Total_Score"],
    bins=[0, 50, 60, 70, 80, 90, 100],
    include_lowest=True
)

print(pd.crosstab(df["score_band"], df["Grade"]))
