"""
Excel転記 API エンドポイント

POST /api/transcription/ocr      — 画像を受け取りOCR→構造化JSONを返す
POST /api/transcription/generate — フィールド値を受け取りExcelファイルを返す
"""

import logging

from urllib.parse import quote

from fastapi import APIRouter, File, Form, UploadFile, Depends, HTTPException
from fastapi.responses import Response

from auth import get_current_user
from schemas.transcription import GenerateRequest, OCRResponse
from transcription.ocr import process_ocr
from transcription.excel_writer import write_to_template
from transcription.cell_mappings import SUPPORTED_SHEETS

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/ocr", response_model=OCRResponse)
async def ocr_image(
    image: UploadFile = File(...),
    sheet_name: str = Form(...),
    _user=Depends(get_current_user),
):
    """
    画像をOCRで読み取り、構造化されたフィールドデータを返す。

    - image: アップロードされた画像ファイル（JPEG/PNG）
    - sheet_name: 転記先のシート名
    """
    if sheet_name not in SUPPORTED_SHEETS:
        raise HTTPException(
            status_code=400,
            detail=f"未対応のシートです。対応シート: {SUPPORTED_SHEETS}",
        )

    # 画像サイズチェック（10MB以下）
    content = await image.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="画像サイズは10MB以下にしてください")

    try:
        result = await process_ocr(content, sheet_name)
        return OCRResponse(
            fields=result["fields"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"OCR処理エラー: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"OCR処理中にエラーが発生しました: {str(e)}")


@router.post("/generate")
async def generate_excel(
    request: GenerateRequest,
    _user=Depends(get_current_user),
):
    """
    フィールドデータからExcelファイルを生成してダウンロード。

    - sheet_name: 書き込み先のシート名
    - fields: [{field_name, value}, ...]
    """
    if request.sheet_name not in SUPPORTED_SHEETS:
        raise HTTPException(
            status_code=400,
            detail=f"未対応のシートです。対応シート: {SUPPORTED_SHEETS}",
        )

    try:
        excel_bytes = write_to_template(
            sheet_name=request.sheet_name,
            fields=[f.model_dump() for f in request.fields],
        )

        filename = f"{request.sheet_name}_転記済み.xlsx"
        encoded_filename = quote(filename)
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
            },
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Excel生成エラー: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Excel生成中にエラーが発生しました: {str(e)}")
