from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker
)
import os
from pathlib import Path

from dotenv import load_dotenv
from models.Base import Base

# Import models so they are registered on Base.metadata before create_all().
from models.orginization_model import Organization
from models.rootUser_model import RootUsers
from models.userModel import User
from models.rolesModel import Role
from models.permission import Permission
from models.groups_Model import UserGroups
from models.cloudAccount_Model import CloudAccounts
from models.scans_model import Scans
from models.findings_model import Findings
from models.resources_model import Resources
from models.resourceSummary_model import ResourceSummary

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / "server" / ".env")
load_dotenv(ROOT_DIR / "infra" / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://admin:admin123@localhost:5433/cloudguard")
if "@postgres:5432" in DATABASE_URL and not Path("/.dockerenv").exists():
    DATABASE_URL = DATABASE_URL.replace("@postgres:5432", "@localhost:5433")

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
