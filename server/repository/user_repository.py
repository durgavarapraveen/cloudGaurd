from typing import List

from fastapi import HTTPException, Request
from psycopg2 import IntegrityError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.rolesModel import Role
from models.userModel import User


def get_request_organization_id(request: Request):
    return (
        getattr(request.state, "organizationId", None)
        or getattr(request.state, "organizationID", None)
    )


async def get_user_by_email(
    db: AsyncSession,
    email: str,
    request: Request | None = None,
):
    query = (
        select(User)
        .where(User.email == email)
        .options(selectinload(User.roles))
    )

    if request is not None:
        organization_id = get_request_organization_id(request)
        query = query.where(User.organization_id == organization_id)

    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, user: User):
    try:
        db.add(user)
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Email already registered")
    
    return user


async def get_all_users(db: AsyncSession, request: Request):
    organization_id = get_request_organization_id(request)
    result = await db.execute(
        select(User)
        .where(User.organization_id == organization_id)
        .options(selectinload(User.roles), selectinload(User.groups))
    )
    users = result.scalars().all()

    return [
        {
            "user_id": str(user.id),
            "username": user.username,
            "email": user.email,
            "is_active": user.is_active,
            "is_deleted": user.is_deleted,
            "roles": [role.name for role in user.roles],
            "groups": [g.name for g in user.groups]
        }
        for user in users
    ]


async def get_user_by_id(db: AsyncSession, user_id: str, request: Request):
    organization_id = get_request_organization_id(request)
    result = await db.execute(
        select(User)
        .where(User.id == user_id, User.organization_id == organization_id)
        .options(selectinload(User.roles), selectinload(User.groups))
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


async def get_all_users_with_roles(
    db: AsyncSession,
    roles: List[str],
    request: Request,
):
    organization_id = get_request_organization_id(request)
    result = await db.execute(
        select(User)
        .join(User.roles)
        .where(Role.name.in_(roles), User.organization_id == organization_id)
        .options(selectinload(User.roles))
    )
    return result.scalars().unique().all()


async def delete_user(db: AsyncSession, user_id: str, request: Request):
    organization_id = get_request_organization_id(request)
    result = await db.execute(
        select(User)
        .where(User.id == user_id, User.organization_id == organization_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await db.commit()

    return {"message": "User deleted successfully"}


async def logout_user(user_id: str, db: AsyncSession):
    user = await db.get(User, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    await db.commit()

    return {"message": "User logged out successfully"}


async def edit_user_roles(
    user_id: str,
    roles: List[str],
    db: AsyncSession,
    request: Request,
):
    organization_id = get_request_organization_id(request)
    result = await db.execute(
        select(User)
        .where(User.id == user_id, User.organization_id == organization_id)
        .options(selectinload(User.roles))
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role_result = await db.execute(
        select(Role).where(Role.name.in_(roles))
    )
    role_objects = role_result.scalars().all()

    if not role_objects:
        raise HTTPException(status_code=404, detail="No matching roles found")

    user.roles = role_objects
    await db.commit()

    updated = await db.execute(
        select(User)
        .where(User.id == user_id, User.organization_id == organization_id)
        .options(selectinload(User.roles))
    )
    updated_user = updated.scalar_one()

    return {
        "message": "Roles updated successfully",
        "user_id": str(updated_user.id),
        "username": updated_user.username,
        "email": updated_user.email,
        "roles": [role.name for role in updated_user.roles],
    }


async def edit_user_info(
    user_id: str,
    name: str,
    email: str,
    db: AsyncSession,
    request: Request,
):
    organization_id = get_request_organization_id(request)
    result = await db.execute(
        select(User)
        .where(User.id == user_id, User.organization_id == organization_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.username = name
    user.email = email

    await db.commit()
    await db.refresh(user)
    return {
        "message": "User info updated successfully",
        "user_id": str(user.id),
        "username": user.username,
        "email": user.email,
    }

async def get_current_user(request: Request, db: AsyncSession):
    userId = request.state.user_id
    if not userId:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user = await db.execute(
        select(User).where(User.id == userId)
        .options(selectinload(User.organization))
    )
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user