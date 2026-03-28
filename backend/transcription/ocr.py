"""
OCR処理: Anthropic Claude API（Vision機能で画像から直接構造化）

Claude に画像を直接送り、OCR + フィールド単位JSONへの構造化を1回のリクエストで行う。
ANTHROPIC_API_KEY を使用（SDK が自動読み込み）。
"""

import base64
import json
import logging

import anthropic
from dotenv import load_dotenv

from transcription.cell_mappings import EXTRACTION_PROMPTS, CELL_MAPPINGS

load_dotenv()

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-6"


def _detect_media_type(image_bytes: bytes) -> str:
    """画像のバイト列からメディアタイプを判定する。"""
    if image_bytes[:8] == b'\x89PNG\r\n\x1a\n':
        return "image/png"
    if image_bytes[:2] == b'\xff\xd8':
        return "image/jpeg"
    if image_bytes[:4] == b'RIFF' and image_bytes[8:12] == b'WEBP':
        return "image/webp"
    if image_bytes[:3] == b'GIF':
        return "image/gif"
    # デフォルトはJPEG（福祉書類のスキャンで最も一般的）
    return "image/jpeg"


def process_with_claude(
    image_bytes: bytes,
    sheet_name: str,
) -> list[dict[str, str]]:
    """
    Claude Vision API で画像からフィールド単位のJSONを直接抽出・構造化する。
    """
    if sheet_name not in EXTRACTION_PROMPTS:
        raise ValueError(f"未対応のシート: {sheet_name}")

    client = anthropic.Anthropic()
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    media_type = _detect_media_type(image_bytes)

    prompt = f"""{EXTRACTION_PROMPTS[sheet_name]}

以下のJSON形式で返してください。JSON以外のテキストは含めないでください。
```json
[
  {{"field_name": "フィールド名", "value": "値"}},
  ...
]
```"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": prompt,
                    },
                ],
            }
        ],
    )

    response_text = response.content[0].text.strip()

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

    # マッピングにあるがClaudeが返さなかったフィールドを空で補完
    returned_names = {f["field_name"] for f in validated_fields}
    for name in valid_field_names:
        if name not in returned_names:
            validated_fields.append({"field_name": name, "value": ""})

    logger.info(f"Claude Vision: {len(validated_fields)}フィールドを抽出 (シート: {sheet_name})")
    return validated_fields


async def process_ocr(image_bytes: bytes, sheet_name: str) -> dict:
    """
    OCR処理のメインエントリポイント。
    """
    fields = process_with_claude(image_bytes, sheet_name)

    return {
        "fields": fields,
    }
