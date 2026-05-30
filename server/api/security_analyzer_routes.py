from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession


from middlewares.userPermissions import require_permission
from db.postgressDB import get_db

from services.security_analyzer_service import analyze_resource

router = APIRouter(
    prefix="/security_analyzer",
    tags=["Security Analyzer"]
)

@router.get("/analyze",
    dependencies=[Depends(require_permission("resource:summary:read"))]            
)
async def analyzeResource(
    cloudIdentifier: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await analyze_resource(db=db, cloudIdentifier=cloudIdentifier, request=request)