
from pathlib import Path
import pandas as pd

DATA_DIR = Path("data/raw/oulad")

students = pd.read_csv(DATA_DIR / "studentInfo.csv")
scores = pd.read_csv(DATA_DIR / "studentAssessment.csv")
assessments = pd.read_csv(DATA_DIR / "assessments.csv")

print("Student-course records:", len(students))
print("Assessment submissions:", len(scores))
print("Assessment definitions:", len(assessments))

print("\nFinal-result counts:")
print(students["final_result"].value_counts())

print("\nAssessment types:")
print(assessments["assessment_type"].value_counts())

print("\nScore summary:")
print(scores["score"].describe())

print("\nMissing assessment scores:", scores["score"].isna().sum())

# Join assessment metadata to submitted assessment records.
merged = scores.merge(
    assessments,
    on="id_assessment",
    how="left",
    validate="many_to_one"
)

print("\nAssessment types and score summaries:")
print(
    merged.groupby("assessment_type")["score"]
    .agg(["count", "mean", "median"])
)

print("\nSubmission date summary:")
print(scores["date_submitted"].describe())
