from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "")
DATABASE_NAME = os.getenv("DATABASE_NAME", "cloudgaurdscanner")

client = AsyncIOMotorClient(MONGO_URI)
db = client[DATABASE_NAME]

# Example: collection per cloud provider
resources_collection = db["resources"]



