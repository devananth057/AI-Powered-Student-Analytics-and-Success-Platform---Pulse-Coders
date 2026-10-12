
from success_score import calculate_success_score

sample = {
    "early_assessment_count": 2,
    "early_average_score": 72,
    "early_lowest_score": 64,
    "early_latest_submission_day": 24,
    "early_total_clicks": 400,
    "early_active_days": 21,
    "early_active_sites": 146,
}

result = calculate_success_score(sample)
print(result)
