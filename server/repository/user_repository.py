from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

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

async def delete_user(
    db: AsyncSession,
    user_id: str
):
    user = await db.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    await db.delete(user)
    await db.commit()

    return {
        "message": "User deleted successfully"
    }
    
async def logout_user(
    user_id: str,
    db: AsyncSession
):
    user = await db.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Invalidate the user's tokens here (e.g., by adding them to a blacklist)

    return {
        "message": "User logged out successfully"
    }