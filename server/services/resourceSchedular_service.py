
from fastapi import HTTPException, Request
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from repository.resourceSchedular_repository import (
    getcloudAccountwithAccountIdentifier
)

from models.resourceSchedular_model import ResourceSchedular

from schemas.resourceSchedular_schema import CreateNewScheduler

from schedulars.schedular import scheduler
from schedulars.resourceSchedular_job import run_scheduler_job
from apscheduler.triggers.interval import IntervalTrigger
from datetime import timezone, datetime, timedelta

def get_request_organization_id(request: Request):
    return (
        getattr(request.state, "organizationId", None)
        or getattr(request.state, "organizationID", None)
    )

def get_next_start_date(fetch_time):
    now = datetime.now(timezone.utc)
    start_date = datetime.combine(now.date(), fetch_time, tzinfo=timezone.utc)
    if start_date <= now:
        start_date += timedelta(days=1)
    return start_date

def get_scheduled_time_today(fetch_time):
    now = datetime.now(timezone.utc)
    return datetime.combine(now.date(), fetch_time, tzinfo=timezone.utc)

async def getAllSchedular_service(db: AsyncSession, cloudIdentifier: str, request: Request):
    organization_id = get_request_organization_id(request)
    cloudAccount = await getcloudAccountwithAccountIdentifier(db=db, account_identifier=cloudIdentifier, request=request)
    schedular = await db.execute(
        select(ResourceSchedular)
        .where(ResourceSchedular.cloud_account_id == cloudAccount.id, ResourceSchedular.organization_id == organization_id)
    )
    schedular = schedular.scalars().all()
    return schedular

async def makeSchedularInactive_service(db: AsyncSession, schedularId: str,request: Request):
    organization_id = get_request_organization_id(request)
    schedular = await db.execute(
        select(ResourceSchedular)
        .where(ResourceSchedular.id == schedularId, ResourceSchedular.organization_id == organization_id)
    )
    schedular = schedular.scalar_one_or_none()
    if not schedular:
        raise HTTPException(status_code=404, detail="No Schedular Found")
    schedular.is_active = False
    await db.commit()
    
    if scheduler.get_job(str(schedularId)):
        scheduler.remove_job(str(schedularId))
    
    return {
        "message": "Schedular kept to inactive"
    }
    
async def cerateSchedular_service(db: AsyncSession, data: CreateNewScheduler,cloudIdentifier: str, request: Request):
    organization_id = get_request_organization_id(request)
    cloudAccount = await getcloudAccountwithAccountIdentifier(db=db, account_identifier=cloudIdentifier, request=request)
    print(data)
    schedular = ResourceSchedular(
        name=data.name,
        fetch_time=data.fetch_time,
        frequency=data.frequency,
        stop_date=data.stop_date,
        cloud_account_id=cloudAccount.id,
        organization_id=organization_id
    )
    
    db.add(schedular)
    await db.commit()
    await db.refresh(schedular)
    
    scheduler.add_job(
        run_scheduler_job,
        trigger=IntervalTrigger(
            hours=schedular.frequency,
            start_date=get_next_start_date(schedular.fetch_time),
            end_date=schedular.stop_date,
            timezone=timezone.utc,
        ),
        id=str(schedular.id),
        args=[str(schedular.id)],
        replace_existing=True,
    )

    return schedular

async def updateSchedular_service(db: AsyncSession, data: CreateNewScheduler, schedularId: str, request: Request):
    organization_id = get_request_organization_id(request)
    schedular = await db.execute(
        select(ResourceSchedular)
        .where(ResourceSchedular.id == schedularId, ResourceSchedular.organization_id == organization_id)
    )
    schedular = schedular.scalar_one_or_none()
    if not schedular:
        raise HTTPException(status_code=404, detail="No Schedular Found")
    
    schedular.name = data.name
    schedular.frequency=data.frequency
    schedular.fetch_time=datetime.strptime(data.fetch_time, "%H:%M:%S").time()
    schedular.stop_date=datetime.strptime(data.stop_date, "%Y-%m-%d").date()
    
    await db.commit()
    
    if scheduler.get_job(str(schedularId)):
        scheduler.remove_job(str(schedularId))
    
    scheduler.add_job(
        run_scheduler_job,
        trigger=IntervalTrigger(
            hours=schedular.frequency,
            start_date=get_next_start_date(schedular.fetch_time),
            end_date=schedular.stop_date,
            timezone=timezone.utc,
        ),
        id=str(schedular.id),
        args=[str(schedular.id)],
        replace_existing=True,
    )
    
    return schedular
    
async def getSchedularDetails_service(db: AsyncSession, schedularId: str, request: Request):
    organization_id = get_request_organization_id(request)
    schedular = await db.execute(
        select(ResourceSchedular)
        .where(ResourceSchedular.id == schedularId, ResourceSchedular.organization_id == organization_id)
        .options(selectinload(ResourceSchedular.resource_summary))
    )
    schedular = schedular.scalar_one_or_none()
    if not schedular:
        raise HTTPException(status_code=404, detail="No Schedular Found")
    
    print(schedular.resource_summary)
    
    job = scheduler.get_job(str(schedularId))
    
    return {
        "id": str(schedular.id),
        "name": schedular.name,
        "fetch_time": str(schedular.fetch_time),
        "frequency": schedular.frequency,
        "stop_date": str(schedular.stop_date),
        "is_active": schedular.is_active,
        "resource_summary": schedular.resource_summary,
        # job status merged in
        "job_running": job is not None and scheduler.running,
        "next_run": str(job.next_run_time) if job else None,
        "trigger": str(job.trigger) if job else None,
        "last_scan": schedular.last_scan
    }

async def makeSchedularactive_service(db: AsyncSession, schedularId: str,request: Request):
    organization_id = get_request_organization_id(request)
    schedular = await db.execute(
        select(ResourceSchedular)
        .where(ResourceSchedular.id == schedularId, ResourceSchedular.organization_id == organization_id)
    )
    schedular = schedular.scalar_one_or_none()
    if not schedular:
        raise HTTPException(status_code=404, detail="No Schedular Found")
    schedular.is_active = True
    await db.commit()
    
    scheduler.add_job(
        run_scheduler_job,
        trigger=IntervalTrigger(
            hours=schedular.frequency,
            start_date=get_next_start_date(schedular.fetch_time),
            end_date=schedular.stop_date,
            timezone=timezone.utc,
        ),
        id=str(schedular.id),
        args=[str(schedular.id)],
        replace_existing=True,
    )
    return {
        "message": "Schedular kept to Active"
    }
    
async def getSchedulaStatus_service(db: AsyncSession, schedularId: str,request: Request):
    organization_id = get_request_organization_id(request)
    schedular = await db.execute(
        select(ResourceSchedular)
        .where(ResourceSchedular.id == schedularId, ResourceSchedular.organization_id == organization_id)
        .options(selectinload(ResourceSchedular.resource_summary))
    )
    schedular = schedular.scalar_one_or_none()
    if not schedular:
        raise HTTPException(status_code=404, detail="No Schedular Found")
    
    job = scheduler.get_job(str(schedularId))
    
    if not job:
        return {
            "running": False,
            "message": "Job not found in scheduler — may not have been started yet"
        }
    
    return {
        "running": scheduler.running,
        "job": {
            "id": job.id,
            "next_run": str(job.next_run_time),
            "trigger": str(job.trigger)
        }
    }
    
async def deleteScheduler_service(db: AsyncSession, schedularId: str,request: Request):
    organization_id = get_request_organization_id(request)
    schedular = await db.execute(
        select(ResourceSchedular)
        .where(ResourceSchedular.id == schedularId, ResourceSchedular.organization_id == organization_id)
        .options(selectinload(ResourceSchedular.resource_summary))
    )
    schedular = schedular.scalar_one_or_none()
    
    if not schedular:
        raise HTTPException(status_code=404, detail="No Schedular Found")
    
    await db.delete(schedular)
    await db.commit()
    return {
        "message": "SCheduler Deleted successfully"
    }
    
