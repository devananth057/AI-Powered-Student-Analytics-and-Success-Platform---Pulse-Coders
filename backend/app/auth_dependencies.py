from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError

from app.database import db
from app.services.auth_service import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login"
)

users_collection = db["users"]


def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired access token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")

        if not user_id or not ObjectId.is_valid(user_id):
            raise credentials_error

    except JWTError:
        raise credentials_error

    user = users_collection.find_one({"_id": ObjectId(user_id)})

    if not user:
        raise credentials_error

    user["id"] = str(user.pop("_id"))
    user.pop("password_hash", None)

    return user


def require_roles(*allowed_roles: str):
    def role_checker(current_user=Depends(get_current_user)):
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource.",
            )
        return current_user

    return role_checker
