"""
github_services.py
All raw GitHub API calls. Each function takes a token and returns raw JSON.
"""

import os
import time
import httpx
import jwt as pyjwt

GITHUB_API = "https://api.github.com"


# ─── App JWT (for getting installation tokens) ───────────────────────────────

def _make_app_jwt() -> str:
    """Generate a short-lived JWT signed with the GitHub App private key."""
    private_key_path = os.getenv("GITHUB_PRIVATE_KEY_PATH", "")
    with open(private_key_path, "r") as f:
        private_key = f.read().replace("\\n", "\n")
    app_id = os.getenv("GITHUB_APP_ID")

    if not private_key or not app_id:
        raise ValueError("GITHUB_PRIVATE_KEY_PATH and GITHUB_APP_ID must be set")

    now = int(time.time())
    payload = {"iat": now - 60, "exp": now + 540, "iss": app_id}
    return pyjwt.encode(payload, private_key, algorithm="RS256")


def _auth_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


# ─── Installation token ───────────────────────────────────────────────────────

async def get_installation_token(installation_id: str) -> dict:
    """Exchange App JWT for an installation access token."""
    app_jwt = _make_app_jwt()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{GITHUB_API}/app/installations/{installation_id}/access_tokens",
            headers=_auth_headers(app_jwt),
        )
    resp.raise_for_status()
    return resp.json()


# ─── Repos ───────────────────────────────────────────────────────────────────

async def get_repos(token: str, per_page: int = 100) -> list:
    """Return all repos accessible by this installation token."""
    results = []
    page = 1
    async with httpx.AsyncClient() as client:
        while True:
            resp = await client.get(
                f"{GITHUB_API}/installation/repositories",
                headers=_auth_headers(token),
                params={"per_page": per_page, "page": page},
            )
            resp.raise_for_status()
            data = resp.json()
            repos = data.get("repositories", [])
            results.extend(repos)
            if len(repos) < per_page:
                break
            page += 1
    return results


# ─── Branches ────────────────────────────────────────────────────────────────

async def get_branches(token: str, owner: str, repo: str, per_page: int = 100) -> list:
    results = []
    page = 1
    async with httpx.AsyncClient() as client:
        while True:
            resp = await client.get(
                f"{GITHUB_API}/repos/{owner}/{repo}/branches",
                headers=_auth_headers(token),
                params={"per_page": per_page, "page": page},
            )
            resp.raise_for_status()
            data = resp.json()
            results.extend(data)
            if len(data) < per_page:
                break
            page += 1
    return results


# ─── Commits ─────────────────────────────────────────────────────────────────

async def get_commits(
    token: str,
    owner: str,
    repo: str,
    per_page: int = 30,
    page: int = 1,
    branch: str = None,
) -> list:
    params = {"per_page": per_page, "page": page}
    if branch:
        params["sha"] = branch
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/commits",
            headers=_auth_headers(token),
            params=params,
        )
    resp.raise_for_status()
    return resp.json()


# ─── Pull Requests ────────────────────────────────────────────────────────────

async def get_pull_requests(
    token: str,
    owner: str,
    repo: str,
    state: str = "open",
    per_page: int = 30,
    page: int = 1,
) -> list:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/pulls",
            headers=_auth_headers(token),
            params={"state": state, "per_page": per_page, "page": page},
        )
    resp.raise_for_status()
    return resp.json()


async def get_single_pull_request(
    token: str, owner: str, repo: str, pull_number: int
) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/pulls/{pull_number}",
            headers=_auth_headers(token),
        )
    resp.raise_for_status()
    return resp.json()


# ─── Contributors ────────────────────────────────────────────────────────────

async def get_contributors(token: str, owner: str, repo: str) -> list:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/contributors",
            headers=_auth_headers(token),
            params={"per_page": 20},
        )
    resp.raise_for_status()
    return resp.json()


# ─── Languages ───────────────────────────────────────────────────────────────

async def get_languages(token: str, owner: str, repo: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/languages",
            headers=_auth_headers(token),
        )
    resp.raise_for_status()
    return resp.json()