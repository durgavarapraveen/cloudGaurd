from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from db.postgressDB import get_db
from models.github_installation_model import GitHubInstallation
from integration.github.github_webhook import verify_signature


router = APIRouter(prefix="/github_webhook",
    tags=["webhook"])


@router.post("/webhook")
async def receive_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    payload_bytes = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")
    event_type = request.headers.get("X-GitHub-Event", "unknown")
    if not verify_signature(payload_bytes, signature):
        raise HTTPException(401, "Invalid webhook signature")
    payload = await request.json()
    await _save_event(db, event_type, payload)
    return {"status": "received"}


async def _save_event(
    db: AsyncSession,
    event_type: str,
    payload: dict
):
    # Handle GitHub App uninstall
    if event_type == "installation":
        action = payload.get("action")
        if action == "created":
            print("GitHub App installed")
        elif action == "deleted":
            installation_id = payload["installation"]["id"]
            await db.execute(
                delete(GitHubInstallation).where(
                    GitHubInstallation.installation_id == str(installation_id)
                )
            )
            await db.commit()
            print(
                f"[INSTALLATION] Deleted installation {installation_id}"
            )

    # Handle push events
    elif event_type == "push":
        _handle_push(payload)

    # Handle PR events
    elif event_type == "pull_request":
        _handle_pull_request(payload)


def _handle_push(payload: dict):
    branch  = payload.get("ref", "").replace("refs/heads/", "")
    commits = payload.get("commits", [])
    pusher  = payload.get("pusher", {}).get("name")
    repo    = payload.get("repository", {}).get("full_name")
    print(f"[PUSH] {pusher} pushed {len(commits)} commit(s) to {repo}:{branch}")
    # → trigger your CI check, send Slack notification, etc.

def _handle_pull_request(payload: dict):
    action = payload.get("action")
    pr = payload.get("pull_request", {})

    base_branch = pr.get("base", {}).get("ref")
    number = pr.get("number")
    title = pr.get("title")
    author = pr.get("user", {}).get("login")

    if action == "opened" and base_branch == "main":
        print(
            f"[PR OPENED] #{number} {title} by {author}"
        )

    elif (
        action == "closed"
        and pr.get("merged")
        and base_branch == "main"
    ):
        print(
            f"[PR MERGED] #{number} {title} by {author}"
        )
