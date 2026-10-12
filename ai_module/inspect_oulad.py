
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

    print("\n" + "=" * 60)
    print(f"FILE: {filename}")
    print("=" * 60)

    if not path.exists():
        print(f"NOT FOUND: {path.resolve()}")
        continue

    df = pd.read_csv(path, nrows=5)

    print("Columns:", df.columns.tolist())
    print("Sample rows:")
    print(df.to_string(index=False))
