from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from database import get_db
from models.support_plan import SupportPlan
from models.client import Client
from schemas.support_plan import SupportPlanCreate, SupportPlanUpdate, SupportPlanResponse
from auth import get_current_user

router = APIRouter()


@router.get("", response_model=List[SupportPlanResponse])
def list_support_plans(
    client_id: Optional[int] = Query(None, description="利用者IDでフィルタリング"),
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """支援計画一覧を取得します。利用者IDでフィルタリングできます。"""
    stmt = select(SupportPlan).where(SupportPlan.deleted_at.is_(None))
    if client_id is not None:
        stmt = stmt.where(SupportPlan.client_id == client_id)
    stmt = stmt.order_by(SupportPlan.plan_date.desc())
    plans = db.execute(stmt).scalars().all()
    return plans


@router.post("", response_model=SupportPlanResponse, status_code=201)
def create_support_plan(plan_in: SupportPlanCreate, db: Session = Depends(get_db), _user=Depends(get_current_user)):
    """新しい支援計画を作成します。"""
    # Verify client exists
    client = db.execute(
        select(Client).where(Client.id == plan_in.client_id, Client.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="利用者が見つかりません")

    plan = SupportPlan(**plan_in.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/{plan_id}", response_model=SupportPlanResponse)
def get_support_plan(plan_id: int, db: Session = Depends(get_db), _user=Depends(get_current_user)):
    """指定した支援計画の詳細を取得します。"""
    plan = db.execute(
        select(SupportPlan).where(SupportPlan.id == plan_id, SupportPlan.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="支援計画が見つかりません")
    return plan


@router.put("/{plan_id}", response_model=SupportPlanResponse)
def update_support_plan(
    plan_id: int, plan_in: SupportPlanUpdate, db: Session = Depends(get_db), _user=Depends(get_current_user)
):
    """支援計画を更新します。"""
    plan = db.execute(
        select(SupportPlan).where(SupportPlan.id == plan_id, SupportPlan.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="支援計画が見つかりません")

    update_data = plan_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(plan, key, value)

    db.commit()
    db.refresh(plan)
    return plan
