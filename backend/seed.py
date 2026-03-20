"""
Seed script to populate the database with sample data.
Run with: python seed.py
"""
import json
import random
from datetime import datetime, date, timedelta

from database import SessionLocal, engine, Base
import models  # noqa: F401 - ensure all models are registered

from models.staff import Staff
from models.client import Client
from models.support_plan import SupportPlan
from models.case_record import CaseRecord
from models.schedule import Schedule
from models.monthly_task import MonthlyTask
from models.user import User
from auth import hash_password
from pseudonym import generate_hash


# ── 名前データ ──────────────────────────────────────────────
FAMILY_NAMES = [
    ("佐藤", "サトウ"), ("鈴木", "スズキ"), ("高橋", "タカハシ"), ("田中", "タナカ"),
    ("伊藤", "イトウ"), ("渡辺", "ワタナベ"), ("山本", "ヤマモト"), ("中村", "ナカムラ"),
    ("小林", "コバヤシ"), ("加藤", "カトウ"), ("吉田", "ヨシダ"), ("山田", "ヤマダ"),
    ("佐々木", "ササキ"), ("松本", "マツモト"), ("井上", "イノウエ"), ("木村", "キムラ"),
    ("林", "ハヤシ"), ("斎藤", "サイトウ"), ("清水", "シミズ"), ("山崎", "ヤマザキ"),
    ("森", "モリ"), ("池田", "イケダ"), ("橋本", "ハシモト"), ("阿部", "アベ"),
    ("石川", "イシカワ"), ("山下", "ヤマシタ"), ("中島", "ナカジマ"), ("石井", "イシイ"),
    ("小川", "オガワ"), ("前田", "マエダ"), ("岡田", "オカダ"), ("長谷川", "ハセガワ"),
    ("藤田", "フジタ"), ("後藤", "ゴトウ"), ("近藤", "コンドウ"), ("村上", "ムラカミ"),
    ("遠藤", "エンドウ"), ("青木", "アオキ"), ("坂本", "サカモト"), ("藤井", "フジイ"),
]

GIVEN_NAMES_MALE = [
    ("太郎", "タロウ"), ("一郎", "イチロウ"), ("健太", "ケンタ"), ("大輔", "ダイスケ"),
    ("翔太", "ショウタ"), ("拓也", "タクヤ"), ("直樹", "ナオキ"), ("雄介", "ユウスケ"),
    ("隆", "タカシ"), ("誠", "マコト"), ("浩二", "コウジ"), ("和也", "カズヤ"),
    ("達也", "タツヤ"), ("修", "オサム"), ("剛", "ツヨシ"), ("亮", "リョウ"),
    ("悠太", "ユウタ"), ("蓮", "レン"), ("大地", "ダイチ"), ("颯太", "ソウタ"),
    ("陸", "リク"), ("樹", "イツキ"), ("優斗", "ユウト"), ("湊", "ミナト"),
    ("春樹", "ハルキ"), ("結翔", "ユイト"), ("朝陽", "アサヒ"), ("悠真", "ユウマ"),
]

GIVEN_NAMES_FEMALE = [
    ("花子", "ハナコ"), ("美咲", "ミサキ"), ("さくら", "サクラ"), ("愛", "アイ"),
    ("由美", "ユミ"), ("恵", "メグミ"), ("真由美", "マユミ"), ("裕子", "ユウコ"),
    ("明美", "アケミ"), ("京子", "キョウコ"), ("陽子", "ヨウコ"), ("千恵", "チエ"),
    ("結衣", "ユイ"), ("美優", "ミユ"), ("葵", "アオイ"), ("凛", "リン"),
    ("楓", "カエデ"), ("ひまり", "ヒマリ"), ("芽依", "メイ"), ("心春", "コハル"),
    ("紬", "ツムギ"), ("莉子", "リコ"), ("杏", "アン"), ("彩花", "アヤカ"),
]

NOTES_ADULT = [
    "就労継続支援B型利用中。作業意欲が高い。",
    "グループホーム入居中。生活は安定している。",
    "精神科デイケア週2回利用。服薬管理支援が必要。",
    "居宅介護利用中。入浴・排泄支援が中心。",
    "就労継続支援A型で事務作業に従事。",
    "生活介護事業所に通所。日中活動支援を受けている。",
    "自立訓練（生活訓練）利用中。一人暮らしを目指している。",
    "就労移行支援で訓練中。一般就労を目指している。",
    "訪問看護と居宅介護を併用。体調管理が課題。",
    "同行援護を利用。外出時の支援が必要。",
    "行動援護を利用。パニック時の対応が重要。",
    "短期入所を月2回利用。家族のレスパイト目的。",
    "共同生活援助利用。他の入居者との関係良好。",
    "地域活動支援センター週3回利用。交流の場として活用。",
    "計画相談支援のみ。在宅で安定した生活を送っている。",
]

NOTES_CHILD = [
    "放課後等デイサービス週3回利用。学習支援が中心。",
    "児童発達支援利用中。言語発達の遅れあり。",
    "放課後等デイサービスで運動療育を実施。",
    "保育所等訪問支援を利用。園との連携が重要。",
    "居宅訪問型児童発達支援を利用。外出困難。",
    "放課後等デイサービス週5回利用。社会性の向上が目標。",
    "児童発達支援で感覚統合療法を受けている。",
    "特別支援学校に在籍。放デイで宿題支援。",
    "医療的ケアが必要。訪問看護と併用。",
    "ASD診断あり。コミュニケーション支援が必要。",
]

SCHEDULE_TYPES = ["面談", "訪問", "モニタリング", "電話", "会議", "その他"]
SCHEDULE_TYPE_WEIGHTS = [30, 25, 15, 20, 8, 2]

LOCATIONS = [
    "事務所", "ご自宅", "相談支援センターみらい", "市役所 福祉課",
    "就労支援事業所", "デイサービスほほえみ", "GHにじ", "オンライン",
    "病院 外来", "学校", "保健センター", "児童発達支援センター",
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Clear existing data in reverse dependency order
        db.query(MonthlyTask).delete()
        db.query(Schedule).delete()
        db.query(CaseRecord).delete()
        db.query(SupportPlan).delete()
        db.query(Client).delete()
        db.query(Staff).delete()
        db.query(User).delete()
        db.commit()

        # ── Users ──────────────────────────────────────────────────
        user_admin = User(
            email="admin@g-ranche.jp",
            password_hash=hash_password("admin123"),
            name="管理者",
            role="admin",
        )
        user_staff1 = User(
            email="staff1@g-ranche.jp",
            password_hash=hash_password("staff123"),
            name="スタッフ1",
            role="staff",
        )
        user_staff2 = User(
            email="staff2@g-ranche.jp",
            password_hash=hash_password("staff123"),
            name="スタッフ2",
            role="staff",
        )
        db.add_all([user_admin, user_staff1, user_staff2])
        db.commit()
        print("ユーザー登録完了: 3名")

        # ── Staff ──────────────────────────────────────────────────
        staff1 = Staff(
            name="田中 花子",
            email="tanaka.hanako@welfare.example.jp",
            phone="03-1234-5678",
            role="相談支援専門員",
        )
        staff2 = Staff(
            name="鈴木 一郎",
            email="suzuki.ichiro@welfare.example.jp",
            phone="03-9876-5432",
            role="主任相談支援専門員",
        )
        db.add_all([staff1, staff2])
        db.commit()
        db.refresh(staff1)
        db.refresh(staff2)
        staff_ids = [staff1.id, staff2.id]
        print(f"スタッフ登録完了: {staff1.name}, {staff2.name}")

        # ── Clients（200名）─────────────────────────────────────────
        today = date.today()
        random.seed(42)  # 再現性のため固定シード

        personal_data_list = []
        used_names = set()

        for i in range(200):
            # ユニークな名前を生成
            while True:
                family = random.choice(FAMILY_NAMES)
                gender = random.choice(["男性", "女性"])
                if gender == "男性":
                    given = random.choice(GIVEN_NAMES_MALE)
                else:
                    given = random.choice(GIVEN_NAMES_FEMALE)
                full_name = f"{family[0]}{given[0]}"
                if full_name not in used_names:
                    used_names.add(full_name)
                    break

            # 児/者 の割合: 約30%が児
            client_type = "児" if random.random() < 0.3 else "者"

            # 生年月日: 者は1950-2005, 児は2008-2022
            if client_type == "者":
                birth_year = random.randint(1950, 2005)
            else:
                birth_year = random.randint(2008, 2022)
            birth_month = random.randint(1, 12)
            birth_day = random.randint(1, 28)
            birth_date = f"{birth_year}-{birth_month:02d}-{birth_day:02d}"

            cert_number = f"131100{i + 1:04d}"

            # ステータス: 90%がactive, 10%がinactive
            status = "active" if random.random() < 0.9 else "inactive"

            notes = random.choice(NOTES_CHILD if client_type == "児" else NOTES_ADULT)

            personal_data_list.append({
                "family_name": family[0], "given_name": given[0],
                "family_name_kana": family[1], "given_name_kana": given[1],
                "birth_date": birth_date, "certificate_number": cert_number,
                "gender": gender, "client_type": client_type,
                "staff_id": random.choice(staff_ids), "status": status,
                "notes": notes,
            })

        # ハッシュ生成してDBに保存
        pseudonym_mapping = {}
        clients_list = []

        for pd in personal_data_list:
            h = generate_hash(pd["certificate_number"], pd["birth_date"])
            pseudonym_mapping[h] = {
                "family_name": pd["family_name"],
                "given_name": pd["given_name"],
                "family_name_kana": pd["family_name_kana"],
                "given_name_kana": pd["given_name_kana"],
                "birth_date": pd["birth_date"],
                "certificate_number": pd["certificate_number"],
            }
            end_date = None
            if pd["status"] == "inactive":
                end_date = today - timedelta(days=random.randint(30, 365))
            client = Client(
                pseudonym_hash=h,
                gender=pd["gender"],
                client_type=pd["client_type"],
                staff_id=pd["staff_id"],
                status=pd["status"],
                notes=pd["notes"],
                end_date=end_date,
            )
            clients_list.append(client)

        db.add_all(clients_list)
        db.commit()
        for c in clients_list:
            db.refresh(c)

        # JSONマッピングファイル出力
        with open("seed_pseudonym_mapping.json", "w", encoding="utf-8") as f:
            json.dump(pseudonym_mapping, f, ensure_ascii=False, indent=2)

        active_clients = [c for c in clients_list if c.status == "active"]
        print(f"利用者登録完了: {len(clients_list)}名（active: {len(active_clients)}名）")
        print(f"マッピングファイル出力: seed_pseudonym_mapping.json（{len(pseudonym_mapping)}名分）")

        # ── Support Plans（activeな利用者全員に1件ずつ）──────────────
        services_pool = [
            {"service": "就労継続支援B型", "provider": "ワークショップひまわり", "frequency": "週4日"},
            {"service": "就労継続支援A型", "provider": "農園フレンズ", "frequency": "週5日"},
            {"service": "就労移行支援", "provider": "ジョブスタート東京", "frequency": "週4日"},
            {"service": "生活介護", "provider": "デイセンターゆう", "frequency": "週5日"},
            {"service": "居宅介護（身体介護）", "provider": "ヘルパーステーション", "frequency": "週3回"},
            {"service": "居宅介護（生活援助）", "provider": "ケアサポートやまて", "frequency": "週2回"},
            {"service": "精神科デイケア", "provider": "メンタルクリニックさくら", "frequency": "週2日"},
            {"service": "共同生活援助", "provider": "GHにじ", "frequency": "常時"},
            {"service": "放課後等デイサービス", "provider": "キッズスマイル", "frequency": "週3日"},
            {"service": "児童発達支援", "provider": "こどもサポート", "frequency": "週2日"},
            {"service": "訪問看護", "provider": "訪問看護ステーション", "frequency": "週1回"},
            {"service": "計画相談支援", "provider": "相談支援センターみらい", "frequency": "月1回"},
        ]

        plans = []
        for c in active_clients:
            plan_date = today - timedelta(days=random.randint(30, 365))
            monitoring_interval = random.choice([3, 6])
            next_monitoring = today + timedelta(days=random.randint(1, 180))
            selected_services = random.sample(services_pool, k=random.randint(2, 4))
            plan = SupportPlan(
                client_id=c.id,
                plan_date=plan_date,
                long_term_goal="地域で安定した生活を送り、自分らしく社会参加できる。",
                short_term_goal="現在のサービスを継続しながら、生活の質を向上させる。",
                service_contents=selected_services,
                monitoring_interval=monitoring_interval,
                next_monitoring_date=next_monitoring,
                status="active",
            )
            plans.append(plan)
        db.add_all(plans)
        db.commit()
        print(f"支援計画登録完了: {len(plans)}件")

        # ── Case Records（activeな利用者にランダムで1〜3件ずつ）───────
        record_types = ["面談", "訪問", "電話", "モニタリング"]
        record_contents = [
            "サービス利用状況を確認。本人の体調は安定しており、現在の支援内容に満足しているとのこと。",
            "ご自宅を訪問し生活状況を確認。室内は整理されており、日常生活に大きな問題はない様子。",
            "電話にて近況確認。特に変わりなく、通所も継続できているとのこと。",
            "モニタリングを実施。目標の達成状況を確認し、今後の方針について話し合った。",
            "担当者会議に向けた事前ヒアリングを実施。ご本人の希望を改めて確認した。",
            "体調不良による欠席が続いているため状況確認。主治医への受診を勧めた。",
            "家族から相談あり。今後のサービス利用について一緒に検討した。",
        ]

        records = []
        now = datetime.now()
        for c in active_clients:
            num_records = random.randint(1, 3)
            for _ in range(num_records):
                days_ago = random.randint(1, 90)
                record = CaseRecord(
                    client_id=c.id,
                    staff_id=c.staff_id,
                    record_date=now - timedelta(days=days_ago),
                    record_type=random.choice(record_types),
                    content=random.choice(record_contents),
                    summary="状況確認済み。特記事項なし。",
                    next_action="次回定期連絡にて状況確認を行う。",
                )
                records.append(record)
        db.add_all(records)
        db.commit()
        print(f"支援記録登録完了: {len(records)}件")

        # ── Schedules（今月を中心に、前後1ヶ月分）──────────────────
        today_dt = datetime.combine(today, datetime.min.time())
        schedule_titles_by_type = {
            "面談": ["{name} 定期面談", "{name} 相談", "{name} 支援計画説明"],
            "訪問": ["{name} 自宅訪問", "{name} 生活状況確認訪問"],
            "モニタリング": ["{name} モニタリング", "{name} 定期モニタリング"],
            "電話": ["{name} 近況確認電話", "{name} 体調確認電話", "{name} 連絡"],
            "会議": ["サービス担当者会議", "ケース会議", "事業所連絡会", "チームミーティング"],
            "その他": ["書類整理", "研修", "移動"],
        }

        schedules_data = []
        # 前月〜来月の60日間にスケジュールを分散
        for day_offset in range(-30, 31):
            target_date = today_dt + timedelta(days=day_offset)
            # 土日はスケジュール少なめ
            if target_date.weekday() >= 5:
                num_schedules = random.randint(0, 1)
            else:
                num_schedules = random.randint(2, 6)

            for _ in range(num_schedules):
                schedule_type = random.choices(SCHEDULE_TYPES, weights=SCHEDULE_TYPE_WEIGHTS, k=1)[0]
                hour = random.randint(9, 17)
                minute = random.choice([0, 15, 30, 45])
                duration = random.choice([30, 45, 60, 90, 120])

                start = target_date.replace(hour=hour, minute=minute)
                end = start + timedelta(minutes=duration)

                # 会議・その他は利用者なし、それ以外はランダムで利用者を紐づけ
                if schedule_type in ("会議", "その他"):
                    client_id = None
                    titles = schedule_titles_by_type[schedule_type]
                    title = random.choice(titles)
                else:
                    client = random.choice(active_clients)
                    client_id = client.id
                    # クライアント名をマッピングから取得
                    personal = pseudonym_mapping.get(client.pseudonym_hash, {})
                    name = f"{personal.get('family_name', '?')}{personal.get('given_name', '?')}さん"
                    titles = schedule_titles_by_type[schedule_type]
                    title = random.choice(titles).format(name=name)

                schedule = Schedule(
                    client_id=client_id,
                    staff_id=random.choice(staff_ids),
                    title=title,
                    schedule_type=schedule_type,
                    start_datetime=start,
                    end_datetime=end,
                    location=random.choice(LOCATIONS),
                    notes="",
                    status="scheduled",
                )
                schedules_data.append(schedule)

        db.add_all(schedules_data)
        db.commit()
        print(f"スケジュール登録完了: {len(schedules_data)}件")

        # ── Monthly Tasks（activeな利用者に今年の月間業務を割り当て）─────
        task_types = ["モニタ", "更新", "新規", "更+モニ", "新+モニ", "その他", "最終モニタ"]
        task_weights = [40, 20, 5, 10, 5, 5, 15]
        current_year = today.year

        monthly_tasks = []
        for c in active_clients:
            # 各利用者に年間2〜6件のタスクをランダム配置
            num_tasks = random.randint(2, 6)
            months = random.sample(range(1, 13), k=num_tasks)
            for m in months:
                task_type = random.choices(task_types, weights=task_weights, k=1)[0]
                mt = MonthlyTask(
                    client_id=c.id,
                    year=current_year,
                    month=m,
                    task_type=task_type,
                )
                monthly_tasks.append(mt)

        db.add_all(monthly_tasks)
        db.commit()
        print(f"月間業務登録完了: {len(monthly_tasks)}件")

        print(f"\n=== シードデータの登録が完了しました ===")
        print(f"ユーザー: 3名（admin × 1, staff × 2）")
        print(f"スタッフ: 2名")
        print(f"利用者: {len(clients_list)}名（active: {len(active_clients)}名）")
        print(f"支援計画: {len(plans)}件")
        print(f"支援記録: {len(records)}件")
        print(f"スケジュール: {len(schedules_data)}件")
        print(f"月間業務: {len(monthly_tasks)}件")

    except Exception as e:
        db.rollback()
        print(f"エラーが発生しました: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
