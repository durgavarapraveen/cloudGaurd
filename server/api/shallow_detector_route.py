from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession


from middlewares.userPermissions import require_permission
from db.postgressDB import get_db

from services.shallow_IT_detector_service import detect_shadow_it 

router = APIRouter(
    prefix="/shallow_detector",
    tags=["Shallow Detector"]
)

@router.get("/detect",
    dependencies=[Depends(require_permission("resource:summary:read"))]            
)
async def shallow_detector(
    cloudIdentifier: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await detect_shadow_it(db=db, cloudIdentifier=cloudIdentifier, request=request)
