
from placement_risk import calculate_placement_risk

student = {
    "aptitude_score": 75,
    "coding_score": 35,
    "mock_interview_score": 45,
    "technical_skills_score": 60
}

result = calculate_placement_risk(student)

print("EDUPULSE AI - PLACEMENT RISK")
print("----------------------------")

for key, value in result.items():
    print(f"{key}: {value}")
