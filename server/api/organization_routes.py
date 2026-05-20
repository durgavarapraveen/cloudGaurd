from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from db.postgressDB import get_db


from schemas.organization_schema import CreateNewOrganization

from services.organization_service import createNewOrganizationService, updateOrganization, getOrganization, deleteOrganization, inactiveOrganization, getAllOrginizationsService

router = APIRouter(
    prefix="/organization",
    tags=["Root User"]
)
@router.post("/create")
async def create_new_organization(
    data: CreateNewOrganization,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await createNewOrganizationService(db, data, request);

@router.put("/update/{id}")
async def update_organization(
    data: CreateNewOrganization,
    db: AsyncSession = Depends(get_db)
):
    return await updateOrganization(db, data, id=id)

@router.put("/deactivate/{id}")
async def deactivate_organization(
    db: AsyncSession = Depends(get_db)
):
    return await inactiveOrganization(db, id=id)

@router.put("/delete/{id}")
async def delete_organization(
    db: AsyncSession = Depends(get_db)
):
    return await deleteOrganization(db, id=id)

@router.get("/{id}")
async def get_organization(
    db: AsyncSession = Depends(get_db)
):
    return await getOrganization(db, id=id)

@router.get("/")
async def get_all_Organizations(
    db: AsyncSession = Depends(get_db)
):
    return await getAllOrginizationsService(db)