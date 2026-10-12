
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.database import interventions_collection, students_collection
from app.auth_dependencies import get_current_user, require_roles

router = APIRouter(prefix="/interventions", tags=["Interventions"])

ALLOWED_STATUSES = {"pending", "in_progress", "completed"}


class InterventionCreate(BaseModel):
    student_id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(default="", max_length=2000)
    assigned_to: str = Field(min_length=1, max_length=200)
    status: str = "pending"


class InterventionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    assigned_to: str | None = Field(default=None, min_length=1, max_length=200)
    status: str | None = None


def serialize_intervention(document):
    return {
        "id": str(document["_id"]),
        "student_id": document["student_id"],
        "title": document["title"],
        "description": document["description"],
        "assigned_to": document["assigned_to"],
        "status": document["status"],
        "created_by": document["created_by"],
        "created_at": document["created_at"].isoformat(),
        "updated_at": document["updated_at"].isoformat(),
    }


def validate_status(value):
    if value not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=422,
            detail="Status must be pending, in_progress, or completed.",
        )


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_intervention(
    payload: InterventionCreate,
    current_user=Depends(require_roles("faculty", "admin")),
):
    student_id = payload.student_id.strip()
    title = payload.title.strip()
    assigned_to = payload.assigned_to.strip()

    if not title or not assigned_to:
        raise HTTPException(status_code=422, detail="Title and assignee are required.")

    validate_status(payload.status)

    if not students_collection.find_one({"student_id": student_id}):
        raise HTTPException(status_code=404, detail="Student not found.")

    now = datetime.now(timezone.utc)
    document = {
        "student_id": student_id,
        "title": title,
        "description": payload.description.strip(),
        "assigned_to": assigned_to,
        "status": payload.status,
        "created_by": current_user["id"],
        "created_at": now,
        "updated_at": now,
    }

    result = interventions_collection.insert_one(document)
    document["_id"] = result.inserted_id

    return serialize_intervention(document)


@router.get("/")
def list_interventions(
    student_id: str | None = None,
    intervention_status: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
    current_user=Depends(require_roles("faculty", "admin")),
):
    query = {}

    if student_id:
        query["student_id"] = student_id

    if intervention_status:
        validate_status(intervention_status)
        query["status"] = intervention_status

    cursor = (
        interventions_collection.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )

    total = interventions_collection.count_documents(query)

    return {
        "total": total,
        "limit": limit,
        "skip": skip,
        "interventions": [serialize_intervention(item) for item in cursor],
    }


@router.patch("/{intervention_id}")
def update_intervention(
    intervention_id: str,
    payload: InterventionUpdate,
    current_user=Depends(require_roles("faculty", "admin")),
):
    if not ObjectId.is_valid(intervention_id):
        raise HTTPException(status_code=400, detail="Invalid intervention ID.")

    updates = payload.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(status_code=422, detail="Provide at least one field to update.")

    if "status" in updates and updates["status"] is not None:
        validate_status(updates["status"])

    for field in ("title", "assigned_to", "description"):
        if field in updates and updates[field] is not None:
            updates[field] = updates[field].strip()

    if "title" in updates and not updates["title"]:
        raise HTTPException(status_code=422, detail="Title cannot be empty.")

    if "assigned_to" in updates and not updates["assigned_to"]:
        raise HTTPException(status_code=422, detail="Assignee cannot be empty.")

    updates["updated_at"] = datetime.now(timezone.utc)

    result = interventions_collection.find_one_and_update(
        {"_id": ObjectId(intervention_id)},
        {"$set": updates},
        return_document=True,
    )

    if not result:
        raise HTTPException(status_code=404, detail="Intervention not found.")

    return serialize_intervention(result)


@router.delete("/{intervention_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_intervention(
    intervention_id: str,
    current_user=Depends(require_roles("admin")),
):
    if not ObjectId.is_valid(intervention_id):
        raise HTTPException(status_code=400, detail="Invalid intervention ID.")

    result = interventions_collection.delete_one(
        {"_id": ObjectId(intervention_id)}
    )

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Intervention not found.")
