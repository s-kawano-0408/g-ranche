"""
OCR処理: Google Cloud Vision API + Gemini API（どちらもREST + GCP APIキー）

1. Google Cloud Vision で画像からテキストを抽出
2. Gemini にテキストを渡してフィールド単位のJSONに構造化

両方とも GCP_API_KEY 1つで認証。
"""

import base64
import json
import os
import logging

import httpx

from transcription.cell_mappings import EXTRACTION_PROMPTS, CELL_MAPPINGS

logger = logging.getLogger(__name__)

VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"


def _get_api_key() -> str:
    api_key = os.getenv("GCP_API_KEY")
    if not api_key:
        raise ValueError("GCP_API_KEY が .env に設定されていません")
    return api_key


def extract_text_from_image(image_bytes: bytes) -> str:
    """
    Google Cloud Vision API で画像からテキストを抽出。
    """
    api_key = _get_api_key()
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    request_body = {
        "requests": [
            {
                "image": {"content": image_b64},
                "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
                "imageContext": {"languageHints": ["ja"]},
            }
        ]
    }

    response = httpx.post(
        VISION_API_URL,
        params={"key": api_key},
        json=request_body,
        timeout=30.0,
    )

    if response.status_code != 200:
        raise RuntimeError(f"Vision API エラー ({response.status_code}): {response.text}")

    result = response.json()
    responses = result.get("responses", [])

    if not responses:
        return ""

    error = responses[0].get("error")
    if error:
        raise RuntimeError(f"Vision API エラー: {error.get('message', str(error))}")

    full_text = responses[0].get("fullTextAnnotation", {}).get("text", "")
    logger.info(f"Vision API: {len(full_text)}文字を抽出")
    return full_text


def structure_text_with_gemini(
    raw_text: str,
    sheet_name: str,
) -> list[dict[str, str]]:
    """
    Gemini API でOCRテキストをフィールド単位のJSONに構造化。
    """
    if sheet_name not in EXTRACTION_PROMPTS:
        raise ValueError(f"未対応のシート: {sheet_name}")

    api_key = _get_api_key()

    prompt = f"""{EXTRACTION_PROMPTS[sheet_name]}

以下のJSON形式で返してください。JSON以外のテキストは含めないでください。
```json
[
  {{"field_name": "フィールド名", "value": "値"}},
  ...
]
```

--- OCRテキスト ---
{raw_text}
"""

    request_body = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ]
    }

    response = httpx.post(
        GEMINI_API_URL,
        params={"key": api_key},
        json=request_body,
        timeout=60.0,
    )

    if response.status_code != 200:
        raise RuntimeError(f"Gemini API エラー ({response.status_code}): {response.text}")

    result = response.json()
    response_text = result["candidates"][0]["content"]["parts"][0]["text"].strip()

    # JSON部分を抽出（```json ... ``` で囲まれている場合を考慮）
    if "```json" in response_text:
        response_text = response_text.split("```json")[1].split("```")[0].strip()
    elif "```" in response_text:
        response_text = response_text.split("```")[1].split("```")[0].strip()

    fields = json.loads(response_text)

    # マッピングに存在するフィールドのみ返す
    valid_field_names = set(CELL_MAPPINGS.get(sheet_name, {}).keys())
    validated_fields = []
    for field in fields:
        if field["field_name"] in valid_field_names:
            validated_fields.append(field)

    # マッピングにあるがGeminiが返さなかったフィールドを空で補完
    returned_names = {f["field_name"] for f in validated_fields}
    for name in valid_field_names:
        if name not in returned_names:
            validated_fields.append({"field_name": name, "value": ""})

    return validated_fields


async def process_ocr(image_bytes: bytes, sheet_name: str) -> dict:
    """
    OCR処理のメインエントリポイント。
    """
    # 1. Google Vision でテキスト抽出
    raw_text = extract_text_from_image(image_bytes)

    # 2. Gemini で構造化
    fields = structure_text_with_gemini(raw_text, sheet_name)

    return {
        "fields": fields,
        "raw_text": raw_text,
    }
