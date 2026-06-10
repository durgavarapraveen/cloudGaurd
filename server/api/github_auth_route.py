import os
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from urllib.parse import quote

import jwt
from dotenv import load_dotenv
from pathlib import Path

from db.postgressDB import get_db

from models.github_installation_model import GitHubInstallation
from models.orginization_model import Organization

router = APIRouter(prefix="/github_auth", tags=["auth"])

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / "server" / ".env")
load_dotenv(ROOT_DIR / "infra" / ".env")

def get_request_organization_id(request: Request):
    return (
        getattr(request.state, "organizationId", None)
        or getattr(request.state, "organizationID", None)
    )

@router.get("/github")
async def login_with_github(request: Request):
    secret_key = os.getenv("GITHUB_SECRET_KEY", "githubsecretkey")
    app_slug = os.getenv("GITHUB_APP_SLUG", "cloudgaurd")
    organization_id = get_request_organization_id(request)

    if not organization_id:
        raise HTTPException(400, "Missing organization id")

    state = jwt.encode({"organization_id": organization_id}, secret_key, algorithm="HS256")

    # ✅ Use installation URL — gives you installation_id directly in callback
    url = f"https://github.com/apps/{app_slug}/installations/new?state={quote(state)}"
    print(url)
    return JSONResponse(content={"url": url})


@router.get("/callback")
async def github_callback(
    installation_id: str | None = None,
    setup_action: str | None = None,
    state: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    print(f"Received GitHub callback with installation_id={installation_id}, setup_action={setup_action}, state={state}")
    # Validate incoming parameters
    if not state:
        # Missing state — cannot verify organization context
        print("GitHub callback missing 'state' parameter")
        raise HTTPException(400, "Missing state parameter")

    try:
        payload = jwt.decode(
            state,
            os.getenv("GITHUB_SECRET_KEY", "githubsecretkey"),
            algorithms=["HS256"],
        )
    except Exception as e:
        # JWT decode failed — log and return a 400 to avoid 500 stacktraces
        print(f"Failed to decode GitHub callback state: {e}")
        raise HTTPException(400, "Invalid state parameter")

    organization_id = payload.get("organization_id")
    if not organization_id:
        print("Decoded state missing 'organization_id'")
        raise HTTPException(400, "Invalid state payload")

    # Upsert installation (installation_id may be None if GitHub called unexpectedly)
    if not installation_id:
        print("GitHub callback missing 'installation_id' parameter")
        raise HTTPException(400, "Missing installation_id parameter")

    result = await db.execute(
        select(GitHubInstallation).where(
            GitHubInstallation.organization_id == organization_id
        )
    )
    installation = result.scalar_one_or_none()

    if installation:
        installation.installation_id = installation_id
    else:
        installation = GitHubInstallation(
            installation_id=installation_id,
            organization_id=organization_id
        )
        db.add(installation)

    # Get org slug
    result = await db.execute(
        select(Organization).where(Organization.id == organization_id)
    )
    organization = result.scalar_one_or_none()
    if not organization:
        raise HTTPException(404, "Organization not found")

    slug = getattr(organization, "slug", None)
    organization.github_installation_id = installation_id
    await db.commit()
    if slug:
        url = f"http://{slug}.localhost:3000/organization/github?connected=true"
    else:
        url = "http://localhost:3000/organization/github?connected=true"

    print(f"GitHub callback completed for organization_id={organization_id}, redirecting to {url}")
    return RedirectResponse(url)
