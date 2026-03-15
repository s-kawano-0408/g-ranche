from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from database import get_db
from models.schedule import Schedule
from schemas.schedule import ScheduleCreate, ScheduleUpdate, ScheduleResponse
from auth import get_current_user

router = APIRouter()


@router.get("/today", response_model=List[ScheduleResponse])
def get_today_schedules(
    staff_id: Optional[int] = Query(None, description="スタッフIDでフィルタリング"),
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """本日のスケジュール一覧を取得します。"""
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())

    stmt = select(Schedule).where(
        and_(
            Schedule.start_datetime >= today_start,
            Schedule.start_datetime <= today_end,
        )
    )
    if staff_id is not None:
        stmt = stmt.where(Schedule.staff_id == staff_id)

    stmt = stmt.order_by(Schedule.start_datetime)
    schedules = db.execute(stmt).scalars().all()
    return schedules


@router.get("/", response_model=List[ScheduleResponse])
def list_schedules(
    start_date: Optional[str] = Query(None, description="開始日（YYYY-MM-DD）"),
    end_date: Optional[str] = Query(None, description="終了日（YYYY-MM-DD）"),
    client_id: Optional[int] = Query(None, description="利用者IDでフィルタリング"),
    staff_id: Optional[int] = Query(None, description="スタッフIDでフィルタリング"),
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """スケジュール一覧を取得します。日付範囲、利用者ID、スタッフIDでフィルタリングできます。"""
    stmt = select(Schedule)
    conditions = []

    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            conditions.append(Schedule.start_datetime >= start_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="開始日の形式が正しくありません（YYYY-MM-DD）")

    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(
                hour=23, minute=59, second=59
            )
            conditions.append(Schedule.start_datetime <= end_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="終了日の形式が正しくありません（YYYY-MM-DD）")

    if client_id is not None:
        conditions.append(Schedule.client_id == client_id)
    if staff_id is not None:
        conditions.append(Schedule.staff_id == staff_id)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    stmt = stmt.order_by(Schedule.start_datetime)
    schedules = db.execute(stmt).scalars().all()
    return schedules


@router.post("/", response_model=ScheduleResponse, status_code=201)
def create_schedule(schedule_in: ScheduleCreate, db: Session = Depends(get_db), _user=Depends(get_current_user)):
    """新しいスケジュールを作成します。"""
    schedule = Schedule(**schedule_in.model_dump())
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.put("/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(
    schedule_id: int, schedule_in: ScheduleUpdate, db: Session = Depends(get_db), _user=Depends(get_current_user)
):
    """スケジュールを更新します。"""
    schedule = db.execute(
        select(Schedule).where(Schedule.id == schedule_id)
    ).scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="スケジュールが見つかりません")

    update_data = schedule_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(schedule, key, value)

    db.commit()
    db.refresh(schedule)
    return schedule


@router.delete("/{schedule_id}", status_code=204)
def delete_schedule(
    schedule_id: int, db: Session = Depends(get_db), _user=Depends(get_current_user)
):
    """スケジュールを削除します。"""
    schedule = db.execute(
        select(Schedule).where(Schedule.id == schedule_id)
    ).scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="スケジュールが見つかりません")

    db.delete(schedule)
    db.commit()
