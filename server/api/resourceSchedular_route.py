from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid 
from db.postgressDB import get_db

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
    tags=["Cloud Account Resources"]
)

@router.get("/inactive/{schedularId}")
async def getSchedularInactive(
    schedularId: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await makeSchedularInactive_service(db=db, schedularId=schedularId, request=request)

@router.get("/active/{schedularId}")
async def getSchedularInactive(
    schedularId: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await makeSchedularactive_service(db=db, schedularId=schedularId, request=request)

@router.post("/create/{account_identifier}")
async def getSchedularInactive(
    data: CreateNewScheduler,
    account_identifier: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await cerateSchedular_service(db=db, data=data,cloudIdentifier=account_identifier, request=request)

@router.put("/update/{schedularId}")
async def getSchedularInactive(
    data: CreateNewScheduler,
    schedularId: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await updateSchedular_service(db=db, data=data,schedularId=schedularId, request=request)

@router.get("/schedular/{schedularId}")
async def getSchedularInactive(
    schedularId: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await getSchedularDetails_service(db=db, schedularId=schedularId, request=request)

@router.get("/status/{schedularId}")
async def getSchedularStatus(
    schedularId: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await getSchedulaStatus_service(db=db, schedularId=schedularId, request=request)

@router.get("/{account_identifier}")
async def getallSchedular(
    account_identifier: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await getAllSchedular_service(db=db, cloudIdentifier=account_identifier, request=request)

@router.delete("/delete/{schedularId}")
async def getSchedularStatus(
    schedularId: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await deleteScheduler_service(db=db, schedularId=schedularId, request=request)




