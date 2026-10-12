
from pathlib import Path
import pandas as pd
from sklearn.feature_selection import mutual_info_classif
from sklearn.preprocessing import LabelEncoder

path = Path("data/raw/train.csv")
df = pd.read_csv(path, skipinitialspace=True)
df.columns = df.columns.str.strip()

features = [
    "Attendance (%)",
    "Midterm_Score",
    "Final_Score",
    "Assignments_Avg",
    "Quizzes_Avg",
    "Participation_Score",
    "Projects_Score",
    "Total_Score",
    "math_score",
    "reading_score",
    "writing_score",
    "science_score",
]

for col in features:
    df[col] = pd.to_numeric(df[col], errors="coerce")

# Exclude rows with invalid values only for this diagnostic.
data = df[features + ["Grade"]].dropna().copy()

X = data[features]
y = LabelEncoder().fit_transform(data["Grade"])

mi = mutual_info_classif(X, y, random_state=42)

results = pd.DataFrame({
    "feature": features,
    "mutual_information": mi
}).sort_values("mutual_information", ascending=False)

print("Rows evaluated:", len(data))
print("\nFeature relationship with Grade:")
print(results.to_string(index=False))

print("\nMean score by Grade:")
print(data.groupby("Grade")[features].mean().round(2).to_string())
