
from fastapi import APIRouter, HTTPException, status, Depends, Request
from pymongo.errors import DuplicateKeyError
from app.auth_dependencies import require_roles
from app.auth_schemas import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    LinkStudentRequest,
)
from app.database import db, students_collection
from app.services.auth_service import (
    create_access_token,
    hash_password,
    verify_password,
)


router = APIRouter(prefix="/auth", tags=["Authentication"])

users_collection = db["users"]
users_collection.create_index("email", unique=True)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(data: RegisterRequest):
    user = {
        "name": data.name.strip(),
        "email": str(data.email).lower(),
        "password_hash": hash_password(data.password),
        "role": data.role,
    }

    if not user["name"]:
        raise HTTPException(
            status_code=422,
            detail="Name cannot be empty.",
        )

    try:
        result = users_collection.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    return UserResponse(
        id=str(result.inserted_id),
        name=user["name"],
        email=user["email"],
        role=user["role"],
    )



from typing import Annotated
from fastapi import Request
from fastapi.responses import JSONResponse


@router.post("/login", response_model=TokenResponse)
async def login_user(request: Request):
    content_type = request.headers.get("content-type", "").lower()

    if "application/json" in content_type:
        try:
            body = await request.json()
            data = LoginRequest(**body)
            email = str(data.email).lower()
            password = data.password
        except Exception:
            raise HTTPException(
                status_code=422,
                detail="Invalid login request body.",
            )

    elif (
        "application/x-www-form-urlencoded" in content_type
        or "multipart/form-data" in content_type
    ):
        form = await request.form()
        email = str(form.get("username", "")).lower()
        password = str(form.get("password", ""))

    else:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported content type: {content_type}",
        )

    user = users_collection.find_one({"email": email})

    if not user or not verify_password(
        password,
        user["password_hash"],
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(
        subject=str(user["_id"]),
        role=user["role"],
    )

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=str(user["_id"]),
            name=user["name"],
            email=user["email"],
            role=user["role"],
        ),
    )




@router.post("/link-student")
def link_student_account(
    data: LinkStudentRequest,
    current_user=Depends(require_roles("admin", "faculty")),
):
    student = students_collection.find_one({
        "student_id": data.student_id
    })

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student record not found.",
        )

    if not student.get("email"):
        raise HTTPException(
            status_code=400,
            detail="Student record has no email address.",
        )

    if student["email"].lower() != str(data.email).lower():
        raise HTTPException(
            status_code=400,
            detail="Email does not match the student record.",
        )

    student_user = users_collection.find_one({
        "email": str(data.email).lower(),
        "role": "student",
    })

    if not student_user:
        raise HTTPException(
            status_code=404,
            detail="No student account exists for this email. Register the student account first.",
        )

    existing_link = users_collection.find_one({
        "student_id": data.student_id,
        "_id": {"$ne": student_user["_id"]},
    })

    if existing_link:
        raise HTTPException(
            status_code=409,
            detail="This student record is already linked to another account.",
        )

    users_collection.update_one(
        {"_id": student_user["_id"]},
        {"$set": {"student_id": data.student_id}},
    )

    return {
        "message": "Student account linked successfully.",
        "student_id": data.student_id,
        "email": student_user["email"],
    }

