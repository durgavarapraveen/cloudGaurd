import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / "server" / ".env")
load_dotenv(ROOT_DIR / "infra" / ".env")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "cloudgaurdscanner")

client = AsyncIOMotorClient(MONGO_URI)
db = client[DATABASE_NAME]

# Example: collection per cloud provider
resources_collection = db["resources"]



