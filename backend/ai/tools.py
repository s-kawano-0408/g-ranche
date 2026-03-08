from typing import List, Dict, Any


def get_tools() -> List[Dict[str, Any]]:
    """Define all tools available to Claude for welfare support operations."""
    return [
        {
            "name": "search_clients",
            "description": "利用者を名前、障害種別、状態で検索します。複数の条件を組み合わせて検索できます。",
            "input_schema": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "利用者の名前（部分一致で検索）",
                    },
                    "disability_type": {
                        "type": "string",
                        "description": "障害種別。例：'身体障害'、'知的障害'、'精神障害'、'発達障害'、'難病'",
                    },
                    "status": {
                        "type": "string",
                        "description": "利用者の状態。'active'（活動中）または'inactive'（非活動）",
                        "default": "active",
                    },
                },
                "required": [],
            },
        },
        {
            "name": "get_client_detail",
            "description": "指定した利用者の詳細情報を取得します。最新の支援計画と直近5件の支援記録も含まれます。",
            "input_schema": {
                "type": "object",
                "properties": {
                    "client_id": {
                        "type": "integer",
                        "description": "利用者のID",
                    },
                },
                "required": ["client_id"],
            },
        },
        {
            "name": "get_schedules",
            "description": "指定した日付範囲のスケジュール一覧を取得します。利用者やスケジュール種別でフィルタリングもできます。",
            "input_schema": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "開始日（YYYY-MM-DD形式）",
                    },
                    "end_date": {
                        "type": "string",
                        "description": "終了日（YYYY-MM-DD形式）",
                    },
                    "client_id": {
                        "type": "integer",
                        "description": "利用者IDでフィルタリング（任意）",
                    },
                    "schedule_type": {
                        "type": "string",
                        "description": "スケジュール種別でフィルタリング。例：'面談'、'訪問'、'モニタリング'、'会議'（任意）",
                    },
                },
                "required": ["start_date", "end_date"],
            },
        },
        {
            "name": "get_case_records",
            "description": "支援記録の一覧を取得します。利用者ID、記録種別でフィルタリングできます。",
            "input_schema": {
                "type": "object",
                "properties": {
                    "client_id": {
                        "type": "integer",
                        "description": "利用者IDでフィルタリング（任意）",
                    },
                    "record_type": {
                        "type": "string",
                        "description": "記録種別。例：'面談'、'訪問'、'電話'、'モニタリング'（任意）",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "取得件数の上限（デフォルト：10）",
                        "default": 10,
                    },
                },
                "required": [],
            },
        },
        {
            "name": "create_schedule",
            "description": "新しいスケジュールを作成します。",
            "input_schema": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "スケジュールのタイトル",
                    },
                    "schedule_type": {
                        "type": "string",
                        "description": "スケジュール種別。'面談'、'訪問'、'モニタリング'、'会議'、'その他'のいずれか",
                    },
                    "start_datetime": {
                        "type": "string",
                        "description": "開始日時（ISO 8601形式、例：2024-01-15T10:00:00）",
                    },
                    "end_datetime": {
                        "type": "string",
                        "description": "終了日時（ISO 8601形式、例：2024-01-15T11:00:00）",
                    },
                    "client_id": {
                        "type": "integer",
                        "description": "関連する利用者のID（任意）",
                    },
                    "staff_id": {
                        "type": "integer",
                        "description": "担当スタッフのID",
                    },
                    "location": {
                        "type": "string",
                        "description": "場所（任意）",
                    },
                    "notes": {
                        "type": "string",
                        "description": "備考（任意）",
                    },
                },
                "required": ["title", "schedule_type", "start_datetime", "end_datetime", "staff_id"],
            },
        },
        {
            "name": "create_case_record",
            "description": "新しい支援記録を作成します。",
            "input_schema": {
                "type": "object",
                "properties": {
                    "client_id": {
                        "type": "integer",
                        "description": "利用者のID",
                    },
                    "staff_id": {
                        "type": "integer",
                        "description": "担当スタッフのID",
                    },
                    "record_date": {
                        "type": "string",
                        "description": "記録日時（ISO 8601形式）",
                    },
                    "record_type": {
                        "type": "string",
                        "description": "記録種別。'面談'、'訪問'、'電話'、'モニタリング'、'サービス担当者会議'、'その他'のいずれか",
                    },
                    "content": {
                        "type": "string",
                        "description": "支援記録の内容",
                    },
                    "next_action": {
                        "type": "string",
                        "description": "次回の対応方針（任意）",
                    },
                },
                "required": ["client_id", "staff_id", "record_date", "record_type", "content"],
            },
        },
        {
            "name": "get_monitoring_due_clients",
            "description": "モニタリング期日が近い利用者の一覧を取得します。",
            "input_schema": {
                "type": "object",
                "properties": {
                    "days_ahead": {
                        "type": "integer",
                        "description": "何日以内にモニタリング期日が来る利用者を検索するか（デフォルト：30日）",
                        "default": 30,
                    },
                },
                "required": [],
            },
        },
        {
            "name": "get_dashboard_stats",
            "description": "ダッシュボードの統計情報を取得します。利用者数、本日のスケジュール、モニタリング期日など。",
            "input_schema": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    ]
