from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
import jwt
from dotenv import load_dotenv
import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / "server" / ".env")
load_dotenv(ROOT_DIR / "infra" / ".env")

SECRET = os.getenv("JWT_SECRET_KEY", "")    

EXCLUDED_ROUTES = [
    "/root_user/register",
    "/root_user/login",
    "/root_user/refresh-token",
    "/auth/register",
    "/auth/login",
    "/auth/refresh-token",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/github_auth/callback",
    "/github_webhook/webhook",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/docs/oauth2-redirect",
    "/"
]

EXCLUDED_ROUTE_PREFIXES = [
    "/root_user/login/",
]

LOCAL_TENANT_SLUGS = {"localhost", "127", "127.0.0.1"}

def is_excluded_route(path: str) -> bool:
    normalized_path = path.rstrip("/") or "/"
    return normalized_path in EXCLUDED_ROUTES or any(
        path.startswith(prefix)
        for prefix in EXCLUDED_ROUTE_PREFIXES
    )

def normalize_tenant_slug(slug: str | None) -> str | None:
    if not slug:
        return None

    normalized_slug = slug.strip().lower()
    if not normalized_slug or normalized_slug in LOCAL_TENANT_SLUGS:
        return None

    return normalized_slug

class AuthMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request: Request, call_next):
        
        if request.url.path == "/webhooks/aws-events":
         return await call_next(request)

        path = request.url.path
        if is_excluded_route(path):
            return await call_next(request)
        
        # IMPORTANT
        if request.method == "OPTIONS":
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        slug = normalize_tenant_slug(request.headers.get("X-Tenant-Slug"))
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
            
            print(payload.get("type"))

            if payload.get("type") != "access":
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Please Login Again"}
                )
            
            request.state.slug = slug
                
            request.state.privilege = payload["privilege"]

            request.state.user_id = payload["sub"]
            request.state.organizationId = payload.get("organization")
            request.state.organizationID = payload.get("organization")

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
