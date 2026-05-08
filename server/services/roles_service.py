from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

import repository.roles_repository as roles_repo
from schemas.roles_schema import CreateRoleRequest
from models.rolesModel import Role

async def get_all_roles(db: AsyncSession):
    result = await db.execute(
        select(Role)
        .options(
            selectinload(Role.permissions)  # ✅ eagerly load permissions
        )
    )
    roles = result.scalars().all()

    return [
        {
            "role_id": str(role.id),
            "name": role.name,
            "is_deleted": role.is_deleted,
            "permissions": [p.name for p in role.permissions]
        }
        for role in roles
    ]

async def create_role(db: AsyncSession, role_data: CreateRoleRequest):
    
    return await roles_repo.create_role(db, role_data)

async def delete_role(db: AsyncSession, role_id: str):
    return await roles_repo.delete_role(db, role_id)

async def get_role_by_name(db: AsyncSession, name: str):
    return await roles_repo.get_role_by_name(db, name)

async def get_role_by_id(db: AsyncSession, id: str):
    return await roles_repo.get_role_by_id(db, id)


async def edit_role_name(db: AsyncSession, role_id: str, new_name: str):

    # ✅ check if role exists
    result = await db.execute(
        select(Role).where(Role.id == role_id)
    )
    role = result.scalar_one_or_none()

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # ✅ check if new name is already taken
    name_check = await db.execute(
        select(Role).where(Role.name == new_name)
    )
    existing = name_check.scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail="Role with this name already exists")

    role.name = new_name
    await db.commit()

    return {
        "message": "Role name updated successfully",
        "role_id": str(role.id),
        "name": role.name
    }

async def edit_role_permissions(db: AsyncSession, role_id: str, permissions: list[str]):
    return await roles_repo.edit_role_permissions(db, role_id, permissions)
    
    