from fastapi import HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

import repository.user_repository as user_repo
from schemas.user_schema import CreateUserByAdmin

from services.auth_service import register_user_by_admin

async def get_all_users(db: AsyncSession, request: Request):
    users = await user_repo.get_all_users(db, request=request)
    return users

async def get_user_by_id(user_id: str, request: Request, db: AsyncSession):
    user = await user_repo.get_user_by_id(db, user_id=user_id, request=request)
    return user

async def get_user_by_email(email: str,request: Request, db: AsyncSession):
    user = await user_repo.get_user_by_email(db, email=email, request=request)
    
    return user

async def get_all_users_with_roles(db: AsyncSession,request: Request, roles: list[str]):
    users = await user_repo.get_all_users_with_roles(db, roles=roles, request=request)
    return users

async def delete_user(user_id: str, request: Request, db: AsyncSession):
    result = await user_repo.delete_user(db, user_id=user_id, request=request)
    return result

async def edit_user_roles(user_id: str, roles: list[str],request: Request, db: AsyncSession):
    return await user_repo.edit_user_roles(user_id, roles, db, request=request)

async def edit_user_info(user_id: str, name: str, email: str,request: Request, db: AsyncSession):
    return await user_repo.edit_user_info(user_id, name, email, db, request=request)

async def create_new_user(request: Request, data: CreateUserByAdmin,db: AsyncSession):
    return await register_user_by_admin(db, data, request=request)
    
