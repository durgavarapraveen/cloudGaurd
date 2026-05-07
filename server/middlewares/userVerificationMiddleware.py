from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
import jwt
from dotenv import load_dotenv
import os

load_dotenv()

SECRET = os.getenv("JWT_SECRET_KEY", "")    

class AuthMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request: Request, call_next):

        public_routes = [
            "/",
            "/login"
        ]

        if request.url.path in public_routes:
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