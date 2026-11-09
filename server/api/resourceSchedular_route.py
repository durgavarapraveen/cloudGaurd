import uuid

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid 
from db.postgressDB import get_db

from middlewares.userPermissions import require_permission

from schemas.resourceSchedular_schema import CreateNewScheduler

from services.resourceSchedular_service import (
    getAllSchedular_service,
    makeSchedularInactive_service,
    cerateSchedular_service,
    updateSchedular_service,
    getSchedularDetails_service,
    makeSchedularactive_service,
    getSchedulaStatus_service,
    deleteScheduler_service
)

router = APIRouter(
    prefix="/schedulars",
    tags=["Cloud Account Resources"],
    dependencies=[Depends(require_permission("schedular:read"))],
)

@router.get("/inactive/{schedularId}",
    dependencies=[Depends(require_permission("schedular:update"))],
)
async def getSchedularInactive(
    schedularId: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await makeSchedularInactive_service(db=db, schedularId=str(schedularId), request=request)

@router.get("/active/{schedularId}",
    dependencies=[Depends(require_permission("schedular:update"))],
)
async def getSchedularInactive(
    schedularId: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await makeSchedularactive_service(db=db, schedularId=str(schedularId), request=request)

@router.post("/create/{account_identifier}",
    dependencies=[Depends(require_permission("schedular:create"))],
)
async def getSchedularInactive(
    data: CreateNewScheduler,
    account_identifier: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await cerateSchedular_service(db=db, data=data,cloudIdentifier=account_identifier, request=request)

@router.put("/update/{schedularId}",
    dependencies=[Depends(require_permission("schedular:update"))],
)
async def getSchedularInactive(
    data: CreateNewScheduler,
    schedularId: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await updateSchedular_service(db=db, data=data,schedularId=str(schedularId), request=request)

@router.get("/schedular/{schedularId}")
async def getSchedularInactive(
    schedularId: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await getSchedularDetails_service(db=db, schedularId=str(schedularId), request=request)

@router.get("/status/{schedularId}")
async def getSchedularStatus(
    schedularId: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await getSchedulaStatus_service(db=db, schedularId=str(schedularId), request=request)

@router.get("/{account_identifier}")
async def getallSchedular(
    account_identifier: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await getAllSchedular_service(db=db, cloudIdentifier=account_identifier, request=request)

@router.delete("/delete/{schedularId}",
    dependencies=[Depends(require_permission("schedular:delete"))],
)
async def getSchedularStatus(
    schedularId: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await deleteScheduler_service(db=db, schedularId=str(schedularId), request=request)




