import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from db.postgressDB import get_db

from middlewares.userPermissions import require_root_user

from schemas.organization_schema import CreateNewOrganization

from services.organization_service import createNewOrganizationService, updateOrganization, getOrganization, deleteOrganization, inactiveOrganization, getAllOrginizationsService

# Organizations are tenants. Only a platform operator may list, create, change
# or remove them, so every route here requires the root privilege.
router = APIRouter(
    prefix="/organization",
    tags=["Root User"],
    dependencies=[Depends(require_root_user())],
)


@router.post("/create")
async def create_new_organization(
    data: CreateNewOrganization,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await createNewOrganizationService(db, data, request)


@router.put("/update/{id}")
async def update_organization(
    id: uuid.UUID,
    data: CreateNewOrganization,
    db: AsyncSession = Depends(get_db)
):
    return await updateOrganization(db, data, id=str(id))


@router.put("/deactivate/{id}")
async def deactivate_organization(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    return await inactiveOrganization(db, id=str(id))


@router.put("/delete/{id}")
async def delete_organization(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    return await deleteOrganization(db, id=str(id))


@router.get("/{id}")
async def get_organization(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    return await getOrganization(db, id=str(id))


@router.get("/")
async def get_all_Organizations(
    db: AsyncSession = Depends(get_db)
):
    return await getAllOrginizationsService(db)
