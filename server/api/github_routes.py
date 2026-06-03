from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.postgressDB import get_db
from integration.github import github_services as gh_service
from models.github_installation_model import GitHubInstallation

router = APIRouter(prefix="/github", tags=["github"])


def get_request_organization_id(request: Request):
    return (
        getattr(request.state, "organizationId", None)
        or getattr(request.state, "organizationID", None)
    )


async def _get_token(organization_id: str, db: AsyncSession) -> str:
    if not organization_id:
        raise HTTPException(400, "Missing organization id")

    result = await db.execute(
        select(GitHubInstallation).where(
            GitHubInstallation.organization_id == organization_id
        )
    )
    installation = result.scalar_one_or_none()
    if not installation:
        raise HTTPException(404, "GitHub App not installed")

    token_data = await gh_service.get_installation_token(installation.installation_id)
    return token_data["token"]


# ─── Repos ────────────────────────────────────────────────────────────────────

@router.get("/repos")
async def list_repos(request: Request, db: AsyncSession = Depends(get_db)):
    """Return all repos accessible by the installation."""
    organization_id = get_request_organization_id(request)
    token = await _get_token(organization_id, db)
    repos = await gh_service.get_repos(token)
    return [
        {
            "id":                r["id"],
            "name":              r["name"],
            "full_name":         r["full_name"],
            "description":       r["description"],
            "private":           r["private"],
            "language":          r["language"],
            "updated_at":        r["updated_at"],
            "html_url":          r["html_url"],
            "stargazers_count":  r.get("stargazers_count", 0),
            "forks_count":       r.get("forks_count", 0),
        }
        for r in repos
    ]


# ─── Repo Stats (summary for overview cards) ─────────────────────────────────

@router.get("/repos/{owner}/{repo}/stats")
async def repo_stats(
    owner: str,
    repo: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Return aggregated counts: branches, open PRs, merged PRs, commits."""
    organization_id = get_request_organization_id(request)
    token = await _get_token(organization_id, db)

    # Run all counts in parallel
    import asyncio
    branches, open_prs, closed_prs, commits = await asyncio.gather(
        gh_service.get_branches(token, owner, repo),
        gh_service.get_pull_requests(token, owner, repo, state="open"),
        gh_service.get_pull_requests(token, owner, repo, state="closed"),
        gh_service.get_commits(token, owner, repo),
        return_exceptions=True,
    )

    def safe_len(result):
        if isinstance(result, Exception):
            return 0
        return len(result)

    merged_count = 0
    if not isinstance(closed_prs, Exception):
        merged_count = sum(1 for pr in closed_prs if pr.get("merged_at"))

    return {
        "branches_count":      safe_len(branches),
        "pulls_count":         safe_len(open_prs),
        "merged_pulls_count":  merged_count,
        "commits_count":       safe_len(commits),
    }


# ─── Branches ────────────────────────────────────────────────────────────────

@router.get("/repos/{owner}/{repo}/branches")
async def list_branches(
    owner: str,
    repo: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Return all branches for a repo."""
    organization_id = get_request_organization_id(request)
    token = await _get_token(organization_id, db)
    branches = await gh_service.get_branches(token, owner, repo)
    return [
        {
            "name":      b["name"],
            "commit":    b["commit"],
            "protected": b.get("protected", False),
        }
        for b in branches
    ]


# ─── Commits ─────────────────────────────────────────────────────────────────

@router.get("/repos/{owner}/{repo}/commits")
async def list_commits(
    owner: str,
    repo: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    per_page: int = 30,
    page: int = 1,
    branch: str = None,
):
    """Return commits with optional branch filter and pagination."""
    organization_id = get_request_organization_id(request)
    token = await _get_token(organization_id, db)
    commits = await gh_service.get_commits(
        token, owner, repo,
        per_page=per_page,
        page=page,
        branch=branch,
    )
    return [
        {
            "sha":     c["sha"][:7],
            "full_sha": c["sha"],
            "message": c["commit"]["message"].split("\n")[0],
            "author":  c["commit"]["author"]["name"],
            "email":   c["commit"]["author"].get("email", ""),
            "date":    c["commit"]["author"]["date"],
            "url":     c["html_url"],
        }
        for c in commits
    ]


# ─── Pull Requests ────────────────────────────────────────────────────────────

@router.get("/repos/{owner}/{repo}/pulls")
async def list_pull_requests(
    owner: str,
    repo: str,
    request: Request,
    state: str = "open",
    per_page: int = 30,
    page: int = 1,
    db: AsyncSession = Depends(get_db),
):
    """Return open or closed PRs. state = 'open' | 'closed' | 'all'"""
    organization_id = get_request_organization_id(request)
    token = await _get_token(organization_id, db)
    prs = await gh_service.get_pull_requests(
        token, owner, repo, state,
        per_page=per_page,
        page=page,
    )
    return [
        {
            "number":     pr["number"],
            "title":      pr["title"],
            "state":      pr["state"],
            "author":     pr["user"]["login"],
            "created_at": pr["created_at"],
            "updated_at": pr["updated_at"],
            "merged_at":  pr.get("merged_at"),
            "url":        pr["html_url"],
            "draft":      pr.get("draft", False),
            "labels":     [l["name"] for l in pr.get("labels", [])],
            "base_branch": pr["base"]["ref"],
            "head_branch": pr["head"]["ref"],
        }
        for pr in prs
    ]


# ─── Single PR detail ────────────────────────────────────────────────────────

@router.get("/repos/{owner}/{repo}/pulls/{pull_number}")
async def get_pull_request(
    owner: str,
    repo: str,
    pull_number: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Return detail for a single PR including review status."""
    organization_id = get_request_organization_id(request)
    token = await _get_token(organization_id, db)
    pr = await gh_service.get_single_pull_request(token, owner, repo, pull_number)
    return {
        "number":        pr["number"],
        "title":         pr["title"],
        "body":          pr.get("body", ""),
        "state":         pr["state"],
        "author":        pr["user"]["login"],
        "created_at":    pr["created_at"],
        "updated_at":    pr["updated_at"],
        "merged_at":     pr.get("merged_at"),
        "merged_by":     pr["merged_by"]["login"] if pr.get("merged_by") else None,
        "url":           pr["html_url"],
        "draft":         pr.get("draft", False),
        "commits":       pr.get("commits", 0),
        "additions":     pr.get("additions", 0),
        "deletions":     pr.get("deletions", 0),
        "changed_files": pr.get("changed_files", 0),
        "labels":        [l["name"] for l in pr.get("labels", [])],
        "base_branch":   pr["base"]["ref"],
        "head_branch":   pr["head"]["ref"],
    }


# ─── Repo Contributors ────────────────────────────────────────────────────────

@router.get("/repos/{owner}/{repo}/contributors")
async def list_contributors(
    owner: str,
    repo: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Return top contributors for a repo."""
    organization_id = get_request_organization_id(request)
    token = await _get_token(organization_id, db)
    contributors = await gh_service.get_contributors(token, owner, repo)
    return [
        {
            "login":         c["login"],
            "contributions": c["contributions"],
            "avatar_url":    c.get("avatar_url", ""),
            "html_url":      c.get("html_url", ""),
        }
        for c in contributors[:20]
    ]


# ─── Repo Languages ───────────────────────────────────────────────────────────

@router.get("/repos/{owner}/{repo}/languages")
async def get_languages(
    owner: str,
    repo: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Return language breakdown (bytes per language)."""
    organization_id = get_request_organization_id(request)
    token = await _get_token(organization_id, db)
    languages = await gh_service.get_languages(token, owner, repo)
    total = sum(languages.values()) or 1
    return {
        lang: {"bytes": count, "percentage": round(count / total * 100, 1)}
        for lang, count in sorted(languages.items(), key=lambda x: -x[1])
    }