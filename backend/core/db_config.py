import motor.motor_asyncio
from beanie import init_beanie
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGODB_URL: str
    MONGODB_DATABASE_NAME: str

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

env_settings = Settings()

async def init_db():
    client = motor.motor_asyncio.AsyncIOMotorClient(env_settings.MONGODB_URL)
    
    # Patch fix cho Beanie khi kết hợp Motor mới bị thiếu append_metadata
    if not hasattr(client.__class__, "append_metadata"):
        setattr(client.__class__, "append_metadata", lambda self, *args, **kwargs: None)
        
    from models.account import Account
    from models.resident import Resident
    from models.apartment import Apartment
    from models.vehicle import Vehicle
    from models.ticket import Ticket
    from models.notification import Notification

    await init_beanie(
        database=client[env_settings.MONGODB_DATABASE_NAME],
        document_models=[
            Account,
            Resident,
            Apartment,
            Vehicle,
            Ticket,
            Notification
        ]
    )
    print("MongoDB Atlas connection established and Beanie models initialized!")
