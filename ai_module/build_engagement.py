
from pathlib import Path
import pandas as pd

DATA_DIR = Path("data/raw/oulad")

input_file = DATA_DIR / "studentVle.csv"
output_file = DATA_DIR / "student_engagement_daily.csv"

print("Loading studentVle.csv...")
df = pd.read_csv(input_file)

print("Original rows:", len(df))

# Remove only rows identical across every column.
df = df.drop_duplicates()

print("Rows after exact-duplicate removal:", len(df))

# Aggregate clicks across learning sites for each student and day.
daily = (
    df.groupby(
        [
            "code_module",
            "code_presentation",
            "id_student",
            "date",
        ],
        as_index=False,
    )
    .agg(
        total_clicks=("sum_click", "sum"),
        active_sites=("id_site", "nunique"),
        activity_records=("id_site", "size"),
    )
)

daily.to_csv(output_file, index=False)

print("Daily summary rows:", len(daily))
print("Saved:", output_file)

print("\nSample:")
print(daily.head(10).to_string(index=False))
