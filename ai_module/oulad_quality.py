
from pathlib import Path
import pandas as pd

DATA_DIR = Path("data/raw/oulad")

files = [
    "studentInfo.csv",
    "studentAssessment.csv",
    "assessments.csv",
    "studentVle.csv",
    "vle.csv",
]

for filename in files:
    path = DATA_DIR / filename
    df = pd.read_csv(path)

    print("\n" + "=" * 65)
    print(f"FILE: {filename}")
    print("=" * 65)

    print("Rows:", len(df))
    print("Columns:", len(df.columns))
    print("Missing values:", df.isnull().sum().sum())
    print("Duplicate rows:", df.duplicated().sum())

    print("\nMissing values by column:")
    missing = df.isnull().sum()
    print(missing[missing > 0].to_string()
          if (missing > 0).any() else "None")

    if "id_student" in df.columns:
        print("Unique students:", df["id_student"].nunique())

    if "final_result" in df.columns:
        print("\nFinal-result distribution:")
        print(df["final_result"].value_counts().to_string())
