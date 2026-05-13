from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.permission import Permission

async def get_all_permissions(db: AsyncSession):
    permissions = await db.execute(
        select(Permission)
    )
    permissions = permissions.scalars().all()
    return permissions

async def add_permission(db: AsyncSession, permission_name: str):
    # Check if permission already exists
    existing_permission = await db.execute(
        select(Permission).where(Permission.name == permission_name)
    )
    if existing_permission.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Permission already exists")
    
    new_permission = Permission(name=permission_name)
    db.add(new_permission)
    await db.commit()
    await db.refresh(new_permission)
    return new_permission

async def delete_permission_by_id(db: AsyncSession, id: str):
    result = await db.execute(
        select(Permission).where(
            Permission.id == id
        )
    )

    permission = result.scalar_one_or_none()

    if not permission:
        raise HTTPException(
            status_code=404,
            detail="Permission not found"
        )

    await db.delete(permission)
    await db.commit()

    return {"message": "Permission deleted"}