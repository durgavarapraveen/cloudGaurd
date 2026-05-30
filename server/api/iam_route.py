from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession


from middlewares.userPermissions import require_permission
from db.postgressDB import get_db

from analyzer.iam_analyzer import run_iam_analyzer
from services.iam_service import get_all_iam_roles

router = APIRouter(
    prefix="/iam",
    tags=["IAM"]
)



@router.get("/analysis",
    dependencies=[Depends(require_permission("resource:summary:read"))]            
)
async def get_relationships(
    cloudIdentifier: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await run_iam_analyzer(db=db, cloudIdentifier=cloudIdentifier, request=request)


@router.get("/entities",
    dependencies=[Depends(require_permission("resource:summary:read"))]            
)
async def get_all_iam_entities(
    cloudIdentifier: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await get_all_iam_roles(db=db, cloudIdentifier=cloudIdentifier, request=request)