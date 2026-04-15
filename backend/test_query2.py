import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from models.vehicle import Vehicle
from dotenv import load_dotenv

load_dotenv()

async def main():
    print(f"URL: {bool(os.getenv('MONGODB_URL'))}")
    client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
    await init_beanie(database=client[os.getenv("MONGODB_DATABASE_NAME")], document_models=[Vehicle])
    
    # insert a mock vehicle
    try:
        from bson import ObjectId
        await Vehicle(
            apartment_id=ObjectId(), resident_id=ObjectId(),
            license_plate="30A-999.99", vehicle_type="car", vehicle_name="Test"
        ).insert()
    except Exception as e:
         print(e)
    
    v = await Vehicle.find_one({"license_plate": "30A-999.99"})
    print("Dict search:", v is not None)
    
    v2 = await Vehicle.find_one(Vehicle.license_plate == "30A-999.99")
    print("Class search:", v2 is not None)

    if v2: await v2.delete()
    
if __name__ == "__main__":
    asyncio.run(main())
