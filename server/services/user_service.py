from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

import repository.user_repository as user_repo
from schemas.user_schema import CreateUserByAdmin

from services.auth_service import register_user_by_admin

async def get_all_users(db: AsyncSession):
    users = await user_repo.get_all_users(db)
    return users

async def get_user_by_id(user_id: str, db: AsyncSession):
    user = await user_repo.get_user_by_id(db, user_id=user_id)
    
    return user

async def get_user_by_email(email: str, db: AsyncSession):
    user = await user_repo.get_user_by_email(db, email=email)
    
    return user

async def get_all_users_with_roles(db: AsyncSession, roles: list[str]):
    users = await user_repo.get_all_users_with_roles(db, roles=roles)
    return users

async def delete_user(user_id: str, db: AsyncSession):
    result = await user_repo.delete_user(db, user_id=user_id)
    return result

async def edit_user_roles(user_id: str, roles: list[str], db: AsyncSession):
    print(f"Editing roles for user_id: {user_id} with roles: {roles}")
    return await user_repo.edit_user_roles(user_id, roles, db)

async def edit_user_info(user_id: str, name: str, email: str, db: AsyncSession):
    return await user_repo.edit_user_info(user_id, name, email, db)

async def create_new_user(db: AsyncSession, data: CreateUserByAdmin):
    return await register_user_by_admin(db, data)
    