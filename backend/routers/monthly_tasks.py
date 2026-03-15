from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from database import get_db
from models.monthly_task import MonthlyTask
from schemas.monthly_task import MonthlyTaskCreate, MonthlyTaskResponse
from auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[MonthlyTaskResponse])
def list_monthly_tasks(
    year: Optional[int] = Query(None, description="年で絞り込み"),
    month: Optional[int] = Query(None, description="月で絞り込み"),
    client_id: Optional[int] = Query(None, description="利用者IDで絞り込み"),
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """月間業務タスク一覧を取得します。"""
    stmt = select(MonthlyTask)
    conditions = []

    if year:
        conditions.append(MonthlyTask.year == year)
    if month:
        conditions.append(MonthlyTask.month == month)
    if client_id:
        conditions.append(MonthlyTask.client_id == client_id)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    tasks = db.execute(stmt).scalars().all()
    return tasks


@router.put("/", response_model=MonthlyTaskResponse)
def upsert_monthly_task(
    task_in: MonthlyTaskCreate,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """月間業務タスクを登録・更新します（upsert）。"""
    existing = db.execute(
        select(MonthlyTask).where(
            and_(
                MonthlyTask.client_id == task_in.client_id,
                MonthlyTask.year == task_in.year,
                MonthlyTask.month == task_in.month,
            )
        )
    ).scalar_one_or_none()

    if existing:
        existing.task_type = task_in.task_type
        db.commit()
        db.refresh(existing)
        return existing
    else:
        task = MonthlyTask(**task_in.model_dump())
        db.add(task)
        db.commit()
        db.refresh(task)
        return task


@router.delete("/", status_code=204)
def delete_monthly_task(
    client_id: int = Query(..., description="利用者ID"),
    year: int = Query(..., description="年"),
    month: int = Query(..., description="月"),
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """月間業務タスクを削除します（空白に戻す）。"""
    task = db.execute(
        select(MonthlyTask).where(
            and_(
                MonthlyTask.client_id == client_id,
                MonthlyTask.year == year,
                MonthlyTask.month == month,
            )
        )
    ).scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")

    db.delete(task)
    db.commit()
    return None
