
from pathlib import Path
import pandas as pd

DATA_DIR = Path("data/raw/oulad")
CUTOFF_DAY = 28

print("Loading OULAD files...")

students = pd.read_csv(DATA_DIR / "studentInfo.csv")
submissions = pd.read_csv(DATA_DIR / "studentAssessment.csv")
assessments = pd.read_csv(DATA_DIR / "assessments.csv")
engagement = pd.read_csv(DATA_DIR / "student_engagement_daily.csv")

keys = ["code_module", "code_presentation", "id_student"]

# Target: eventual outcome, not a predictor.
students["risk_target"] = students["final_result"].map({
    "Fail": 1,
    "Withdrawn": 1,
    "Pass": 0,
    "Distinction": 0,
})

students = students.dropna(subset=["risk_target"]).copy()
students["risk_target"] = students["risk_target"].astype(int)

print("Building assessment features available by day", CUTOFF_DAY)

# Attach assessment metadata.
submissions = submissions.merge(
    assessments,
    on="id_assessment",
    how="left",
    validate="many_to_one",
)

# Keep assessments due by the cutoff and submitted by the cutoff.
early_submissions = submissions[
    submissions["date"].notna()
    & submissions["date_submitted"].notna()
    & (submissions["date"] <= CUTOFF_DAY)
    & (submissions["date_submitted"] <= CUTOFF_DAY)
].copy()

assessment_features = (
    early_submissions.groupby(keys)
    .agg(
        early_assessment_count=("score", "count"),
        early_average_score=("score", "mean"),
        early_lowest_score=("score", "min"),
        early_latest_submission_day=("date_submitted", "max"),
    )
    .reset_index()
)

# Use only learning activity recorded by the cutoff.
early_engagement = engagement[
    engagement["date"] <= CUTOFF_DAY
].copy()

engagement_features = (
    early_engagement.groupby(keys)
    .agg(
        early_total_clicks=("total_clicks", "sum"),
        early_active_days=("date", "nunique"),
        early_active_sites=("active_sites", "sum"),
    )
    .reset_index()
)

# Start with one row per student-course presentation.
dataset = students[
    keys + ["final_result", "risk_target"]
].copy()

dataset = dataset.merge(
    assessment_features,
    on=keys,
    how="left",
    validate="one_to_one",
)

dataset = dataset.merge(
    engagement_features,
    on=keys,
    how="left",
    validate="one_to_one",
)

# No observed activity or assessment by the cutoff.
# Keep missing assessment scores missing; do not treat them as zero.
count_columns = [
    "early_assessment_count",
    "early_total_clicks",
    "early_active_days",
    "early_active_sites",
]

dataset[count_columns] = dataset[count_columns].fillna(0)

output_file = DATA_DIR / "early_warning_dataset.csv"
dataset.to_csv(output_file, index=False)

print("\nDataset created successfully.")
print("Rows:", len(dataset))
print("Columns:", len(dataset.columns))
print("Saved to:", output_file)

print("\nTarget distribution (1 = Fail/Withdrawn):")
print(dataset["risk_target"].value_counts().sort_index())

print("\nFeature missing values:")
print(dataset.isnull().sum().to_string())

print("\nSample records:")
print(dataset.head(10).to_string(index=False))
