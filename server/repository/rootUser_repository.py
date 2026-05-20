from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.rootUser_model import RootUsers

async def get_rootUser_username(db: AsyncSession, username: str):
    user = await db.execute(
        select(RootUsers)
        .where(RootUsers.username == username)
    )
    
    return user.scalar_one_or_none()

async def create_rootUser(db: AsyncSession, data: RootUsers):
    db.add(data)
    await db.commit()
    await db.refresh(data)
    return data
