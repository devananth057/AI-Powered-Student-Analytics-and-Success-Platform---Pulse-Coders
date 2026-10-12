
from pathlib import Path

import pandas as pd
import shap
from autogluon.tabular import TabularPredictor

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "outputs" / "automl_comparison" / "final_predictor"
DATA_PATH = BASE_DIR / "data" / "raw" / "oulad" / "early_warning_dataset.csv"

FEATURES = [
    "early_assessment_count",
    "early_average_score",
    "early_lowest_score",
    "early_latest_submission_day",
    "early_total_clicks",
    "early_active_days",
    "early_active_sites",
]

predictor = TabularPredictor.load(str(MODEL_PATH))
df = pd.read_csv(DATA_PATH)

# Use actual records with all seven input features available.
sample = (
    df[FEATURES]
    .dropna()
    .sample(n=min(100, len(df[FEATURES].dropna())), random_state=42)
)

# Explain the model's probability output.
# This can be computationally expensive for a stacked AutoGluon ensemble.
def predict_risk_probability(values):
    frame = pd.DataFrame(values, columns=FEATURES)
    probabilities = predictor.predict_proba(frame)
    return probabilities[1].to_numpy()

background = sample.sample(n=min(20, len(sample)), random_state=7)

explainer = shap.KernelExplainer(
    predict_risk_probability,
    background,
)

to_explain = sample.head(min(5, len(sample)))

shap_values = explainer.shap_values(
    to_explain,
    nsamples=100,
)

print("Baseline probability:", explainer.expected_value)
print("\nRows explained:", len(to_explain))
print("SHAP output shape:", getattr(shap_values, "shape", None))
print("\nExplained input records:")
print(to_explain.to_string(index=False))

print("\nSHAP values:")
print(shap_values)
