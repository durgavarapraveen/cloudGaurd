from fastapi import HTTPException

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.cloud_model import Cloud
from schemas.CloudAccounts_Schema import (
    CreateNewCloudAccount,
)


async def get_all_cloud_accounts(
    db: AsyncSession,
):
    query = select(Cloud)

    result = await db.execute(query)

    clouds = result.scalars().all()

    return [
        {
            "id": str(cloud.id),
            "created_by": str(cloud.created_by)
            if cloud.created_by
            else None,
            "provider": cloud.provider,
            "account_name": cloud.account_name,
            "account_identifier": cloud.account_identifier,
            "region": cloud.region,
            "is_active": cloud.is_active,
            "scan_status": cloud.scan_status,
            "last_scan_at": cloud.last_scan_at,
            "created_at": cloud.created_at,
            "updated_at": cloud.updated_at,
        }
        for cloud in clouds
    ]


async def add_new_cloud_account(
    db: AsyncSession,
    data: CreateNewCloudAccount,
    user_id: str,
):

    # Check duplicate name for this provider.
    existing_result = await db.execute(
        select(Cloud).where(
            Cloud.provider == data.provider,
            Cloud.account_name == data.account_name,
        )
    )

    existing_cloud = existing_result.scalars().first()

    if existing_cloud:
        raise HTTPException(
            status_code=400,
            detail="Same account name already exists for this provider",
        )

    cloud = Cloud(
        created_by=user_id,
        provider=data.provider,
        account_name=data.account_name,
        account_identifier=data.account_identifier,
        region=data.region,
        credentials=data.credentials,
        is_active=data.is_active,
        scan_status="pending",
    )

    db.add(cloud)

    await db.commit()

    await db.refresh(cloud)

    return {
        "id": str(cloud.id),
        "provider": cloud.provider,
        "account_name": cloud.account_name,
        "account_identifier": cloud.account_identifier,
        "region": cloud.region,
        "is_active": cloud.is_active,
        "scan_status": cloud.scan_status,
    }
