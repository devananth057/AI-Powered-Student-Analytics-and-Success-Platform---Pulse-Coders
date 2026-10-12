
from pathlib import Path
import pandas as pd

path = Path("data/raw/oulad/studentVle.csv")

df = pd.read_csv(path)

print("Total rows:", len(df))

# Check exact duplicate records
exact_duplicates = df.duplicated().sum()
print("Exact duplicate rows:", exact_duplicates)

# Check repeated student-site-date combinations
keys = [
    "code_module",
    "code_presentation",
    "id_student",
    "id_site",
    "date",
]

repeated_keys = df.duplicated(subset=keys).sum()
print("Repeated student-site-date rows:", repeated_keys)

# Check whether repeated rows have different click counts
groups = df.groupby(keys)["sum_click"].nunique()
conflicting_groups = (groups > 1).sum()

print("Repeated key groups with different click counts:",
      conflicting_groups)

print("\nExample exact duplicate rows:")
print(df[df.duplicated(keep=False)].head(10).to_string(index=False))
