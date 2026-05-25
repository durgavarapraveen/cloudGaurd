from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, Request

from models.rolesModel import Role
from schemas.roles_schema import CreateRoleRequest
from models.permission import Permission
from services.permissions_service import add_permission


async def get_all_roles(db: AsyncSession, request: Request):
    organization_id = request.state.organizationId
    result = await db.execute(
        select(Role)
        .where(Role.organization_id == organization_id)
        .options(selectinload(Role.permissions))  # ✅ eager load
    )
    roles = result.scalars().all()
    return [                                                   # ✅ return dicts
        {
            "role_id": str(role.id),
            "name": role.name,
            "is_active": not role.is_deleted,
            "is_deleted": role.is_deleted,
            "permissions": [p.name for p in role.permissions]
        }
        for role in roles
    ]


async def permission_objects_from_names(db: AsyncSession, permission_names: list[str], request: Request):
    organization_id = request.state.organizationId
    permission_result = await db.execute(
        select(Permission)
        .where(Permission.name.in_(permission_names) , Permission.organization_id == organization_id)
    )
    permission_objects = permission_result.scalars().all()

    found_names = {p.name for p in permission_objects}
    missing = set(permission_names) - found_names

    for name in missing:
        await add_permission(db, name, request=request)

    permission_result = await db.execute(
        select(Permission).where(Permission.name.in_(permission_names))
    )
    return permission_result.scalars().all()


async def create_role(db: AsyncSession, role_data: CreateRoleRequest, request: Request):
    organization_id = request.state.organizationId
    existing_result = await db.execute(
        select(Role)
        .where(Role.name == role_data.name , Role.organization_id == organization_id)
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail="Role with this name already exists")

    permission_objects = await permission_objects_from_names(db, role_data.permissions, request=request)

    new_role = Role(
        name=role_data.name,
        organization_id=organization_id
    )
    new_role.permissions = permission_objects

    db.add(new_role)
    await db.commit()

    result = await db.execute(
        select(Role)
        .where(Role.id == new_role.id)
        .options(selectinload(Role.permissions))
    )
    created_role = result.scalar_one()

    return {
        "message": "Role created successfully",
        "role_id": str(created_role.id),
        "name": created_role.name,
        "permissions": [p.name for p in created_role.permissions]
    }


async def delete_role(db: AsyncSession, role_id: str, request: Request):
    organization_id = request.state.organizationId
    role = await db.get(Role, role_id)

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    await db.delete(role)
    await db.commit()

    return {"message": "Role deleted successfully"}


async def get_role_by_name(db: AsyncSession, name: str, request: Request):
    organization_id = request.state.organizationId
    result = await db.execute(
        select(Role)
        .where(Role.name == name , Role.organization_id == organization_id)
        .options(selectinload(Role.permissions))  # ✅ eager load
    )
    role = result.scalar_one_or_none()

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    return {                                       # ✅ return dict
        "role_id": str(role.id),
        "name": role.name,
        "is_deleted": role.is_deleted,
        "permissions": [p.name for p in role.permissions]
    }


async def get_role_by_id(db: AsyncSession, role_id: str, request: Request):
    organization_id = request.state.organizationId
    result = await db.execute(
        select(Role)
        .where(Role.id == role_id , Role.organization_id == organization_id)
        .options(selectinload(Role.permissions))  # ✅ eager load
    )
    role = result.scalar_one_or_none()

    if role:
        return {
            "role_id": str(role.id),
            "name": role.name,
            "is_deleted": role.is_deleted,
            "permissions": [p.name for p in role.permissions]  # ✅ already loaded
        }
        
    raise HTTPException(status_code=404, detail="Role not found in Database")


async def edit_role_permissions(db: AsyncSession, role_id: str, permissions: list[str], name:str, request: Request):
    organization_id = request.state.organizationId
    result = await db.execute(
        select(Role)
        .where(Role.id == role_id , Role.organization_id == organization_id)
        .options(selectinload(Role.permissions))
    )
    role = result.scalar_one_or_none()

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    permission_objects = await permission_objects_from_names(db, permissions, request=request)
    role.permissions = permission_objects
    
    role.name = name

    await db.commit()

    updated = await db.execute(
        select(Role)
        .where(Role.id == role_id)
        .options(selectinload(Role.permissions))
    )
    updated_role = updated.scalar_one()

    return {
        "message": "Role permissions updated successfully",
        "role_id": str(updated_role.id),
        "name": updated_role.name,
        "permissions": [p.name for p in updated_role.permissions]
    }
