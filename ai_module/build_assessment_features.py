
from pathlib import Path
import pandas as pd

DATA_DIR = Path("data/raw/oulad")

students = pd.read_csv(DATA_DIR / "studentInfo.csv")
scores = pd.read_csv(DATA_DIR / "studentAssessment.csv")
assessments = pd.read_csv(DATA_DIR / "assessments.csv")

# Attach assessment type, date and weighting to each submission.
submissions = scores.merge(
    assessments,
    on="id_assessment",
    how="left",
    validate="many_to_one",
)

# Aggregate assessment information by student and course.
keys = ["code_module", "code_presentation", "id_student"]

features = (
    submissions.groupby(keys)
    .agg(
        assessment_count=("score", "count"),
        average_score=("score", "mean"),
        lowest_score=("score", "min"),
        highest_score=("score", "max"),
        average_submission_day=("date_submitted", "mean"),
        latest_submission_day=("date_submitted", "max"),
    )
    .reset_index()
)

# Attach final outcomes for later exploratory analysis only.
result = students.merge(
    features,
    on=keys,
    how="left",
    validate="one_to_one",
)

output_file = DATA_DIR / "student_assessment_features.csv"
result.to_csv(output_file, index=False)

print("Student-course rows:", len(result))
print("Rows with assessment data:", result["assessment_count"].notna().sum())
print("Saved:", output_file)

print("\nSample features:")
print(result[keys + [
    "assessment_count",
    "average_score",
    "latest_submission_day",
    "final_result",
]].head(10).to_string(index=False))

print("\nFinal-result assessment averages:")
print(
    result.groupby("final_result")["average_score"]
    .mean()
    .round(2)
)
