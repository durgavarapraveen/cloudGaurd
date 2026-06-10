# scheduler/jobs.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio

from db.postgressDB import AsyncSessionLocal
from datetime import datetime, timezone
from fastapi import Request, BackgroundTasks
from services.resource_service import scan_account
import asyncio
from .schedular import scheduler

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
        

async def schedular_resources():
    print("Scheduler: starting AWS resource sync")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(CloudAccounts))
        clouds = result.scalars().all()

    if not clouds:
        print("Scheduler: no cloud accounts found, skipping")
        return

    print(f"Scheduler: scanning {len(clouds)} cloud account(s)")

    tasks = [
        scan_account(
            account_identifier=str(cloud.account_identifier),
            organization_id=str(cloud.organization_id),
        )
        for cloud in clouds
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # log any accounts that failed without stopping the others
    for cloud, result in zip(clouds, results):
        if isinstance(result, Exception):
            print(f"Scheduler: scan failed for {cloud.account_identifier} — {result}")
        else:
            print(f"Scheduler: scan queued for {cloud.account_identifier}")
            