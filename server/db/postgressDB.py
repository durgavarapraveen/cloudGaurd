from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker
)
import os
from pathlib import Path

from dotenv import load_dotenv
from models.Base import Base
from models.userModel import User
from models.rolesModel import Role
from models.permission import Permission

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://admin:admin123@localhost:5433/cloudguard")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,      # ✅ checks connection before using it
    pool_recycle=300,        # ✅ recycles connections every 5 mins
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()    # ✅ commit on success
        except Exception:
            await session.rollback()  # ✅ rollback on error
            raise
