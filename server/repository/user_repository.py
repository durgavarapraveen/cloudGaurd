from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from typing import List

from models.userModel import User
from models.rolesModel import Role


async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(
        select(User)
        .where(User.email == email)
        .options(selectinload(User.roles))  # ✅ eager load roles
    )
    return result.scalar_one_or_none()  # returns None if not found (no exception)


async def create_user(db: AsyncSession, user: User):
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_all_users(db: AsyncSession):
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles))  # ✅ eager load roles
    )
    result = result.scalars().all()
    
    return [  # ✅ return list of dicts
        {
            "user_id": str(user.id),
            "username": user.username,
            "email": user.email,
            "is_active": user.is_active,
            "is_deleted": user.is_deleted,
            "roles": [role.name for role in user.roles]
        }
        for user in result
    ]


async def get_user_by_id(db: AsyncSession, user_id: str):  # ✅ str not string
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.roles))  # ✅ eager load roles
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


async def get_all_users_with_roles(db: AsyncSession, roles: List[str]):
    # ✅ filter users who have any of the given role names
    result = await db.execute(
        select(User)
        .join(User.roles)
        .where(Role.name.in_(roles))
        .options(selectinload(User.roles))
    )
    return result.scalars().unique().all()


async def delete_user(db: AsyncSession, user_id: str):  # ✅ str not string
    user = await db.get(User, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await db.commit()

    return {"message": "User deleted successfully"}


async def logout_user(user_id: str, db: AsyncSession):
    user = await db.get(User, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False  # ✅ deactivate user on logout
    await db.commit()

    return {"message": "User logged out successfully"}


async def edit_user_roles(user_id: str, roles: List[str], db: AsyncSession):
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
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

    # ✅ re-fetch instead of refresh
    updated = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.roles))
    )
    updated_user = updated.scalar_one()

    return {
        "message": "Roles updated successfully",
        "user_id": str(updated_user.id),
        "username": updated_user.username,
        "email": updated_user.email,
        "roles": [role.name for role in updated_user.roles]  # ✅ uncommented
    }