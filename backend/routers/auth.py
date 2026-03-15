from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from database import get_db
from models.user import User
from auth import verify_password, create_access_token, verify_token, require_admin, hash_password

from pydantic import BaseModel

from fastapi.security import OAuth2PasswordBearer

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_token(token: str = Depends(oauth2_scheme)) -> str:
    return token

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == data.email)).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが間違っています")

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが間違っています")

    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me")
def get_me(token: str = Depends(get_current_token), db: Session = Depends(get_db)):
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code = 401, detail="無効なトークンです")

    user = db.execute(
        select(User).where(User.email == payload["sub"])
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code = 401, detail = "ユーザーが見つかりません")

    return {"id": user.id, "email": user.email, "name": user.name, "role": user.role}

@router.get("/users")
def list_users(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    """ユーザー一覧を取得します。（管理者のみ）"""
    users = db.execute(select(User)).scalars().all()
    return [{"id": u.id, "email": u.email, "name": u.name, "role": u.role} for u in users]


class PasswordChangeRequest(BaseModel):
    new_password: str

@router.put("/users/{user_id}/password")
def change_password(user_id: int, data: PasswordChangeRequest, db: Session = Depends(get_db), _admin=Depends(require_admin)):
    """ユーザーのパスワードを変更します。（管理者のみ）"""
    user = db.execute(
        select(User).where(User.id == user_id)
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "パスワードを変更しました"}