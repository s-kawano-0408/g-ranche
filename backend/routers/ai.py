import json
import uuid
from typing import AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select

from database import get_db
from models.ai_conversation import AIConversation
from models.client import Client
from models.case_record import CaseRecord
from models.support_plan import SupportPlan
from schemas.ai_conversation import (
    ChatRequest,
    GeneratePlanRequest,
    SummarizeRecordRequest,
    GenerateReportRequest,
)
from ai.client import AIClient
from ai.tool_executor import ToolExecutor

router = APIRouter()


def get_ai_client() -> AIClient:
    """Create and return an AI client instance."""
    return AIClient()


async def sse_event(data: dict) -> str:
    """Format a dictionary as an SSE event string."""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/chat")
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
):
    """
    SSE streaming chat endpoint with Tool Use support.

    Accepts session_id, message, and optional client_id context.
    Streams response as Server-Sent Events with event types:
    - text: streaming text content
    - tool_call_start: tool call beginning
    - tool_call: tool being executed
    - tool_result: tool execution result
    - done: conversation complete
    """
    # Load or create conversation
    conversation = db.execute(
        select(AIConversation).where(AIConversation.session_id == request.session_id)
    ).scalar_one_or_none()

    if not conversation:
        conversation = AIConversation(
            session_id=request.session_id,
            messages=[],
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Build user message, optionally including client context
    user_message_content = request.message
    if request.client_id:
        client = db.execute(
            select(Client).where(Client.id == request.client_id)
        ).scalar_one_or_none()
        if client:
            user_message_content = (
                f"[現在参照中の利用者: {client.name}（ID: {client.id}）]\n\n"
                + request.message
            )

    # Build messages list with conversation history
    current_messages = list(conversation.messages or [])
    current_messages.append({"role": "user", "content": user_message_content})

    async def generate() -> AsyncGenerator[str, None]:
        try:
            ai_client = get_ai_client()
            tool_executor = ToolExecutor(db)

            async for event in ai_client.stream_chat(current_messages, tool_executor):
                yield await sse_event(event)

            # Save updated conversation history
            final_messages = ai_client.get_last_messages()

            # Reload conversation to avoid stale state
            conv = db.execute(
                select(AIConversation).where(
                    AIConversation.session_id == request.session_id
                )
            ).scalar_one_or_none()
            if conv:
                conv.messages = final_messages
                db.commit()

        except Exception as e:
            yield await sse_event({"type": "error", "message": str(e)})
            yield await sse_event({"type": "done"})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/generate-plan")
async def generate_plan(
    request: GeneratePlanRequest,
    db: Session = Depends(get_db),
):
    """
    Generate a support plan document for a client using AI.
    Returns a complete サービス等利用計画書 in Markdown format.
    """
    # Get client info
    client = db.execute(
        select(Client).where(Client.id == request.client_id)
    ).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="利用者が見つかりません")

    # Build client info dict
    client_info = {
        "id": client.id,
        "name": client.name,
        "name_kana": client.name_kana,
        "birth_date": client.birth_date.isoformat() if client.birth_date else None,
        "gender": client.gender,
        "disability_type": client.disability_type,
        "disability_certificate_level": client.disability_certificate_level,
        "address": client.address,
        "intake_date": client.intake_date.isoformat() if client.intake_date else None,
        "notes": client.notes,
    }

    # Get latest support plan if exists
    existing_plan = db.execute(
        select(SupportPlan)
        .where(SupportPlan.client_id == request.client_id)
        .order_by(SupportPlan.plan_date.desc())
        .limit(1)
    ).scalar_one_or_none()

    if existing_plan:
        client_info["previous_plan"] = {
            "plan_date": existing_plan.plan_date.isoformat() if existing_plan.plan_date else None,
            "long_term_goal": existing_plan.long_term_goal,
            "short_term_goal": existing_plan.short_term_goal,
            "service_contents": existing_plan.service_contents,
        }

    try:
        ai_client = get_ai_client()
        plan_text = ai_client.generate_plan(client_info, request.additional_info)
        return {"plan": plan_text, "client_id": request.client_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"支援計画の生成に失敗しました: {str(e)}")


@router.post("/summarize-record")
async def summarize_record(
    request: SummarizeRecordRequest,
    db: Session = Depends(get_db),
):
    """
    Summarize a case record using AI.
    If content is provided, summarizes that directly.
    Otherwise loads the record from DB by record_id.
    """
    content_to_summarize = request.content

    if not content_to_summarize:
        # Load from DB
        record = db.execute(
            select(CaseRecord).where(CaseRecord.id == request.record_id)
        ).scalar_one_or_none()
        if not record:
            raise HTTPException(status_code=404, detail="支援記録が見つかりません")
        content_to_summarize = record.content

    if not content_to_summarize:
        raise HTTPException(status_code=400, detail="要約する内容がありません")

    try:
        ai_client = get_ai_client()
        summary = ai_client.summarize_record(content_to_summarize)

        # Update the record's summary field if we loaded from DB
        if not request.content and request.record_id:
            record = db.execute(
                select(CaseRecord).where(CaseRecord.id == request.record_id)
            ).scalar_one_or_none()
            if record:
                record.summary = summary
                db.commit()

        return {"summary": summary, "record_id": request.record_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"要約の生成に失敗しました: {str(e)}")


@router.post("/generate-report")
async def generate_report(
    request: GenerateReportRequest,
    db: Session = Depends(get_db),
):
    """
    Generate a monitoring report for a client using AI.
    Returns a complete モニタリング報告書 in Markdown format.
    """
    # Get client info
    client = db.execute(
        select(Client).where(Client.id == request.client_id)
    ).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="利用者が見つかりません")

    client_info = {
        "id": client.id,
        "name": client.name,
        "disability_type": client.disability_type,
        "disability_certificate_level": client.disability_certificate_level,
        "gender": client.gender,
        "notes": client.notes,
    }

    # Get latest support plan
    plan = db.execute(
        select(SupportPlan)
        .where(SupportPlan.client_id == request.client_id)
        .order_by(SupportPlan.plan_date.desc())
        .limit(1)
    ).scalar_one_or_none()

    plan_info = None
    if plan:
        plan_info = {
            "plan_date": plan.plan_date.isoformat() if plan.plan_date else None,
            "long_term_goal": plan.long_term_goal,
            "short_term_goal": plan.short_term_goal,
            "service_contents": plan.service_contents,
            "monitoring_interval": plan.monitoring_interval,
            "next_monitoring_date": plan.next_monitoring_date.isoformat() if plan.next_monitoring_date else None,
        }

    # Get case records for the period
    stmt = select(CaseRecord).where(CaseRecord.client_id == request.client_id)
    if request.period_start:
        from datetime import datetime
        try:
            period_start_dt = datetime.strptime(request.period_start, "%Y-%m-%d")
            stmt = stmt.where(CaseRecord.record_date >= period_start_dt)
        except ValueError:
            pass
    if request.period_end:
        from datetime import datetime
        try:
            period_end_dt = datetime.strptime(request.period_end, "%Y-%m-%d")
            stmt = stmt.where(CaseRecord.record_date <= period_end_dt)
        except ValueError:
            pass

    stmt = stmt.order_by(CaseRecord.record_date.desc()).limit(20)
    records = db.execute(stmt).scalars().all()

    records_list = [
        {
            "record_date": r.record_date.isoformat() if r.record_date else None,
            "record_type": r.record_type,
            "content": r.content,
            "summary": r.summary,
            "next_action": r.next_action,
        }
        for r in records
    ]

    try:
        ai_client = get_ai_client()
        report = ai_client.generate_report(
            client_info=client_info,
            records=records_list,
            plan_info=plan_info,
            period_start=request.period_start,
            period_end=request.period_end,
            additional_notes=request.additional_notes,
        )
        return {"report": report, "client_id": request.client_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"報告書の生成に失敗しました: {str(e)}")
