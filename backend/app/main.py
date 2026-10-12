
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.routers.students import router as students_router
from app.routers.predictions import router as predictions_router
from app.routers.auth import router as auth_router
from app.auth_dependencies import get_current_user
from app.routers.interventions import router as interventions_router
app = FastAPI(
    title="EduPulse AI Backend",
    description="Backend API for student success analytics, academic risk, placement prediction, and student segmentation.",
    version="1.0.0",
)

# Allow local frontend development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
       "https://frontend-devananth057.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(students_router, prefix="/api")
app.include_router(predictions_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(interventions_router, prefix="/api")

@app.get("/")
def root():
    return {
        "message": "EduPulse AI Backend is running",
        "status": "success",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "EduPulse AI Backend",
    }
    
@app.get("/api/auth/me")
def get_my_profile(
    current_user=Depends(get_current_user),
):
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "role": current_user["role"],
    }
