
from pathlib import Path
import pandas as pd

DATA_DIR = Path("data/raw/oulad")

input_file = DATA_DIR / "student_engagement_daily.csv"
output_file = DATA_DIR / "student_engagement_weekly.csv"

print("Loading daily engagement data...")
df = pd.read_csv(input_file)

# Convert days relative to course start into week numbers.
# Negative days remain in week -1.
df["week"] = df["date"].floordiv(7)

weekly = (
    df.groupby(
        [
            "code_module",
            "code_presentation",
            "id_student",
            "week",
        ],
        as_index=False,
    )
    .agg(
        weekly_clicks=("total_clicks", "sum"),
        active_days=("date", "nunique"),
        active_sites=("active_sites", "sum"),
        activity_records=("activity_records", "sum"),
    )
)

weekly.to_csv(output_file, index=False)

print("Weekly records:", len(weekly))
print("Saved:", output_file)

print("\nSample:")
print(weekly.head(10).to_string(index=False))
