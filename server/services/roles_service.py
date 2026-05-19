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


async def edit_role_permissions(db: AsyncSession, role_id: str, permissions: list[str], name: str):
    return await roles_repo.edit_role_permissions(db, role_id, permissions, name)
    
    