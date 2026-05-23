from fastapi import (
    Request,
    HTTPException,
    Depends
)
from sqlalchemy.ext.asyncio import AsyncSession
from services.auth_service import (get_user_permissions)
from db.postgressDB import get_db
from cache.user_permissions_cache import permissions_cache
from cache.cache import organization_Id

from repository.organization_repository import getOrgIDfromSlug

def require_permission(permission: str):

    async def checker(
        request: Request,
        db: AsyncSession = Depends(get_db)
    ):

        slug = getattr(request.state, "slug", None)

        orgId = (
            getattr(request.state, "organizationId", None)
            or getattr(request.state, "organizationID", None)
        )
        
        privilege = request.state.privilege
        print(privilege)
        if privilege == "rootUser":
            return True

        if slug and slug not in {"localhost", "127", "127.0.0.1"}:
            if slug in organization_Id:
                orgId = organization_Id[slug]
            else:
                orgId = await getOrgIDfromSlug(
                    db,
                    slug
                )

                if not orgId:
                    raise HTTPException(
                        status_code=404,
                        detail="Organization not found"
                    )

                organization_Id[slug] = orgId

        if not orgId:
            raise HTTPException(
                status_code=400,
                detail="Missing organization context. Send X-Tenant-Slug header."
            )

        request.state.organizationId = orgId
        request.state.organizationID = orgId
        
        print(f"User Privilege: {privilege}")

        if privilege == "rootUser" or privilege == "rootUserOrg":
            return True

        user_id = request.state.user_id

        permissions = []

        if user_id in permissions_cache:
            permissions = permissions_cache[user_id]

        else:

            permissions = await get_user_permissions(
                db,
                user_id
            )

            permissions_cache[user_id] = permissions

        if permission not in permissions:

            raise HTTPException(
                status_code=403,
                detail="Permission denied"
            )

        return True

    return checker
