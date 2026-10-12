
from typing import Optional,Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from predict_student import predict_student
from success_score import calculate_success_score
from placement_risk import calculate_placement_risk
from student_segmentation import classify_student


app = FastAPI(
    title="EduPulse AI API",
    description=(
        "Student analytics prototype using academic assessment, "
        "learning-platform engagement, and optional placement indicators."
    ),
    version="1.2.0",
)


# ---------- Shared feature definitions ----------

ACADEMIC_FIELDS = (
    "early_assessment_count",
    "early_average_score",
    "early_lowest_score",
    "early_latest_submission_day",
    "early_total_clicks",
    "early_active_days",
    "early_active_sites",
)

# The four fields required by the current academic prediction endpoint.

ACADEMIC_REQUIRED_FIELDS = ACADEMIC_FIELDS


PLACEMENT_FIELDS = (
    "CGPA",
    "Internships",
    "Projects",
    "Workshops/Certifications",
    "AptitudeTestScore",
    "SoftSkillsRating",
    "ExtracurricularActivities",
    "PlacementTraining",
    "SSC_Marks",
    "HSC_Marks",
)


# ---------- Request models ----------


class StudentFeatures(BaseModel):
    early_assessment_count: int = Field(ge=0)
    early_average_score: float = Field(ge=0, le=100)
    early_lowest_score: float = Field(ge=0, le=100)
    early_latest_submission_day: float = Field(ge=0, le=28)
    early_total_clicks: float = Field(ge=0)
    early_active_days: int = Field(ge=0)
    early_active_sites: int = Field(ge=0)



class SuccessScoreRequest(BaseModel):
    early_assessment_count: Optional[float] = Field(
        default=None, ge=0
    )
    early_average_score: Optional[float] = Field(
        default=None, ge=0, le=100
    )
    early_lowest_score: Optional[float] = Field(
        default=None, ge=0, le=100
    )
    early_latest_submission_day: Optional[float] = Field(
        default=None, ge=0
    )
    early_total_clicks: Optional[float] = Field(
        default=None, ge=0
    )
    early_active_days: Optional[float] = Field(
        default=None, ge=0
    )
    early_active_sites: Optional[float] = Field(
        default=None, ge=0
    )


class PlacementRiskRequest(BaseModel):
    CGPA: float = Field(ge=0, le=10)
    Internships: int = Field(ge=0)
    Projects: int = Field(ge=0)
    workshops_certifications: int = Field(
        ge=0, alias="Workshops/Certifications"
    )
    AptitudeTestScore: float = Field(ge=0, le=100)
    SoftSkillsRating: float = Field(ge=0, le=5)
    ExtracurricularActivities: Literal["Yes", "No"]
    PlacementTraining: Literal["Yes", "No"]
    SSC_Marks: float = Field(ge=0, le=100)
    HSC_Marks: float = Field(ge=0, le=100)


class StudentSegmentationRequest(StudentFeatures):
    pass


class StudentAnalyticsRequest(SuccessScoreRequest):
    CGPA: Optional[float] = Field(default=None, ge=0, le=10)
    Internships: Optional[int] = Field(default=None, ge=0)
    Projects: Optional[int] = Field(default=None, ge=0)

    workshops_certifications: Optional[int] = Field(
        default=None,
        ge=0,
        alias="Workshops/Certifications",
    )

    AptitudeTestScore: Optional[float] = Field(
        default=None, ge=0, le=100
    )
    SoftSkillsRating: Optional[float] = Field(
        default=None, ge=0, le=5
    )
    ExtracurricularActivities: Optional[Literal["Yes", "No"]] = None
    PlacementTraining: Optional[Literal["Yes", "No"]] = None
    SSC_Marks: Optional[float] = Field(
        default=None, ge=0, le=100
    )
    HSC_Marks: Optional[float] = Field(
        default=None, ge=0, le=100
    )
    student_id: Optional[str] = None


# ---------- Basic endpoints ----------

@app.get("/")
def home():
    return {
        "message": "EduPulse AI API is running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


# ---------- Academic early-warning prediction ----------

@app.post("/predict")
def predict(features: StudentFeatures):
    try:
        return predict_student(features.model_dump())
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Academic prediction failed: {exc}",
        ) from exc


# ---------- Success Score ----------

@app.post("/success-score")
def get_success_score(data: SuccessScoreRequest):
    try:
        return calculate_success_score(data.model_dump())
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Unable to calculate Success Score: {exc}",
        ) from exc


# ---------- Placement prediction ----------

@app.post("/placement-risk")
def get_placement_risk(data: PlacementRiskRequest):
    try:
        placement_data = data.model_dump(by_alias=True)
        return calculate_placement_risk(placement_data)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Placement prediction failed: {exc}",
        ) from exc


# ---------- Student segmentation ----------

@app.post("/student-segmentation")
def get_student_segmentation(data: StudentSegmentationRequest):
    try:
        return classify_student(data.model_dump())
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Student segmentation failed: {exc}",
        ) from exc


# ---------- Unified student analytics ----------

@app.post("/student-analytics")
def get_student_analytics(data: StudentAnalyticsRequest):
    # Keep API aliases consistent with the placement model's feature names.
    student = data.model_dump(by_alias=True)
    student_id = student.pop("student_id", None)

    # 1. Calculate Success Score from academic and LMS indicators only.
    success_input = {
        field: student.get(field)
        for field in ACADEMIC_FIELDS
    }

    try:
        success = calculate_success_score(success_input)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Unable to calculate Success Score: {exc}",
        ) from exc

    # 2. Run the academic-risk model when its required inputs are present.
    academic_inputs_available = all(
        student.get(field) is not None
        for field in ACADEMIC_REQUIRED_FIELDS
    )

    if academic_inputs_available:
        academic_data = {
            field: student.get(field)
            for field in ACADEMIC_FIELDS
        }

        try:
            academic_prediction = predict_student(academic_data)
            academic_status = "assessed"
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Academic prediction failed: {exc}",
            ) from exc
    else:
        academic_prediction = None
        academic_status = "not_assessed_missing_inputs"

    # 3. Run the trained placement model only when all ten inputs exist.
    placement_inputs_available = all(
        student.get(field) is not None
        for field in PLACEMENT_FIELDS
    )

    if placement_inputs_available:
        placement_data = {
            field: student[field]
            for field in PLACEMENT_FIELDS
        }

        try:
            placement = calculate_placement_risk(placement_data)
            placement_status = "assessed"
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Placement assessment failed: {exc}",
            ) from exc
    else:
        placement = None
        placement_status = "not_assessed_missing_inputs"

    
    # 4. Run K-Means segmentation using the seven academic features.
    segmentation_data = data.model_dump()

    segmentation_fields = (
        "early_assessment_count",
        "early_average_score",
        "early_lowest_score",
        "early_latest_submission_day",
        "early_total_clicks",
        "early_active_days",
        "early_active_sites",
    )

    segmentation_inputs_available = all(
        segmentation_data.get(field) is not None
        for field in segmentation_fields
    )

    if segmentation_inputs_available:
        try:
            segmentation = classify_student(
                {
                    field: segmentation_data[field]
                    for field in segmentation_fields
                }
            )
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Student segmentation failed: {exc}",
            ) from exc
    else:
        segmentation = {
            "status": "not_assessed_missing_inputs",
            "method": "K-Means clustering",
            "missing_features": [
                field
                for field in segmentation_fields
                if segmentation_data.get(field) is None
            ],
        }


    # 5. Report which of the tracked indicators were actually supplied.
    all_indicators = ACADEMIC_FIELDS + PLACEMENT_FIELDS

    supplied_indicators = [
        field
        for field in all_indicators
        if student.get(field) is not None
    ]

    missing_indicators = [
        field
        for field in all_indicators
        if student.get(field) is None
    ]

    coverage_percent = round(
        len(supplied_indicators) / len(all_indicators) * 100,
        2,
    )

    # 6. Return the unified analytics response.
    return {
        "student_id": student_id,
        "status": (
            "partial"
            if missing_indicators
            else "available_inputs_provided"
        ),
        "success_score": success,
        "academic_early_warning": {
            "status": academic_status,
            "result": academic_prediction,
        },
        "placement_assessment": {
            "status": placement_status,
            "result": placement,
        },
        "student_segmentation": segmentation,
        "data_quality": {
            "supplied_indicators": supplied_indicators,
            "missing_indicators": missing_indicators,
            "supplied_indicator_count": len(supplied_indicators),
            "total_tracked_indicators": len(all_indicators),
            "coverage_percent": coverage_percent,
            "not_yet_integrated_categories": [
                "attendance",
                "skills assessments beyond the supplied placement indicators",
                "student feedback",
                "verified placement outcomes",
            ],
        },
        "interpretation": {
            "success_score": (
    "Model-estimated probability of Pass or Distinction "
    "based on early OULAD learning indicators. It is not "
    "a guarantee or a validated overall student-success score."
),
            "academic_early_warning": (
                "Estimates historical OULAD Fail/Withdrawn outcomes. "
                "It is not a certainty or a verified support requirement."
            ),
            "placement_assessment": (
                "Uses a trained AutoGluon placement classifier. Predictions "
                "are based on its training dataset and require validation "
                "on representative institutional data."
            ),
            "student_segmentation": (
    "Uses a trained K-Means clustering pipeline on seven early-learning "
    "features. Clusters are exploratory profiles, not validated predictions "
    "of student success."
),
        },
    }
