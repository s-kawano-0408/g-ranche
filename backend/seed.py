"""
Seed script to populate the database with sample data.
Run with: python seed.py
"""
import json
from datetime import datetime, date, timedelta

from database import SessionLocal, engine, Base
import models  # noqa: F401 - ensure all models are registered

from models.staff import Staff
from models.client import Client
from models.support_plan import SupportPlan
from models.case_record import CaseRecord
from models.schedule import Schedule
from models.user import User
from auth import hash_password
from pseudonym import generate_hash


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Clear existing data in reverse dependency order
        db.query(Schedule).delete()
        db.query(CaseRecord).delete()
        db.query(SupportPlan).delete()
        db.query(Client).delete()
        db.query(Staff).delete()
        db.query(User).delete()
        db.commit()

        # ── Users（ログインユーザー）─────────────────────────────
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
        print("ユーザー登録完了: 3名（admin × 1, staff × 2）")

        # ── Staff ────────────────────────────────────────────────
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
        print(f"スタッフ登録完了: {staff1.name}, {staff2.name}")

        # ── Clients ──────────────────────────────────────────────
        today = date.today()

        # 個人情報（DBには保存しない。JSONマッピング用）
        personal_data = [
            {
                "family_name": "山田", "given_name": "太郎",
                "family_name_kana": "ヤマダ", "given_name_kana": "タロウ",
                "birth_date": "1980-04-15", "certificate_number": "1311000001",
                "gender": "男性", "client_type": "者",
                "staff_id": staff1.id, "status": "active",
                "notes": "車椅子使用。住宅改修済み。就労継続支援B型利用中。",
            },
            {
                "family_name": "佐藤", "given_name": "美咲",
                "family_name_kana": "サトウ", "given_name_kana": "ミサキ",
                "birth_date": "1995-08-20", "certificate_number": "1311000002",
                "gender": "女性", "client_type": "者",
                "staff_id": staff1.id, "status": "active",
                "notes": "統合失調症。服薬管理支援が必要。週2回のデイケア利用中。",
            },
            {
                "family_name": "伊藤", "given_name": "健二",
                "family_name_kana": "イトウ", "given_name_kana": "ケンジ",
                "birth_date": "1988-12-03", "certificate_number": "1311000003",
                "gender": "男性", "client_type": "者",
                "staff_id": staff2.id, "status": "active",
                "notes": "グループホーム入居中。就労継続支援A型で農作業に従事。",
            },
            {
                "family_name": "渡辺", "given_name": "さくら",
                "family_name_kana": "ワタナベ", "given_name_kana": "サクラ",
                "birth_date": "2011-03-25", "certificate_number": "1311000004",
                "gender": "女性", "client_type": "児",
                "staff_id": staff2.id, "status": "active",
                "notes": "ASD・ADHD診断あり。就労移行支援利用中。コミュニケーション支援が必要。",
            },
            {
                "family_name": "中村", "given_name": "隆史",
                "family_name_kana": "ナカムラ", "given_name_kana": "タカシ",
                "birth_date": "2018-11-08", "certificate_number": "1311000005",
                "gender": "男性", "client_type": "児",
                "staff_id": staff1.id, "status": "active",
                "notes": "パーキンソン病。症状は中等度。訪問介護・デイサービス利用中。",
            },
        ]

        # ハッシュ生成してDBに保存（個人情報はDBに入れない）
        pseudonym_mapping = {}
        clients_list = []

        for pd in personal_data:
            h = generate_hash(pd["certificate_number"], pd["birth_date"])
            pseudonym_mapping[h] = {
                "family_name": pd["family_name"],
                "given_name": pd["given_name"],
                "family_name_kana": pd["family_name_kana"],
                "given_name_kana": pd["given_name_kana"],
                "birth_date": pd["birth_date"],
                "certificate_number": pd["certificate_number"],
            }
            client = Client(
                pseudonym_hash=h,
                gender=pd["gender"],
                client_type=pd["client_type"],
                staff_id=pd["staff_id"],
                status=pd["status"],
                notes=pd["notes"],
            )
            clients_list.append(client)

        db.add_all(clients_list)
        db.commit()
        for c in clients_list:
            db.refresh(c)

        # JSONマッピングファイル出力
        with open("seed_pseudonym_mapping.json", "w", encoding="utf-8") as f:
            json.dump(pseudonym_mapping, f, ensure_ascii=False, indent=2)

        client1, client2, client3, client4, client5 = clients_list
        print("利用者登録完了: 5名")
        print(f"マッピングファイル出力: seed_pseudonym_mapping.json（{len(pseudonym_mapping)}名分）")

        # ── Support Plans ────────────────────────────────────────
        plan1 = SupportPlan(
            client_id=client1.id,
            plan_date=date(2024, 4, 1),
            long_term_goal="地域で自立した生活を送り、希望する職場で継続して就労できる。",
            short_term_goal="体調を安定させながら、就労継続支援B型での作業を週4日継続する。住宅改修後の環境に慣れる。",
            service_contents=[
                {"service": "就労継続支援B型", "provider": "ワークショップひまわり", "frequency": "週4日"},
                {"service": "居宅介護（身体介護）", "provider": "ヘルパーステーションなごや", "frequency": "週3回・各1時間"},
                {"service": "計画相談支援", "provider": "相談支援センターみらい", "frequency": "月1回"},
            ],
            monitoring_interval=6,
            next_monitoring_date=today + timedelta(days=45),
            status="active",
        )
        plan2 = SupportPlan(
            client_id=client2.id,
            plan_date=date(2024, 1, 15),
            long_term_goal="症状を安定させ、地域の中で安心して生活できる環境を整える。",
            short_term_goal="服薬を継続し、週2回のデイケアを欠かさず利用する。生活リズムを整える。",
            service_contents=[
                {"service": "精神科デイケア", "provider": "メンタルクリニックさくら", "frequency": "週2日"},
                {"service": "居宅介護（生活援助）", "provider": "ケアサポートやまて", "frequency": "週2回・各2時間"},
                {"service": "相談支援", "provider": "相談支援センターみらい", "frequency": "月1回"},
            ],
            monitoring_interval=3,
            next_monitoring_date=today + timedelta(days=15),
            status="active",
        )
        plan3 = SupportPlan(
            client_id=client3.id,
            plan_date=date(2023, 7, 1),
            long_term_goal="グループホームでの安定した生活を継続しながら、就労収入を増やす。",
            short_term_goal="就労継続支援A型での作業を週5日継続する。グループホームでの共同生活ルールを守る。",
            service_contents=[
                {"service": "就労継続支援A型", "provider": "農園フレンズ", "frequency": "週5日"},
                {"service": "共同生活援助（グループホーム）", "provider": "GHにじ", "frequency": "常時"},
                {"service": "計画相談支援", "provider": "相談支援センターみらい", "frequency": "月1回"},
            ],
            monitoring_interval=6,
            next_monitoring_date=today + timedelta(days=90),
            status="active",
        )
        plan4 = SupportPlan(
            client_id=client4.id,
            plan_date=date(2023, 6, 1),
            long_term_goal="一般就労を実現し、自分に合った働き方で社会参加できる。",
            short_term_goal="就労移行支援での訓練を週4日継続する。コミュニケーションスキルを向上させる。",
            service_contents=[
                {"service": "就労移行支援", "provider": "ジョブスタート東京", "frequency": "週4日"},
                {"service": "相談支援", "provider": "相談支援センターみらい", "frequency": "月1回"},
            ],
            monitoring_interval=3,
            next_monitoring_date=today + timedelta(days=20),
            status="active",
        )
        plan5 = SupportPlan(
            client_id=client5.id,
            plan_date=date(2024, 1, 1),
            long_term_goal="在宅での生活を継続しながら、症状の進行を遅らせ、QOLを維持する。",
            short_term_goal="訪問介護・デイサービスを活用し、日常生活動作を維持する。介護者（妻）の負担軽減を図る。",
            service_contents=[
                {"service": "訪問介護（身体介護・生活援助）", "provider": "ケアステーションもみじ", "frequency": "週5回"},
                {"service": "通所介護（デイサービス）", "provider": "デイサービスほほえみ", "frequency": "週3日"},
                {"service": "福祉用具貸与", "provider": "福祉用具センター", "frequency": "常時"},
                {"service": "計画相談支援", "provider": "相談支援センターみらい", "frequency": "月1回"},
            ],
            monitoring_interval=6,
            next_monitoring_date=today + timedelta(days=60),
            status="active",
        )
        db.add_all([plan1, plan2, plan3, plan4, plan5])
        db.commit()
        print("支援計画登録完了: 5件")

        # ── Case Records ─────────────────────────────────────────
        now = datetime.now()

        records = [
            CaseRecord(
                client_id=client1.id,
                staff_id=staff1.id,
                record_date=now - timedelta(days=30),
                record_type="面談",
                content="山田太郎さんと事業所にて面談を実施。就労継続支援B型での作業状況を確認。木工作業に意欲的に取り組んでおり、月収が先月より5,000円増加したとのこと。体調は安定しており、住宅改修後の生活にも慣れてきた様子。ヘルパーの支援についても満足しているとのこと。次回モニタリングに向けて目標達成状況を整理した。",
                summary="就労B型での作業継続、収入増加。体調安定。",
                next_action="次回モニタリングまでに就労継続支援B型のサービス担当者会議を調整する。",
            ),
            CaseRecord(
                client_id=client1.id,
                staff_id=staff1.id,
                record_date=now - timedelta(days=7),
                record_type="電話",
                content="山田太郎さんより電話あり。先週から腰痛が悪化しており、ヘルパーの支援時間を増やしたいとの相談。主治医への受診を勧め、診断書を持参のうえ再度相談することを伝えた。",
                summary="腰痛悪化によりヘルパー時間増加の相談あり。",
                next_action="主治医受診後に状態確認の電話をする。必要に応じてサービス変更の手続きを進める。",
            ),
            CaseRecord(
                client_id=client2.id,
                staff_id=staff1.id,
                record_date=now - timedelta(days=20),
                record_type="訪問",
                content="佐藤美咲さんのご自宅を訪問。生活状況と服薬状況を確認。処方薬は適切に服用できており、デイケアも週2回継続できている。最近、近所の方と少し話せるようになったとのことで、社会的接触の範囲が広がっている。室内は整理整頓されており、生活は安定している様子。母親も同席し、家族支援の状況も確認した。",
                summary="服薬継続、デイケア継続。近所との交流が増加。生活安定。",
                next_action="3ヶ月後のモニタリングを計画。デイケアの担当者と連携して社会参加の機会を増やす方法を検討する。",
            ),
            CaseRecord(
                client_id=client2.id,
                staff_id=staff1.id,
                record_date=now - timedelta(days=3),
                record_type="電話",
                content="デイケア担当の福祉士より連絡あり。佐藤美咲さんが先週から体調不良のためデイケアを欠席しているとのこと。ご本人に電話したところ、風邪症状はあるが精神症状の悪化はないとのこと。主治医への受診を勧め、回復したらデイケア再開するよう伝えた。",
                summary="風邪によりデイケア欠席。精神症状の悪化はなし。",
                next_action="回復確認の電話を3日後に実施する。",
            ),
            CaseRecord(
                client_id=client3.id,
                staff_id=staff2.id,
                record_date=now - timedelta(days=45),
                record_type="モニタリング",
                content="伊藤健二さんのモニタリングを実施。グループホームの世話人、就労継続支援A型の担当者も同席。就労A型での農作業は週5日継続できており、作業能力も向上している。グループホームでの生活も安定しており、他の入居者とも良好な関係を築いている。収入は月3万円程度。貯金も少しずつできており、将来の一人暮らしへの意欲が高まっている。",
                summary="就労A型週5日継続。GH生活安定。将来の一人暮らしへの意欲あり。",
                next_action="次回モニタリングは6ヶ月後。一人暮らしに向けた情報収集を開始する。",
            ),
            CaseRecord(
                client_id=client4.id,
                staff_id=staff2.id,
                record_date=now - timedelta(days=14),
                record_type="面談",
                content="渡辺さくらさんと面談。就労移行支援での訓練状況を確認。パソコン作業や電話応対の練習を継続中。コミュニケーション面では、支援員の助言を受けながら改善が見られる。アルバイトの実習先として近くのデータ入力会社での実習を来月から開始する予定とのこと。緊張しているようだったが、前向きな気持ちがあることを確認した。",
                summary="就労移行支援継続。来月より実習開始予定。",
                next_action="実習開始後1週間で状況確認の電話をする。就労支援担当者と密に連携する。",
            ),
            CaseRecord(
                client_id=client5.id,
                staff_id=staff1.id,
                record_date=now - timedelta(days=10),
                record_type="訪問",
                content="中村隆史さんのご自宅を訪問。妻の由美子さんも同席。パーキンソン病の症状について確認。歩行の不安定さが若干増しているとのこと。訪問介護の身体介護では入浴・排泄支援が中心で、ヘルパーの支援に満足しているとのこと。デイサービスでのリハビリにも意欲的に参加中。妻の介護負担について確認したところ、夜間の対応が大変とのことで、レスパイトケアの活用を提案した。",
                summary="症状やや進行。デイサービスのリハビリ継続。妻の介護負担あり。",
                next_action="レスパイトケア（短期入所）の情報を収集し、次回の面談時に提案する。主治医と症状進行について情報共有する。",
            ),
        ]
        db.add_all(records)
        db.commit()
        print("支援記録登録完了: 7件")

        # ── Schedules ────────────────────────────────────────────
        # Today's date for creating realistic schedules
        today_dt = datetime.combine(today, datetime.min.time())

        schedules_data = [
            # Today's schedules
            Schedule(
                client_id=client1.id,
                staff_id=staff1.id,
                title="山田太郎さん 腰痛フォローアップ電話",
                schedule_type="電話",
                start_datetime=today_dt.replace(hour=10, minute=0),
                end_datetime=today_dt.replace(hour=10, minute=30),
                location="事務所",
                notes="腰痛悪化についてのフォローアップ。主治医受診の結果を確認する。",
                status="scheduled",
            ),
            Schedule(
                client_id=client2.id,
                staff_id=staff1.id,
                title="佐藤美咲さん 体調確認電話",
                schedule_type="電話",
                start_datetime=today_dt.replace(hour=14, minute=0),
                end_datetime=today_dt.replace(hour=14, minute=20),
                location="事務所",
                notes="風邪からの回復状況確認。デイケア再開の見通しを確認する。",
                status="scheduled",
            ),
            Schedule(
                client_id=client5.id,
                staff_id=staff1.id,
                title="中村隆史さん レスパイトケア情報提供面談",
                schedule_type="面談",
                start_datetime=today_dt.replace(hour=15, minute=30),
                end_datetime=today_dt.replace(hour=16, minute=30),
                location="中村さんご自宅",
                notes="短期入所のパンフレットを持参。妻の介護負担軽減策を相談する。",
                status="scheduled",
            ),
            # This week
            Schedule(
                client_id=client3.id,
                staff_id=staff2.id,
                title="伊藤健二さん グループホーム訪問",
                schedule_type="訪問",
                start_datetime=(today_dt + timedelta(days=2)).replace(hour=13, minute=0),
                end_datetime=(today_dt + timedelta(days=2)).replace(hour=14, minute=0),
                location="GHにじ",
                notes="一人暮らしへの意欲について詳しく聞く。生活スキルの現状確認。",
                status="scheduled",
            ),
            Schedule(
                client_id=client4.id,
                staff_id=staff2.id,
                title="渡辺さくらさん 実習前面談",
                schedule_type="面談",
                start_datetime=(today_dt + timedelta(days=3)).replace(hour=10, minute=0),
                end_datetime=(today_dt + timedelta(days=3)).replace(hour=11, minute=0),
                location="相談支援センターみらい",
                notes="来月からの実習について不安を解消する。就労移行支援の担当者も同席予定。",
                status="scheduled",
            ),
            Schedule(
                client_id=None,
                staff_id=staff1.id,
                title="サービス担当者会議（山田太郎さん関係）",
                schedule_type="会議",
                start_datetime=(today_dt + timedelta(days=5)).replace(hour=14, minute=0),
                end_datetime=(today_dt + timedelta(days=5)).replace(hour=16, minute=0),
                location="ワークショップひまわり 会議室",
                notes="腰痛悪化に伴うサービス変更について協議。就労継続支援B型、訪問介護の担当者が参加予定。",
                status="scheduled",
            ),
            # Next week
            Schedule(
                client_id=client2.id,
                staff_id=staff1.id,
                title="佐藤美咲さん モニタリング訪問",
                schedule_type="モニタリング",
                start_datetime=(today_dt + timedelta(days=10)).replace(hour=11, minute=0),
                end_datetime=(today_dt + timedelta(days=10)).replace(hour=12, minute=30),
                location="佐藤さんご自宅",
                notes="3ヶ月モニタリング。デイケア参加状況、服薬状況、社会参加の状況を確認する。",
                status="scheduled",
            ),
            Schedule(
                client_id=client4.id,
                staff_id=staff2.id,
                title="渡辺さくらさん モニタリング面談",
                schedule_type="モニタリング",
                start_datetime=(today_dt + timedelta(days=12)).replace(hour=14, minute=0),
                end_datetime=(today_dt + timedelta(days=12)).replace(hour=15, minute=30),
                location="相談支援センターみらい",
                notes="3ヶ月モニタリング。就労移行支援の進捗、実習準備状況を確認する。",
                status="scheduled",
            ),
        ]
        db.add_all(schedules_data)
        db.commit()
        print("スケジュール登録完了: 8件")

        print("\n=== シードデータの登録が完了しました ===")
        print(f"ユーザー: 3名（admin × 1, staff × 2）")
        print(f"スタッフ: 2名")
        print(f"利用者: 5名")
        print(f"支援計画: 5件")
        print(f"支援記録: 7件")
        print(f"スケジュール: 8件（本日: 3件）")

    except Exception as e:
        db.rollback()
        print(f"エラーが発生しました: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
