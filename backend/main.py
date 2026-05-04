from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from core.db_config import init_db
from api.routes import apartment_routes, account_routes, resident_routes, vehicle_routes, ticket_routes, notification_routes

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi tạo db khi server bật
    await init_db()
    yield 
    # Clean up (nếu cần) khi server tắt

app = FastAPI(lifespan=lifespan, title="BlueMoon API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký các API routers
app.include_router(apartment_routes.router, prefix="/api", tags=["apartments"])
app.include_router(account_routes.router, prefix="/api", tags=["accounts"])
app.include_router(resident_routes.router, prefix="/api", tags=["residents"])
app.include_router(vehicle_routes.router, prefix="/api", tags=["vehicles"])
app.include_router(ticket_routes.router, prefix="/api", tags=["tickets"])
app.include_router(notification_routes.router, prefix="/api", tags=["notifications"])

@app.get("/")
async def root():
    return {"message": "Welcome to BlueMoon API!"}
