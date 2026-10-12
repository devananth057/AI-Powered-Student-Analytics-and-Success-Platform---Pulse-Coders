
from pathlib import Path
import pandas as pd

path = Path("data/raw/oulad/early_warning_dataset.csv")
df = pd.read_csv(path)

print("Rows:", len(df))
print("Duplicate student-course records:",
      df.duplicated(
          subset=["code_module", "code_presentation", "id_student"]
      ).sum())

print("\nTarget counts:")
print(df["risk_target"].value_counts())

print("\nTarget proportions:")
print(df["risk_target"].value_counts(normalize=True).round(3))

print("\nEarly assessment availability by target:")
print(
    df.groupby("risk_target")["early_assessment_count"]
    .agg(["count", "mean", "min", "max"])
)

print("\nEarly engagement by target:")
print(
    df.groupby("risk_target")[
        ["early_total_clicks", "early_active_days"]
    ].mean().round(2)
)

print("\nCheck target consistency:")
expected = df["final_result"].isin(["Fail", "Withdrawn"]).astype(int)
print("Mismatched target rows:", (expected != df["risk_target"]).sum())

print("\nPrediction input columns must exclude:")
print("final_result, risk_target, id_student")
