

import jwt
import time
import httpx
from urllib.parse import quote

import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / "server" / ".env")
load_dotenv(ROOT_DIR / "infra" / ".env")

def generate_github_jwt():
    payload = {
        "iat": int(time.time()),
        "exp": int(time.time()) + 600,
        "iss": APP_ID,
    }
    with open("keys/github-private-key.pem") as f:
        private_key = f.read()
    token = jwt.encode(
        payload,
        private_key,
        algorithm="RS256"
    )
    return token 

async def github_install_link_service(organization_id: str):
    secret_key = os.getenv("GITHUB_SECRET_KEY")
    state = jwt.encode({"organization_id": organization_id}, secret_key, algorithm="HS256")
    return f"https://github.com/apps/cloudguard/installations/new?state={quote(state)}"

async def call_back_service(installation_id: int, state: str):
    secret_key = os.getenv("GITHUB_SECRET_KEY")
    decoded_state = jwt.decode(state, secret_key, algorithms=["HS256"])
    organization_id = decoded_state["organization_id"]

    # Save the installation ID and organization ID in the database
    await save_installation(
        organization_id=organization_id,
        installation_id=installation_id
    )
    


async def save_installation(organization_id: str, installation_id: int):
    # Implement the logic to save the installation ID and organization ID in the database
    pass


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

