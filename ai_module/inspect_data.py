
from pathlib import Path
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent / "data" / "raw"

for filename in ["train.csv", "test.csv", "student_data.csv"]:
    path = DATA_DIR / filename

    print(f"\n{'=' * 50}")
    print(f"File: {filename}")
    print(f"{'=' * 50}")

    if not path.exists():
        print("FILE NOT FOUND:", path)
        continue

    df = pd.read_csv(path, skipinitialspace=True)
    df.columns = df.columns.str.strip()

    print("Shape:", df.shape)
    print("Columns:", df.columns.tolist())
    print("\nMissing values:")
    print(df.isnull().sum().to_string())
    print("\nFirst 3 rows:")
    print(df.head(3).to_string(index=False))

    print("\nData types:")
    print(df.dtypes.to_string())
