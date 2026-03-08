from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from database import get_db
from models.case_record import CaseRecord
from schemas.case_record import CaseRecordCreate, CaseRecordUpdate, CaseRecordResponse

router = APIRouter()


@router.get("/", response_model=List[CaseRecordResponse])
def list_case_records(
    client_id: Optional[int] = Query(None, description="利用者IDでフィルタリング"),
    staff_id: Optional[int] = Query(None, description="スタッフIDでフィルタリング"),
    record_type: Optional[str] = Query(None, description="記録種別でフィルタリング"),
    limit: int = Query(50, description="取得件数の上限"),
    db: Session = Depends(get_db),
):
    """支援記録一覧を取得します。利用者ID、スタッフID、記録種別でフィルタリングできます。"""
    stmt = select(CaseRecord)
    conditions = []

    if client_id is not None:
        conditions.append(CaseRecord.client_id == client_id)
    if staff_id is not None:
        conditions.append(CaseRecord.staff_id == staff_id)
    if record_type:
        conditions.append(CaseRecord.record_type == record_type)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    stmt = stmt.order_by(CaseRecord.record_date.desc()).limit(limit)
    records = db.execute(stmt).scalars().all()
    return records


@router.post("/", response_model=CaseRecordResponse, status_code=201)
def create_case_record(record_in: CaseRecordCreate, db: Session = Depends(get_db)):
    """新しい支援記録を作成します。"""
    record = CaseRecord(**record_in.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/{record_id}", response_model=CaseRecordResponse)
def update_case_record(
    record_id: int, record_in: CaseRecordUpdate, db: Session = Depends(get_db)
):
    """支援記録を更新します。"""
    record = db.execute(
        select(CaseRecord).where(CaseRecord.id == record_id)
    ).scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="支援記録が見つかりません")

    update_data = record_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(record, key, value)

    db.commit()
    db.refresh(record)
    return record
