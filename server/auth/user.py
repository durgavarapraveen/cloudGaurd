from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.userModel import User

async def get_user_by_email(
    db: AsyncSession,
    email: str
):

    result = await db.execute(
        select(User).where(User.email == email)
    )

    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    user: User
):

    db.add(user)

    await db.commit()

    await db.refresh(user)

    return user