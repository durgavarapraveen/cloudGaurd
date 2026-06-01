from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import jwt
from integration.github.github_integration import get_installation_token, get_repositories, github_install_link_service, call_back_service

from middlewares.userPermissions import require_permission
from db.postgressDB import get_db

router = APIRouter(
    prefix="/github",
    tags=["GitHub"]
)



@router.get("/github/install")
async def github_install(org_id: str):
    return await github_install_link_service(org_id)
    
    
@router.get("/github/callback")
async def github_callback(
    installation_id: int,
    state: str,
):
    await call_back_service(installation_id=installation_id, state=state)
    