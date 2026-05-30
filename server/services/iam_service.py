from aiohttp import ClientError
from fastapi import HTTPException, Request
from datetime import datetime, date
from uuid import UUID
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone
from sqlalchemy.sql import func

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from repository.cloudAccount_repository import getCloudAccountwithIdentifier_Repository

from models.resources_model import Resources

async def get_all_iam_roles(db: AsyncSession, cloudIdentifier: str, request: Request):
    cloud = await getCloudAccountwithIdentifier_Repository(db=db, indentifier=cloudIdentifier, request=request)
    if not cloud:
        raise HTTPException(status_code = 404, detail="No cloud Account Found")
    iam_users = await db.execute(
        select(Resources).where(
            Resources.cloud_account_id == cloud.id,
            Resources.resource_type.ilike("%iam%")
        )
    )
    iam_users = iam_users.scalars().all()
    users = [
        {
            "name": user.resource_name,
            "id": user.id,
            "resource_type": user.resource_type,
            "resource_id": user.resource_id
        }
        for user in iam_users
    ]
    return users
