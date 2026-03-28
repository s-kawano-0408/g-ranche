import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import engine, Base
from auth import verify_token
from routers import clients, support_plans, case_records, schedules, ai, monthly_tasks, auth, transcription

# Import all models to ensure they are registered with SQLAlchemy
import models  # noqa: F401

app = FastAPI(
    title="ぐ・らんちぇ 管理システム API",
    description="ぐ・らんちぇの相談支援業務を管理するAPIです。",
    version="1.0.0",
    redirect_slashes=False,
)

# CORS configuration - Cookie送信にはオリジンの明示指定が必要
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# レートリミット設定（IPアドレスで制限）
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "試行回数が多すぎます。しばらく経ってからお試しください。"})

# 末尾スラッシュを自動除去（308リダイレクトを防止）
@app.middleware("http")
async def strip_trailing_slash(request: Request, call_next):
    if request.url.path != "/" and request.url.path.endswith("/"):
        request.scope["path"] = request.url.path.rstrip("/")
    return await call_next(request)

# Include routers
app.include_router(clients.router, prefix="/api/clients", tags=["利用者管理"])
app.include_router(support_plans.router, prefix="/api/support-plans", tags=["支援計画"])
app.include_router(case_records.router, prefix="/api/records", tags=["支援記録"])
app.include_router(schedules.router, prefix="/api/schedules", tags=["スケジュール"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI アシスタント"])
app.include_router(monthly_tasks.router, prefix="/api/monthly-tasks", tags=["月間業務管理"])
app.include_router(auth.router, prefix="/api/auth", tags=["認証"])
app.include_router(transcription.router, prefix="/api/transcription", tags=["Excel転記"])


# 監査ログ設定
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
audit_logger = logging.getLogger("audit")

@app.middleware("http")
async def audit_log_middleware(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        user = "anonymous"
        token = request.cookies.get("access_token")
        if token:
            payload = verify_token(token)
            if payload:
                user = payload.get("sub", "unknown")
        client_ip = request.client.host if request.client else "unknown"
        audit_logger.info(f"{request.method} {request.url.path} user={user} ip={client_ip} status={response.status_code}")
    return response


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
