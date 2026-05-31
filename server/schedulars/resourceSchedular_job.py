# scheduler/jobs.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio

from db.postgressDB import AsyncSessionLocal
from datetime import datetime, timezone
from fastapi import Request
from services.resource_service import all_resources_service_aws
import asyncio
from .schedular import scheduler

# def run_scheduler_job_sync(schedular_id: str):
#     """Sync wrapper — APScheduler requires a regular callable, not a coroutine"""
#     asyncio.run(_run_scheduler_job_async(schedular_id))

from models.resourceSchedular_model import ResourceSchedular
from models.cloudAccount_Model import CloudAccounts

async def run_scheduler_job(schedular_id: str):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ResourceSchedular).where(ResourceSchedular.id == schedular_id)
        )
        schedular = result.scalar_one_or_none()

        if not schedular:
            return

        # Stop if past stop_date or inactive
        now = datetime.now(timezone.utc)
        if not schedular.is_active or (schedular.stop_date and now > schedular.stop_date):
            schedular.is_active = False
            await db.commit()
            scheduler.remove_job(str(schedular_id))
            return

        # ✅ Run your resource fetch here
        # await all_resources_service_aws(
        #     db=db,
        #     cloud_account_id=str(schedular.cloud_account_id),
        #     services=None,
        #     organization_id=str(schedular.organization_id),
        #     schedular_id=str(schedular.id),
        # )
        # schedular.last_scan = datetime.now(timezone.utc)
        # await db.commit()

async def schedular_resources():
    print(f"Scheduler Called ")
    async with AsyncSessionLocal() as db:
        clouds = await db.execute(
            select(CloudAccounts)
        )
        clouds = clouds.scalars().all()
        
        tasks = []
        
        for cloud in clouds:
            tasks.append(
                scan_account(
                    str(cloud.account_identifier),
                    str(cloud.organization_id)
                )
            )
        
        await asyncio.gather(*tasks)
            
async def scan_account(account_identifier, organization_id):
    
    scope = {"type": "http"}
    request = Request(scope)
    request.state.organizationId = str(organization_id)
    
    async with AsyncSessionLocal() as db:
        await all_resources_service_aws(
            db=db,
            account_identifier=account_identifier,
            services=None,
            request=request,
            schedular_id=None,
        )