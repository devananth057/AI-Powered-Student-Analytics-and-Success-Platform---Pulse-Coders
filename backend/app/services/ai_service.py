
import os

import httpx
from fastapi import HTTPException

AI_API_URL = os.getenv(
    "AI_API_URL",
    "http://127.0.0.1:8000",
)


async def call_ai_endpoint(endpoint: str, payload: dict):
    url = f"{AI_API_URL.rstrip('/')}/{endpoint.lstrip('/')}"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload)

        if response.status_code >= 400:
            raise HTTPException(
                status_code=502,
                detail={
                    "message": "AI service returned an error",
                    "status_code": response.status_code,
                    "response": response.text[:1000],
                },
            )

        return response.json()

    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail="AI service is unavailable. Check whether port 8000 is running.",
        ) from exc
