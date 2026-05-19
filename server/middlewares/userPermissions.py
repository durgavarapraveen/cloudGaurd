from fastapi import (
    Request,
    HTTPException,
    Depends
)
from sqlalchemy.ext.asyncio import AsyncSession
from services.auth_service import (get_user_permissions)
from db.postgressDB import get_db
from cache.user_permissions_cache import permissions_cache


def require_permission(permission: str):
    async def checker(
        request: Request,
        db: AsyncSession = Depends(get_db)
    ):
        user_id = request.state.user_id  
        permissions = []
        if user_id in permissions_cache:
            permissions = permissions_cache[user_id]
        if permission not in permissions:
            permissions = await get_user_permissions(
                db,
                user_id
            )
        if permission not in permissions:
            raise HTTPException(
                status_code=403,
                detail="Permission denied"
            )
        return True
    return checker