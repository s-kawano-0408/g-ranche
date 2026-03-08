from datetime import datetime, date, timedelta
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, func

from models.client import Client
from models.staff import Staff
from models.support_plan import SupportPlan
from models.case_record import CaseRecord
from models.schedule import Schedule


class ToolExecutor:
    """Executes tool calls from Claude using actual database queries."""

    def __init__(self, db: Session):
        self.db = db

    def execute(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool call and return JSON-serializable results."""
        tool_map = {
            "search_clients": self._search_clients,
            "get_client_detail": self._get_client_detail,
            "get_schedules": self._get_schedules,
            "get_case_records": self._get_case_records,
            "create_schedule": self._create_schedule,
            "create_case_record": self._create_case_record,
            "get_monitoring_due_clients": self._get_monitoring_due_clients,
            "get_dashboard_stats": self._get_dashboard_stats,
        }

        handler = tool_map.get(tool_name)
        if not handler:
            return {"error": f"Unknown tool: {tool_name}"}

        try:
            return handler(**tool_input)
        except Exception as e:
            return {"error": str(e)}

    def _format_date(self, d) -> Optional[str]:
        if d is None:
            return None
        if isinstance(d, (date, datetime)):
            return d.isoformat()
        return str(d)

    def _client_to_dict(self, client: Client) -> Dict[str, Any]:
        return {
            "id": client.id,
            "name": client.name,
            "name_kana": client.name_kana,
            "birth_date": self._format_date(client.birth_date),
            "gender": client.gender,
            "disability_type": client.disability_type,
            "disability_certificate_level": client.disability_certificate_level,
            "address": client.address,
            "phone": client.phone,
            "emergency_contact": client.emergency_contact,
            "emergency_phone": client.emergency_phone,
            "staff_id": client.staff_id,
            "status": client.status,
            "intake_date": self._format_date(client.intake_date),
            "notes": client.notes,
        }

    def _search_clients(
        self,
        name: Optional[str] = None,
        disability_type: Optional[str] = None,
        status: Optional[str] = "active",
    ) -> Dict[str, Any]:
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

        clients = self.db.execute(stmt).scalars().all()
        return {
            "clients": [self._client_to_dict(c) for c in clients],
            "total": len(clients),
        }

    def _get_client_detail(self, client_id: int) -> Dict[str, Any]:
        client = self.db.execute(
            select(Client).where(Client.id == client_id)
        ).scalar_one_or_none()

        if not client:
            return {"error": f"利用者ID {client_id} が見つかりません"}

        # Get latest support plan
        latest_plan = self.db.execute(
            select(SupportPlan)
            .where(SupportPlan.client_id == client_id)
            .order_by(SupportPlan.plan_date.desc())
            .limit(1)
        ).scalar_one_or_none()

        plan_dict = None
        if latest_plan:
            plan_dict = {
                "id": latest_plan.id,
                "plan_date": self._format_date(latest_plan.plan_date),
                "long_term_goal": latest_plan.long_term_goal,
                "short_term_goal": latest_plan.short_term_goal,
                "service_contents": latest_plan.service_contents,
                "monitoring_interval": latest_plan.monitoring_interval,
                "next_monitoring_date": self._format_date(latest_plan.next_monitoring_date),
                "status": latest_plan.status,
            }

        # Get last 5 case records
        records = self.db.execute(
            select(CaseRecord)
            .where(CaseRecord.client_id == client_id)
            .order_by(CaseRecord.record_date.desc())
            .limit(5)
        ).scalars().all()

        records_list = [
            {
                "id": r.id,
                "record_date": self._format_date(r.record_date),
                "record_type": r.record_type,
                "content": r.content,
                "summary": r.summary,
                "next_action": r.next_action,
                "staff_id": r.staff_id,
            }
            for r in records
        ]

        # Get staff info
        staff = None
        if client.staff_id:
            staff_obj = self.db.execute(
                select(Staff).where(Staff.id == client.staff_id)
            ).scalar_one_or_none()
            if staff_obj:
                staff = {"id": staff_obj.id, "name": staff_obj.name, "role": staff_obj.role}

        return {
            "client": self._client_to_dict(client),
            "staff": staff,
            "latest_support_plan": plan_dict,
            "recent_case_records": records_list,
        }

    def _get_schedules(
        self,
        start_date: str,
        end_date: str,
        client_id: Optional[int] = None,
        schedule_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(
                hour=23, minute=59, second=59
            )
        except ValueError:
            return {"error": "日付形式が正しくありません。YYYY-MM-DD形式で入力してください。"}

        stmt = select(Schedule).where(
            and_(
                Schedule.start_datetime >= start_dt,
                Schedule.start_datetime <= end_dt,
            )
        )

        if client_id is not None:
            stmt = stmt.where(Schedule.client_id == client_id)
        if schedule_type:
            stmt = stmt.where(Schedule.schedule_type == schedule_type)

        stmt = stmt.order_by(Schedule.start_datetime)
        schedules = self.db.execute(stmt).scalars().all()

        schedules_list = []
        for s in schedules:
            # Get client name if available
            client_name = None
            if s.client_id:
                client_obj = self.db.execute(
                    select(Client).where(Client.id == s.client_id)
                ).scalar_one_or_none()
                if client_obj:
                    client_name = client_obj.name

            # Get staff name
            staff_name = None
            staff_obj = self.db.execute(
                select(Staff).where(Staff.id == s.staff_id)
            ).scalar_one_or_none()
            if staff_obj:
                staff_name = staff_obj.name

            schedules_list.append({
                "id": s.id,
                "title": s.title,
                "schedule_type": s.schedule_type,
                "start_datetime": self._format_date(s.start_datetime),
                "end_datetime": self._format_date(s.end_datetime),
                "location": s.location,
                "notes": s.notes,
                "status": s.status,
                "client_id": s.client_id,
                "client_name": client_name,
                "staff_id": s.staff_id,
                "staff_name": staff_name,
            })

        return {"schedules": schedules_list, "total": len(schedules_list)}

    def _get_case_records(
        self,
        client_id: Optional[int] = None,
        record_type: Optional[str] = None,
        limit: int = 10,
    ) -> Dict[str, Any]:
        stmt = select(CaseRecord)
        conditions = []

        if client_id is not None:
            conditions.append(CaseRecord.client_id == client_id)
        if record_type:
            conditions.append(CaseRecord.record_type == record_type)

        if conditions:
            stmt = stmt.where(and_(*conditions))

        stmt = stmt.order_by(CaseRecord.record_date.desc()).limit(limit)
        records = self.db.execute(stmt).scalars().all()

        records_list = []
        for r in records:
            client_obj = self.db.execute(
                select(Client).where(Client.id == r.client_id)
            ).scalar_one_or_none()
            staff_obj = self.db.execute(
                select(Staff).where(Staff.id == r.staff_id)
            ).scalar_one_or_none()

            records_list.append({
                "id": r.id,
                "client_id": r.client_id,
                "client_name": client_obj.name if client_obj else None,
                "staff_id": r.staff_id,
                "staff_name": staff_obj.name if staff_obj else None,
                "record_date": self._format_date(r.record_date),
                "record_type": r.record_type,
                "content": r.content,
                "summary": r.summary,
                "next_action": r.next_action,
            })

        return {"records": records_list, "total": len(records_list)}

    def _create_schedule(
        self,
        title: str,
        schedule_type: str,
        start_datetime: str,
        end_datetime: str,
        staff_id: int,
        client_id: Optional[int] = None,
        location: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            start_dt = datetime.fromisoformat(start_datetime)
            end_dt = datetime.fromisoformat(end_datetime)
        except ValueError:
            return {"error": "日時形式が正しくありません。ISO 8601形式（例：2024-01-15T10:00:00）で入力してください。"}

        schedule = Schedule(
            title=title,
            schedule_type=schedule_type,
            start_datetime=start_dt,
            end_datetime=end_dt,
            staff_id=staff_id,
            client_id=client_id,
            location=location,
            notes=notes,
            status="scheduled",
        )
        self.db.add(schedule)
        self.db.commit()
        self.db.refresh(schedule)

        return {
            "success": True,
            "message": "スケジュールを作成しました",
            "schedule": {
                "id": schedule.id,
                "title": schedule.title,
                "schedule_type": schedule.schedule_type,
                "start_datetime": self._format_date(schedule.start_datetime),
                "end_datetime": self._format_date(schedule.end_datetime),
                "location": schedule.location,
                "notes": schedule.notes,
                "status": schedule.status,
                "client_id": schedule.client_id,
                "staff_id": schedule.staff_id,
            },
        }

    def _create_case_record(
        self,
        client_id: int,
        staff_id: int,
        record_date: str,
        record_type: str,
        content: str,
        next_action: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            record_dt = datetime.fromisoformat(record_date)
        except ValueError:
            return {"error": "日時形式が正しくありません。ISO 8601形式で入力してください。"}

        record = CaseRecord(
            client_id=client_id,
            staff_id=staff_id,
            record_date=record_dt,
            record_type=record_type,
            content=content,
            next_action=next_action,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)

        return {
            "success": True,
            "message": "支援記録を作成しました",
            "record": {
                "id": record.id,
                "client_id": record.client_id,
                "staff_id": record.staff_id,
                "record_date": self._format_date(record.record_date),
                "record_type": record.record_type,
                "content": record.content,
                "next_action": record.next_action,
            },
        }

    def _get_monitoring_due_clients(self, days_ahead: int = 30) -> Dict[str, Any]:
        today = date.today()
        deadline = today + timedelta(days=days_ahead)

        # Find clients whose latest support plan has next_monitoring_date within range
        stmt = (
            select(Client, SupportPlan)
            .join(SupportPlan, SupportPlan.client_id == Client.id)
            .where(
                and_(
                    Client.status == "active",
                    SupportPlan.status == "active",
                    SupportPlan.next_monitoring_date >= today,
                    SupportPlan.next_monitoring_date <= deadline,
                )
            )
            .order_by(SupportPlan.next_monitoring_date)
        )

        results = self.db.execute(stmt).all()

        clients_list = []
        seen_client_ids = set()
        for client, plan in results:
            if client.id not in seen_client_ids:
                seen_client_ids.add(client.id)
                clients_list.append({
                    "client_id": client.id,
                    "client_name": client.name,
                    "disability_type": client.disability_type,
                    "next_monitoring_date": self._format_date(plan.next_monitoring_date),
                    "days_until_monitoring": (plan.next_monitoring_date - today).days,
                    "staff_id": client.staff_id,
                })

        return {
            "clients": clients_list,
            "total": len(clients_list),
            "days_ahead": days_ahead,
        }

    def _get_dashboard_stats(self) -> Dict[str, Any]:
        today = datetime.now().date()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())

        total_clients = self.db.execute(
            select(func.count(Client.id))
        ).scalar()

        active_clients = self.db.execute(
            select(func.count(Client.id)).where(Client.status == "active")
        ).scalar()

        schedules_today = self.db.execute(
            select(func.count(Schedule.id)).where(
                and_(
                    Schedule.start_datetime >= today_start,
                    Schedule.start_datetime <= today_end,
                    Schedule.status == "scheduled",
                )
            )
        ).scalar()

        # Monitoring due within 30 days
        deadline = today + timedelta(days=30)
        monitoring_due = self.db.execute(
            select(func.count(SupportPlan.id)).where(
                and_(
                    SupportPlan.status == "active",
                    SupportPlan.next_monitoring_date >= today,
                    SupportPlan.next_monitoring_date <= deadline,
                )
            )
        ).scalar()

        # Recent records count (last 7 days)
        week_ago = today_start - timedelta(days=7)
        recent_records = self.db.execute(
            select(func.count(CaseRecord.id)).where(
                CaseRecord.record_date >= week_ago
            )
        ).scalar()

        return {
            "total_clients": total_clients,
            "active_clients": active_clients,
            "schedules_today": schedules_today,
            "monitoring_due_soon": monitoring_due,
            "recent_records_count": recent_records,
            "as_of": today.isoformat(),
        }
