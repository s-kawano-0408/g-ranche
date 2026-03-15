"""
仮名化マイグレーションスクリプト

既存DBの個人情報をJSONファイルに退避し、DBからは削除してハッシュのみ保存する。
実行: cd backend && ~/.local/bin/uv run python migrate_pseudonym.py
"""
import json
import sqlite3
from pseudonym import generate_hash

DB_PATH = "g_ranche.db"
OUTPUT_JSON = "pseudonym_mapping.json"


def migrate():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 1. 既存の全クライアントを読み取る（旧構造）
    cursor.execute("SELECT * FROM clients")
    rows = cursor.fetchall()

    if not rows:
        print("クライアントデータがありません。マイグレーション不要です。")
        conn.close()
        return

    print(f"既存クライアント: {len(rows)}名")

    # 2. 各クライアントのハッシュを生成し、マッピングを作成
    mapping = {}
    clients_new = []

    for row in rows:
        pseudonym_hash = generate_hash(
            row["certificate_number"],
            str(row["birth_date"]),
        )

        # JSONマッピング（ブラウザ用）
        mapping[pseudonym_hash] = {
            "family_name": row["family_name"],
            "given_name": row["given_name"],
            "family_name_kana": row["family_name_kana"],
            "given_name_kana": row["given_name_kana"],
            "birth_date": str(row["birth_date"]),
            "certificate_number": row["certificate_number"],
        }

        # 新構造のデータ
        clients_new.append({
            "id": row["id"],
            "pseudonym_hash": pseudonym_hash,
            "gender": row["gender"],
            "client_type": row["client_type"],
            "staff_id": row["staff_id"],
            "status": row["status"],
            "notes": row["notes"],
            "end_date": row["end_date"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        })

    # 3. 個人情報をJSONファイルに出力
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)
    print(f"マッピングファイル出力: {OUTPUT_JSON}（{len(mapping)}名分）")

    # 4. テーブルを新構造で再作成
    # 外部キー制約を持つテーブルのデータを退避
    cursor.execute("SELECT * FROM support_plans")
    plans = [dict(r) for r in cursor.fetchall()]
    cursor.execute("SELECT * FROM case_records")
    records = [dict(r) for r in cursor.fetchall()]
    cursor.execute("SELECT * FROM schedules")
    schedules = [dict(r) for r in cursor.fetchall()]

    # clientsテーブルを再作成
    cursor.execute("DROP TABLE IF EXISTS schedules")
    cursor.execute("DROP TABLE IF EXISTS case_records")
    cursor.execute("DROP TABLE IF EXISTS support_plans")
    cursor.execute("DROP TABLE IF EXISTS clients")

    cursor.execute("""
        CREATE TABLE clients (
            id INTEGER PRIMARY KEY,
            pseudonym_hash VARCHAR UNIQUE NOT NULL,
            gender VARCHAR,
            client_type VARCHAR NOT NULL,
            staff_id INTEGER REFERENCES staffs(id),
            status VARCHAR DEFAULT 'active',
            notes TEXT,
            end_date DATE,
            created_at DATETIME,
            updated_at DATETIME
        )
    """)

    # 新しいデータを挿入
    for c in clients_new:
        cursor.execute(
            """INSERT INTO clients
            (id, pseudonym_hash, gender, client_type, staff_id, status, notes, end_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (c["id"], c["pseudonym_hash"], c["gender"], c["client_type"],
             c["staff_id"], c["status"], c["notes"], c["end_date"],
             c["created_at"], c["updated_at"]),
        )

    # 関連テーブルを再作成して復元
    cursor.execute("""
        CREATE TABLE support_plans (
            id INTEGER PRIMARY KEY,
            client_id INTEGER NOT NULL REFERENCES clients(id),
            plan_date DATE,
            long_term_goal TEXT,
            short_term_goal TEXT,
            service_contents JSON,
            monitoring_interval INTEGER,
            next_monitoring_date DATE,
            status VARCHAR DEFAULT 'active',
            created_at DATETIME,
            updated_at DATETIME
        )
    """)
    for p in plans:
        cursor.execute(
            """INSERT INTO support_plans
            (id, client_id, plan_date, long_term_goal, short_term_goal, service_contents,
             monitoring_interval, next_monitoring_date, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (p["id"], p["client_id"], p["plan_date"], p["long_term_goal"],
             p["short_term_goal"], p["service_contents"], p["monitoring_interval"],
             p["next_monitoring_date"], p["status"], p.get("created_at"), p.get("updated_at")),
        )

    cursor.execute("""
        CREATE TABLE case_records (
            id INTEGER PRIMARY KEY,
            client_id INTEGER NOT NULL REFERENCES clients(id),
            staff_id INTEGER REFERENCES staffs(id),
            record_date DATETIME,
            record_type VARCHAR,
            content TEXT,
            summary TEXT,
            next_action TEXT,
            created_at DATETIME,
            updated_at DATETIME
        )
    """)
    for r in records:
        cursor.execute(
            """INSERT INTO case_records
            (id, client_id, staff_id, record_date, record_type, content, summary, next_action, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (r["id"], r["client_id"], r["staff_id"], r["record_date"],
             r["record_type"], r["content"], r["summary"], r["next_action"],
             r.get("created_at"), r.get("updated_at")),
        )

    cursor.execute("""
        CREATE TABLE schedules (
            id INTEGER PRIMARY KEY,
            client_id INTEGER REFERENCES clients(id),
            staff_id INTEGER NOT NULL REFERENCES staffs(id),
            title VARCHAR,
            schedule_type VARCHAR,
            start_datetime DATETIME,
            end_datetime DATETIME,
            location VARCHAR,
            notes TEXT,
            status VARCHAR DEFAULT 'scheduled',
            created_at DATETIME,
            updated_at DATETIME
        )
    """)
    for s in schedules:
        cursor.execute(
            """INSERT INTO schedules
            (id, client_id, staff_id, title, schedule_type, start_datetime, end_datetime,
             location, notes, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (s["id"], s["client_id"], s["staff_id"], s["title"],
             s["schedule_type"], s["start_datetime"], s["end_datetime"],
             s["location"], s["notes"], s["status"],
             s.get("created_at"), s.get("updated_at")),
        )

    conn.commit()
    conn.close()

    print("\n=== マイグレーション完了 ===")
    print(f"クライアント: {len(clients_new)}名（ハッシュ化済み）")
    print(f"支援計画: {len(plans)}件（復元済み）")
    print(f"支援記録: {len(records)}件（復元済み）")
    print(f"スケジュール: {len(schedules)}件（復元済み）")
    print(f"\n★ {OUTPUT_JSON} を安全な場所に保管してください！")
    print("  このファイルがないと利用者名を復元できません。")


if __name__ == "__main__":
    migrate()
