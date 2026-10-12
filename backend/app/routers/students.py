from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from pymongo.errors import DuplicateKeyError

from app.auth_dependencies import get_current_user, require_roles
from app.database import students_collection

router = APIRouter(prefix="/students", tags=["Students"])


class StudentCreate(BaseModel):
    student_id: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr | None = None
    department: str | None = Field(default=None, max_length=100)
    attendance_percentage: float | None = Field(
        default=None, ge=0, le=100
    )


class StudentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    department: str | None = Field(default=None, max_length=100)


def serialize_student(student):
    student["id"] = str(student.pop("_id"))
    return student


def ensure_student_access(student, current_user):
    role = current_user.get("role")

    if role in ("admin", "faculty"):
        return

    if role == "student" and current_user.get("student_id") == student.get("student_id"):
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to access this student record.",
    )


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_student(
    student: StudentCreate,
    current_user=Depends(require_roles("admin", "faculty")),
):
    document = student.model_dump()

    try:
        result = students_collection.insert_one(document)
    except DuplicateKeyError as exc:
       print("MongoDB duplicate-key error:", exc)
       raise HTTPException(
        status_code=409,
        detail="A student with this ID or email already exists."
    )

    created = students_collection.find_one({"_id": result.inserted_id})
    return serialize_student(created)


@router.get("/")
def list_students(
    current_user=Depends(require_roles("admin", "faculty")),
):
    students = students_collection.find().sort("student_id", 1)
    return [serialize_student(student) for student in students]


@router.get("/{student_id}")
def get_student(
    student_id: str,
    current_user=Depends(get_current_user),
):
    student = students_collection.find_one({"student_id": student_id})

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found.",
        )

    ensure_student_access(student, current_user)
    return serialize_student(student)


@router.put("/{student_id}")
def update_student(
    student_id: str,
    updates: StudentUpdate,
    current_user=Depends(require_roles("admin", "faculty")),
):
    changes = updates.model_dump(exclude_unset=True)

    if not changes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one field to update.",
        )

    try:
        result = students_collection.update_one(
            {"student_id": student_id},
            {"$set": changes},
        )
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The updated email is already in use.",
        )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found.",
        )

    updated = students_collection.find_one({"student_id": student_id})
    return serialize_student(updated)


@router.delete("/{student_id}")
def delete_student(
    student_id: str,
    current_user=Depends(require_roles("admin")),
):
    result = students_collection.delete_one({"student_id": student_id})

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found.",
        )

    return {"message": "Student deleted successfully."}
