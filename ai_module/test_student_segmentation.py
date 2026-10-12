
from student_segmentation import classify_student

student = {
    "academic_score": 82,
    "academic_risk": "Low",
    "placement_readiness_score": 42
}

result = classify_student(student)

print("EDUPULSE AI - STUDENT SEGMENT")
print("-----------------------------")

for key, value in result.items():
    print(f"{key}: {value}")
