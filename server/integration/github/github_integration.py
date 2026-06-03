

import jwt
import time
import httpx
from urllib.parse import quote

import os
from dotenv import load_dotenv
from pathlib import Path

from models.github_installation_model import GitHubInstallation
from db.postgressDB import AsyncSessionLocal

ROOT_DIR = Path(__file__).resolve().parents[3]
load_dotenv(ROOT_DIR / "server" / ".env")
load_dotenv(ROOT_DIR / "infra" / ".env")

def generate_github_jwt():
    app_id = os.getenv("GITHUB_APP_ID")
    if not app_id:
        raise ValueError("GITHUB_APP_ID is not configured")

    payload = {
        "iat": int(time.time()) - 60,
        "exp": int(time.time()) + 600,
        "iss": app_id,
    }

    private_key = os.getenv("GITHUB_PRIVATE_KEY")
    if private_key:
        private_key = private_key.replace("\\n", "\n")
    else:
        key_path = os.getenv("GITHUB_PRIVATE_KEY_PATH")
        path = Path(key_path) if key_path else ROOT_DIR / "keys" / "github-private-key.pem"
        if key_path and not path.is_absolute():
            path = ROOT_DIR / path
        if not path.exists():
            raise FileNotFoundError(
                "GitHub private key not found. Set GITHUB_PRIVATE_KEY or "
                "GITHUB_PRIVATE_KEY_PATH."
            )
        private_key = path.read_text()

    token = jwt.encode(
        payload,
        private_key,
        algorithm="RS256"
    )
    return token 

async def github_install_link_service(organization_id: str):
    secret_key = os.getenv("GITHUB_SECRET_KEY")
    app_slug = os.getenv("GITHUB_APP_SLUG")
    if not secret_key:
        raise ValueError("GITHUB_SECRET_KEY is not configured")
    if not app_slug:
        raise ValueError("GITHUB_APP_SLUG is not configured")

    state = jwt.encode({"organization_id": organization_id}, secret_key, algorithm="HS256")
    return f"https://github.com/apps/{app_slug}/installations/new?state={quote(state)}"

async def call_back_service(installation_id: int, state: str, code: str | None = None):
    secret_key = os.getenv("GITHUB_SECRET_KEY")
    if not secret_key:
        raise ValueError("GITHUB_SECRET_KEY is not configured")

    decoded_state = jwt.decode(state, secret_key, algorithms=["HS256"])
    organization_id = decoded_state["organization_id"]

    # Save the installation ID and organization ID in the database
    await save_installation(
        organization_id=organization_id,
        installation_id=installation_id
    )
    
async def save_installation(organization_id: str, installation_id: int):
    
    async with AsyncSessionLocal() as session:
        github_installation = GitHubInstallation(
            organization_id=organization_id,
            installation_id=installation_id
        )
        session.add(github_installation)
        await session.commit()
        
async def exchange_code_for_token(code: str) -> str:
    client_id = os.getenv("GITHUB_CLIENT_ID") or os.getenv("GITHUB_APP_CLIENT_ID")
    client_secret = (
        os.getenv("GITHUB_CLIENT_SECRET")
        or os.getenv("GITHUB_APP_CLIENT_SECRET")
    )
    if not client_id:
        raise ValueError("GITHUB_CLIENT_ID or GITHUB_APP_CLIENT_ID is not configured")
    if not client_secret:
        raise ValueError(
            "GITHUB_CLIENT_SECRET or GITHUB_APP_CLIENT_SECRET is not configured"
        )

    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            json={
                "client_id":     client_id,
                "client_secret": client_secret,
                "code":          code,
            }
        )
        r.raise_for_status()
        data = r.json()
        if "error" in data:
            raise ValueError(data.get("error_description", "OAuth failed"))
        return data["access_token"]
    
def _headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept":        "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


async def get_installation_token(
    installation_id: int
):
    jwt_token = generate_github_jwt()

    async with httpx.AsyncClient() as client:

        response = await client.post(
            f"https://api.github.com/app/installations/{installation_id}/access_tokens",
            headers={
                "Authorization": f"Bearer {jwt_token}",
                "Accept": "application/vnd.github+json"
            }
        )

    return response.json()

async def get_repositories(token: str):

    async with httpx.AsyncClient() as client:

        response = await client.get(
            "https://api.github.com/installation/repositories",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json"
            }
        )

    return response.json()

