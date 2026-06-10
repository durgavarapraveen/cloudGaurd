from fastapi import Depends, HTTPException, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from repository.user_repository import get_current_user
from db.postgressDB import get_db
from models.userModel import User


async def require_sse_eligible(
    request: Request,
    x_tenant_slug: str = Header(...),
    db: AsyncSession = Depends(get_db)
) -> User:
    current_user = await get_current_user(
        request=request,
        db=db
    )

    has_org = current_user.organization is not None

    has_github = current_user.organization.github_installation_id is not None
    
    if not has_org and not has_github:
        raise HTTPException(
            status_code=403,
            detail="User is not eligible for SSE connection"
        )
    
    return current_user
