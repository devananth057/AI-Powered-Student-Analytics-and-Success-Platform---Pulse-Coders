
from predict_student import predict_student

sample_student = {
    "early_assessment_count": 1,
    "early_average_score": 45,
    "early_lowest_score": 45,
    "early_latest_submission_day": 25,
    "early_total_clicks": 120,
    "early_active_days": 6,
    "early_active_sites": 18,
}

result = predict_student(sample_student)
print(result)
