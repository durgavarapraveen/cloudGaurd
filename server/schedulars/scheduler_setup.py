# app/scheduler/setup.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger, datetime
from .resourceSchedular_job import schedular_resources 

scheduler = AsyncIOScheduler()

def start_scheduler():
    scheduler.add_job(
        schedular_resources,
        trigger=IntervalTrigger(minutes=45),
        id="aws_resource_sync",
        name="AWS resource sync every 30 minutes",
        replace_existing=True,
        misfire_grace_time=60, 
        # next_run_time=datetime.now()
    )
    scheduler.start()

def stop_scheduler():
    scheduler.shutdown()