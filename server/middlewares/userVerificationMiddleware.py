from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
import jwt
from dotenv import load_dotenv
import os
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

SECRET = os.getenv("JWT_SECRET_KEY", "")    

EXCLUDED_ROUTES = [
    "/auth/register",
    "/auth/login",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/docs/oauth2-redirect",
    "/"
]

class AuthMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request: Request, call_next):

        if request.url.path in EXCLUDED_ROUTES:
            return await call_next(request)
        
        # IMPORTANT
        if request.method == "OPTIONS":
            return await call_next(request)

        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing token"}
            )

        try:
            token = auth_header.split(" ")[1]

            payload = jwt.decode(
                token,
                SECRET,
                algorithms=["HS256"]
            )

            request.state.user_id = payload["sub"]

            request.state.permissions = payload.get(
                "permissions",
                []
            )

        except Exception:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid token"}
            )

        return await call_next(request)
