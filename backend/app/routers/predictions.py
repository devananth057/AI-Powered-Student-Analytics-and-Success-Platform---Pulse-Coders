
from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)
from pymongo import DESCENDING
from pydantic import BaseModel, Field, ConfigDict
from typing import Literal

from app.auth_dependencies import get_current_user
from app.database import predictions_collection, students_collection
from app.services.ai_service import call_ai_endpoint

router = APIRouter(prefix="/predictions", tags=["AI Predictions"])


class StudentFeatures(BaseModel):
    model_config = ConfigDict(extra="forbid")

    early_assessment_count: int = Field(ge=0)
    early_average_score: float = Field(ge=0, le=100)
    early_lowest_score: float = Field(ge=0, le=100)
    early_latest_submission_day: float = Field(ge=0, le=28)
    early_total_clicks: float = Field(ge=0)
    early_active_days: int = Field(ge=0)
    early_active_sites: int = Field(ge=0)


class PlacementRiskRequest(BaseModel):
    CGPA: float = Field(ge=0, le=10)
    Internships: int = Field(ge=0)
    Projects: int = Field(ge=0)
    Workshops_Certifications: int = Field(
        ge=0, alias="Workshops/Certifications"
    )
    AptitudeTestScore: float = Field(ge=0, le=100)
    SoftSkillsRating: float = Field(ge=0, le=5)
    ExtracurricularActivities: Literal["Yes", "No"]
    PlacementTraining: Literal["Yes", "No"]
    SSC_Marks: float = Field(ge=0, le=100)
    HSC_Marks: float = Field(ge=0, le=100)

    model_config = ConfigDict(populate_by_name=True)


class StudentAnalyticsRequest(BaseModel):
    student_id: str | None = Field(default=None, min_length=1, max_length=50)

    early_assessment_count: float | None = Field(default=None, ge=0)
    early_average_score: float | None = Field(default=None, ge=0, le=100)
    early_lowest_score: float | None = Field(default=None, ge=0, le=100)
    early_latest_submission_day: float | None = Field(default=None, ge=0, le=28)
    early_total_clicks: float | None = Field(default=None, ge=0)
    early_active_days: float | None = Field(default=None, ge=0)
    early_active_sites: float | None = Field(default=None, ge=0)

    CGPA: float | None = Field(default=None, ge=0, le=10)
    Internships: int | None = Field(default=None, ge=0)
    Projects: int | None = Field(default=None, ge=0)
    Workshops_Certifications: int | None = Field(
        default=None, ge=0, alias="Workshops/Certifications"
    )
    AptitudeTestScore: float | None = Field(default=None, ge=0, le=100)
    SoftSkillsRating: float | None = Field(default=None, ge=0, le=5)
    ExtracurricularActivities: Literal["Yes", "No"] | None = None
    PlacementTraining: Literal["Yes", "No"] | None = None
    SSC_Marks: float | None = Field(default=None, ge=0, le=100)
    HSC_Marks: float | None = Field(default=None, ge=0, le=100)

    model_config = ConfigDict(populate_by_name=True)


def authorize_student_access(student_id: str | None, current_user: dict):
    role = current_user.get("role")

    if role in ("admin", "faculty"):
        if student_id is not None:
            student = students_collection.find_one({"student_id": student_id})
            if not student:
                raise HTTPException(
                    status_code=404,
                    detail="Student record not found.",
                )
        return

    if role != "student":
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to make predictions.",
        )

    linked_id = current_user.get("student_id")

    if not linked_id:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a student record.",
        )

    if student_id is not None and student_id != linked_id:
        raise HTTPException(
            status_code=403,
            detail="You can only request predictions for your own student record.",
        )

    student = students_collection.find_one({"student_id": linked_id})
    if not student:
        raise HTTPException(
            status_code=404,
            detail="Your linked student record was not found.",
        )


def save_prediction(
    prediction_type: str,
    payload: dict,
    result: dict,
    current_user: dict,
    student_id: str | None = None,
):
    predictions_collection.insert_one({
        "prediction_type": prediction_type,
        "student_id": student_id,
        "user_id": current_user["id"],
        "user_role": current_user["role"],
        "input": payload,
        "result": result,
        "created_at": datetime.now(timezone.utc),
    })
@router.get("/history")
def prediction_history(
    student_id: str | None = Query(
        default=None,
        min_length=1,
        max_length=50,
    ),
    prediction_type: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    role = current_user.get("role")
    filters = {}

    # Students can access only their linked student ID.
    if role == "student":
        linked_id = current_user.get("student_id")

        if not linked_id:
            raise HTTPException(
                status_code=403,
                detail="Your account is not linked to a student record.",
            )

        if student_id is not None and student_id != linked_id:
            raise HTTPException(
                status_code=403,
                detail="You can only view your own prediction history.",
            )

        student = students_collection.find_one(
            {"student_id": linked_id}
        )

        if not student:
            raise HTTPException(
                status_code=404,
                detail="Your linked student record was not found.",
            )

        filters["student_id"] = linked_id

    # Faculty and admins can view history, optionally filtered by student.
    elif role in ("faculty", "admin"):
        if student_id is not None:
            student = students_collection.find_one(
                {"student_id": student_id}
            )

            if not student:
                raise HTTPException(
                    status_code=404,
                    detail="Student record not found.",
                )

            filters["student_id"] = student_id

    else:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view prediction history.",
        )

    if prediction_type is not None:
        allowed_types = {
            "academic-risk",
            "success-score",
            "placement-risk",
            "student-segmentation",
            "student-analytics",
        }

        if prediction_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Invalid prediction type.",
            )

        filters["prediction_type"] = prediction_type

    total = predictions_collection.count_documents(filters)

    records = predictions_collection.find(
        filters
    ).sort(
        [
            ("created_at", DESCENDING),
            ("_id", DESCENDING),
        ]
    ).skip(skip).limit(limit)

    history = []

    for record in records:
        history.append({
            "id": str(record["_id"]),
            "prediction_type": record.get("prediction_type"),
            "student_id": record.get("student_id"),
            "user_id": record.get("user_id"),
            "input": record.get("input", {}),
            "result": record.get("result", {}),
            "created_at": record.get("created_at"),
        })

    return {
        "total": total,
        "limit": limit,
        "skip": skip,
        "history": history,
    }


@router.post("/placement-risk")
async def placement_risk(
    features: PlacementRiskRequest,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ("admin", "faculty"):
        raise HTTPException(
            status_code=403,
            detail="Placement predictions require faculty or admin access.",
        )

    payload = features.model_dump(by_alias=True)
    result = await call_ai_endpoint("/placement-risk", payload)

    save_prediction(
        "placement-risk", payload, result, current_user
    )
    return result



@router.post("/student-analytics")
async def student_analytics(
    features: StudentAnalyticsRequest,
    current_user: dict = Depends(get_current_user),
):
    payload = features.model_dump(by_alias=True, exclude_unset=True)
    student_id = payload.pop("student_id", None)

    authorize_student_access(student_id, current_user)

    if current_user.get("role") == "student":
        student_id = current_user["student_id"]

    result = await call_ai_endpoint("/student-analytics", payload)

    # Add student ID before saving the prediction
    result["student_id"] = student_id

    save_prediction(
        "student-analytics", payload, result, current_user, student_id
    )

    return result


@router.post("/success-score")
async def success_score(
    features: StudentFeatures,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ("admin", "faculty"):
        raise HTTPException(
            status_code=403,
            detail="This prediction endpoint requires faculty or admin access.",
        )

    payload = features.model_dump()
    result = await call_ai_endpoint("/success-score", payload)
    save_prediction("success-score", payload, result, current_user)
    return result


@router.post("/academic-risk")
async def academic_risk(
    features: StudentFeatures,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ("admin", "faculty"):
        raise HTTPException(
            status_code=403,
            detail="This prediction endpoint requires faculty or admin access.",
        )

    payload = features.model_dump()
    result = await call_ai_endpoint("/predict", payload)
    save_prediction("academic-risk", payload, result, current_user)
    return result


@router.post("/student-segmentation")
async def student_segmentation(
    features: StudentFeatures,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ("admin", "faculty"):
        raise HTTPException(
            status_code=403,
            detail="This prediction endpoint requires faculty or admin access.",
        )

    payload = features.model_dump()
    result = await call_ai_endpoint("/student-segmentation", payload)
    save_prediction(
        "student-segmentation", payload, result, current_user
    )
    return result
