
from pathlib import Path

import pandas as pd
from autogluon.tabular import TabularPredictor

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data/raw/oulad/early_warning_dataset.csv"
MODEL_PATH = BASE_DIR / "outputs/automl_comparison/final_predictor"

FEATURES = [
    "early_assessment_count",
    "early_average_score",
    "early_lowest_score",
    "early_latest_submission_day",
    "early_total_clicks",
    "early_active_days",
    "early_active_sites",
]

TARGET = "risk_target"

predictor = TabularPredictor.load(str(MODEL_PATH))
df = pd.read_csv(DATA_PATH)

sample = df[FEATURES + [TARGET]].dropna(subset=[TARGET])
sample = sample.sample(
    n=min(1000, len(sample)),
    random_state=42
)

importance = predictor.feature_importance(
    data=sample,
    
    features=FEATURES,
    subsample_size=min(1000, len(sample)),
    num_shuffle_sets=3,
)

print("\nPermutation feature importance:")
print(importance.to_string())

output_path = BASE_DIR / "outputs" / "feature_importance.csv"
output_path.parent.mkdir(parents=True, exist_ok=True)
importance.to_csv(output_path)

print(f"\nSaved to: {output_path}")
