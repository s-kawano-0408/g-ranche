from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from database import get_db
from models.client import Client
from schemas.client import ClientCreate, ClientUpdate, ClientResponse
from pseudonym import generate_hash
from auth import get_current_user, require_admin

router = APIRouter()


@router.get("/", response_model=List[ClientResponse])
def list_clients(
    client_type: Optional[str] = Query(None, description="児/者で絞り込み"),
    status: Optional[str] = Query(None, description="状態で検索"),
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """利用者一覧を取得します。障害種別、状態でフィルタリングできます。"""
    stmt = select(Client)
    conditions = []

    if client_type:
        conditions.append(Client.client_type == client_type)
    if status:
        conditions.append(Client.status == status)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    stmt = stmt.order_by(Client.pseudonym_hash)
    clients = db.execute(stmt).scalars().all()
    return clients


@router.post("/", response_model=ClientResponse, status_code=201)
def create_client(client_in: ClientCreate, db: Session = Depends(get_db), _admin=Depends(require_admin)):
    """新しい利用者を登録します。（管理者のみ）"""
    pseudonym_hash = generate_hash(client_in.certificate_number, str(client_in.birth_date))
    client = Client(
        pseudonym_hash=pseudonym_hash,
        gender=client_in.gender,
        client_type=client_in.client_type,
        staff_id=client_in.staff_id,
        status=client_in.status,
        end_date=client_in.end_date,
        notes=client_in.notes,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(client_id: int, db: Session = Depends(get_db), _user=Depends(get_current_user)):
    """指定した利用者の詳細情報を取得します。"""
    client = db.execute(
        select(Client).where(Client.id == client_id)
    ).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="利用者が見つかりません")
    return client


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int, client_in: ClientUpdate, db: Session = Depends(get_db), _user=Depends(get_current_user)
):
    """利用者情報を更新します。"""
    client = db.execute(
        select(Client).where(Client.id == client_id)
    ).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="利用者が見つかりません")

    update_data = client_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(client, key, value)

    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: int, db: Session = Depends(get_db), _admin=Depends(require_admin)):
    """利用者を削除します。（管理者のみ）"""
    client = db.execute(
        select(Client).where(Client.id == client_id)
    ).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="利用者が見つかりません")

    db.delete(client)
    db.commit()
    return None
