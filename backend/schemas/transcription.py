from pydantic import BaseModel


class ExtractedField(BaseModel):
    """OCRで抽出された1つのフィールド"""
    field_name: str
    value: str


class OCRResponse(BaseModel):
    """OCR結果のレスポンス"""
    fields: list[ExtractedField]


class GenerateRequest(BaseModel):
    """Excel生成リクエスト"""
    sheet_name: str
    fields: list[ExtractedField]
