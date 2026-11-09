import logging

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

logger = logging.getLogger(__name__)

LOCAL_TENANT_SLUGS = {"localhost", "127", "127.0.0.1"}


async def resolve_tenant(request: Request, db: AsyncSession):
    """
    Resolve the organization this request acts on, and prove the caller
    belongs to it.

    The organization always comes from the signed token. The X-Tenant-Slug
    header is client-supplied, so it is only ever used to *confirm* the token's
    organization - never to choose a different one. A slug that resolves to
    another organization is rejected, which is what stops one tenant from
    reading another tenant's data by changing a header.
    """
    privilege = getattr(request.state, "privilege", None)

    token_org_id = (
        getattr(request.state, "organizationId", None)
        or getattr(request.state, "organizationID", None)
    )

    slug = getattr(request.state, "slug", None)

    if slug and slug.lower() in LOCAL_TENANT_SLUGS:
        slug = None

    slug_org_id = None

    if slug:
        if slug in organization_Id:
            slug_org_id = organization_Id[slug]
        else:
            slug_org_id = await getOrgIDfromSlug(db, slug)

            if not slug_org_id:
                raise HTTPException(
                    status_code=404,
                    detail="Organization not found"
                )

            organization_Id[slug] = slug_org_id

    # A platform operator is not a member of any organization, so the slug is
    # the only context available to them.
    if privilege == "rootUser":
        organization_id = token_org_id or slug_org_id

        if not organization_id:
            raise HTTPException(
                status_code=400,
                detail="Missing organization context. Send X-Tenant-Slug header."
            )

        request.state.organizationId = organization_id
        request.state.organizationID = organization_id

        return organization_id

    if not token_org_id:
        raise HTTPException(
            status_code=403,
            detail="Token carries no organization. Please sign in again."
        )

    if slug_org_id is not None and str(slug_org_id) != str(token_org_id):
        logger.warning(
            "Tenant mismatch rejected: user=%s token_org=%s requested_org=%s",
            getattr(request.state, "user_id", None),
            token_org_id,
            slug_org_id,
        )
        raise HTTPException(
            status_code=403,
            detail="Organization mismatch"
        )

    request.state.organizationId = token_org_id
    request.state.organizationID = token_org_id

    return token_org_id


def require_permission(permission: str):

    async def checker(
        request: Request,
        db: AsyncSession = Depends(get_db)
    ):
        privilege = getattr(request.state, "privilege", None)

        await resolve_tenant(request, db)

        if privilege in {"rootUser", "rootUserOrg"}:
            return True

        user_id = request.state.user_id

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


def require_tenant():
    """
    Dependency for routes that are organization-scoped but carry no specific
    permission string. It performs the same tenant binding as
    require_permission, without a permission check.
    """

    async def checker(
        request: Request,
        db: AsyncSession = Depends(get_db)
    ):
        await resolve_tenant(request, db)

        return True

    return checker


def require_root_user():
    """Dependency for routes only a platform operator may call."""

    async def checker(request: Request):
        if getattr(request.state, "privilege", None) != "rootUser":
            raise HTTPException(
                status_code=403,
                detail="Root operator privilege required"
            )

        return True

    return checker
