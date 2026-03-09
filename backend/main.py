from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routers import clients, support_plans, case_records, schedules, ai, monthly_tasks

# Import all models to ensure they are registered with SQLAlchemy
import models  # noqa: F401

app = FastAPI(
    title="ぐ・らんちぇ 管理システム API",
    description="ぐ・らんちぇの相談支援業務を管理するAPIです。",
    version="1.0.0",
)

# CORS configuration - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(clients.router, prefix="/api/clients", tags=["利用者管理"])
app.include_router(support_plans.router, prefix="/api/support-plans", tags=["支援計画"])
app.include_router(case_records.router, prefix="/api/records", tags=["支援記録"])
app.include_router(schedules.router, prefix="/api/schedules", tags=["スケジュール"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI アシスタント"])
app.include_router(monthly_tasks.router, prefix="/api/monthly-tasks", tags=["月間業務管理"])


@app.on_event("startup")
async def startup_event():
    """Create database tables on startup."""
    Base.metadata.create_all(bind=engine)
    print("データベーステーブルを作成しました。")


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "ぐ・らんちぇ 管理システム API"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "message": "福祉支援管理システム APIは正常に動作しています。"}
