from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_

from database import get_db
from models.client import Client
from schemas.client import ClientCreate, ClientUpdate, ClientResponse

router = APIRouter()


@router.get("/", response_model=List[ClientResponse])
def list_clients(
    name: Optional[str] = Query(None, description="名前で検索（部分一致）"),
    disability_type: Optional[str] = Query(None, description="障害種別で検索"),
    status: Optional[str] = Query(None, description="状態で検索"),
    db: Session = Depends(get_db),
):
    """利用者一覧を取得します。名前、障害種別、状態でフィルタリングできます。"""
    stmt = select(Client)
    conditions = []

    if name:
        conditions.append(
            or_(
                Client.name.contains(name),
                Client.name_kana.contains(name),
            )
        )
    if disability_type:
        conditions.append(Client.disability_type == disability_type)
    if status:
        conditions.append(Client.status == status)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    stmt = stmt.order_by(Client.name)
    clients = db.execute(stmt).scalars().all()
    return clients


@router.post("/", response_model=ClientResponse, status_code=201)
def create_client(client_in: ClientCreate, db: Session = Depends(get_db)):
    """新しい利用者を登録します。"""
    client = Client(**client_in.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(client_id: int, db: Session = Depends(get_db)):
    """指定した利用者の詳細情報を取得します。"""
    client = db.execute(
        select(Client).where(Client.id == client_id)
    ).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="利用者が見つかりません")
    return client


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int, client_in: ClientUpdate, db: Session = Depends(get_db)
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
def delete_client(client_id: int, db: Session = Depends(get_db)):
    """利用者を削除します。"""
    client = db.execute(
        select(Client).where(Client.id == client_id)
    ).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="利用者が見つかりません")

    db.delete(client)
    db.commit()
    return None
