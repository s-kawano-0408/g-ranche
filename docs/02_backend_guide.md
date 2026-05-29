# バックエンド実装ガイド

## 1. database.py — DB接続の仕組み

```python
# database.py
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL が設定されていません。.env ファイルを確認してください。")

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db      # FastAPIのDependsで使われる
    finally:
        db.close()   # リクエスト終了後に必ず閉じる
```

**ポイント：**
- `DATABASE_URL` は `.env` に記述（Supabase PostgreSQL の接続文字列）
- 未設定なら起動時に即エラー（本番事故を防ぐため）
- `pool_pre_ping=True` で切断済みコネクションを自動検知
- 各エンドポイントの引数に `db: Session = Depends(get_db)` と書くだけで DB セッションが使える

---

## 2. models/ — テーブル定義

```python
# models/client.py（現状の定義）
class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    family_name = Column(String, nullable=False)        # 姓
    given_name = Column(String, nullable=False)         # 名
    family_name_kana = Column(String, nullable=False)   # セイ
    given_name_kana = Column(String, nullable=False)    # メイ
    birth_date = Column(Date, nullable=False)           # 生年月日（Date 型）
    certificate_number = Column(String, nullable=False) # 受給者証番号
    gender = Column(String)                             # 性別（任意）
    client_type = Column(String, nullable=False)        # "児"/"者"
    staff_id = Column(Integer, ForeignKey("staffs.id"), index=True)
    status = Column(String, default="active", index=True)
    notes = Column(Text)
    end_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    staff = relationship("Staff", back_populates="clients")
    support_plans = relationship("SupportPlan", back_populates="client")
    case_records = relationship("CaseRecord", back_populates="client")
    schedules = relationship("Schedule", back_populates="client")
```

**全テーブル共通（users を除く）:**
- `deleted_at` カラムによる**論理削除**
- DELETE APIは `deleted_at` に現在日時を設定
- GET APIは `deleted_at IS NULL` でフィルタ

**`users` と `staffs` は別物:**
- `users` … ログインアカウント（email + password_hash + role + is_active）。論理削除なしの代わりに `is_active=False` で無効化
- `staffs` … 業務上のスタッフ情報（電話・所属・利用者の担当割当）

**カラムを追加したいとき：**
```python
# 1. models/*.py にカラム追加
new_field = Column(String)

# 2. schemas/*.py に追加
new_field: Optional[str] = None

# 3. Supabase SQL EditorでALTER TABLEを実行
# ALTER TABLE clients ADD COLUMN new_field VARCHAR;
```

---

## 3. schemas/ — APIの型定義

```python
# schemas/client.py
class ClientCreate(BaseModel):
    family_name: str
    given_name: str
    family_name_kana: str
    given_name_kana: str
    birth_date: date
    certificate_number: str
    client_type: str
    gender: Optional[str] = None
    staff_id: Optional[int] = None
    status: Optional[str] = "active"
    end_date: Optional[date] = None
    notes: Optional[str] = None


class ClientUpdate(BaseModel):
    family_name: Optional[str] = None   # 全部任意（部分更新したい）
    given_name: Optional[str] = None
    # ...


class ClientResponse(BaseModel):
    id: int
    family_name: str
    given_name: str
    # ...
    model_config = {"from_attributes": True}  # SQLAlchemy オブジェクトを変換
```

**なぜCreate/Update/Responseを分けるか：**
- `Create`: 必須フィールドあり（姓名など）
- `Update`: 全部任意（部分更新したい）
- `Response`: id や created_at を含む（DBが自動生成するフィールド）

---

## 4. routers/ — APIエンドポイント

```python
# routers/clients.py（パターン解説）

# 一覧取得（認証必須 + クエリパラメータでフィルタ）
@router.get("", response_model=List[ClientResponse])
def list_clients(
    client_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _user = Depends(get_current_user),   # ← 認証チェック
):
    stmt = select(Client).where(Client.deleted_at.is_(None))
    if client_type:
        stmt = stmt.where(Client.client_type == client_type)
    if status:
        stmt = stmt.where(Client.status == status)
    stmt = stmt.order_by(Client.family_name_kana, Client.given_name_kana)
    return db.execute(stmt).scalars().all()


# 新規作成（管理者のみ）
@router.post("", response_model=ClientResponse, status_code=201)
def create_client(
    client_in: ClientCreate,
    db: Session = Depends(get_db),
    _admin = Depends(require_admin),
):
    client = Client(**client_in.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


# 論理削除（管理者のみ）
@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: int, db: Session = Depends(get_db), _admin = Depends(require_admin)):
    client = db.execute(
        select(Client).where(Client.id == client_id, Client.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="利用者が見つかりません")
    client.deleted_at = datetime.utcnow()
    db.commit()
    return None
```

**新しいルーターを追加するには：**
1. `routers/新ファイル.py` を作成
2. `main.py` に `app.include_router(新ルーター, prefix="/api/新パス")` を追加

---

## 5. 認証の仕組み

```python
# auth.py
# JWT（JSON Web Token）を HttpOnly Cookie で管理。
# 認証対象は users テーブル（email + bcrypt パスワードハッシュ）。

def get_current_user(request, response, db):
    """Cookie からトークンを検証してログイン中の User を返す。"""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="ログインが必要です")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="無効なトークンです")

    # 残り時間が 2 時間以下なら、新しいトークンで Cookie を上書き（スライド延長）
    if payload["exp"] - time.time() < 2 * 3600:
        new_token = create_access_token({"sub": payload["sub"]})
        response.set_cookie("access_token", new_token, httponly=True, samesite="lax",
                            secure=ENVIRONMENT == "production", max_age=8 * 3600)

    user = db.execute(select(User).where(User.email == payload["sub"])).scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="アカウントが無効化されています")
    return user


def require_admin(...):
    """管理者のみ許可（role == 'admin'）。それ以外は 403。"""
```

**ログイン API（`routers/auth.py`）:**
- `POST /api/auth/login` … `slowapi` で 5 回/分・30 回/時のレート制限
- パスワード照合は `bcrypt.checkpw`
- 成功時に HttpOnly Cookie をセット（有効期限 8 時間）

**管理者向け API:**
- `GET /api/auth/users` … ユーザー一覧
- `PUT /api/auth/users/{id}/password` … パスワード再設定
- `PUT /api/auth/users/{id}/deactivate` … `is_active=False` で無効化

---

## 6. Excel転記の仕組み

```
backend/transcription/
├── ocr.py           ← Claude Vision API で画像 → フィールド抽出
├── cell_mappings.py ← フィールド名 → セル座標のマッピング + 抽出プロンプト
├── excel_writer.py  ← openpyxl でテンプレートに書き込み
└── dump_template.py ← テンプレート構造を確認するためのダンプスクリプト
```

**OCR処理（ocr.py）:**
- 画像を base64 エンコードして Claude Vision API（`claude-sonnet-4-6`）に送信
- 1 回の API 呼び出しで OCR + フィールド構造化を同時に実施
- 返された `field_name` を `CELL_MAPPINGS` のキーと照合してバリデーション

**テンプレート書き込み（excel_writer.py）:**
- openpyxl でテンプレートを直接開いて値だけ書き込む（書式は完全保持）
- テンプレートパス: Fly.io Volume（`/data/template.xlsx`）優先、なければローカル（`backend/templates/template.xlsx`）
- 対応シート: `別紙１`、`1_1計画案`（Phase 1）

---

## 7. main.py の横断的ミドルウェア

| ミドルウェア | 役割 |
|--------------|------|
| CORS | `ALLOWED_ORIGINS` に基づく許可制御。`allow_credentials=True` |
| slowapi Limiter | レートリミット（IP単位） |
| `strip_trailing_slash` | `/api/clients/` → `/api/clients` に書き換え、308 を防止 |
| `audit_log_middleware` | `/api/` 配下を `audit` ロガーに記録 |

`app = FastAPI(..., redirect_slashes=False)` で FastAPI 内部の自動リダイレクトも抑止しています。

---

## 8. よくある修正パターン

### フィールドを追加する
```python
# 1. models/*.py にカラム追加
new_field = Column(String)

# 2. schemas/*.py に追加
new_field: Optional[str] = None

# 3. Supabase SQL Editor で ALTER TABLE
```

### 新しい検索条件を追加する
```python
# routers/clients.py
@router.get("")
def list_clients(
    name: Optional[str] = Query(None),
    new_filter: Optional[str] = Query(None),   # 追加
    db: Session = Depends(get_db),
):
    if new_filter:
        stmt = stmt.where(Client.new_field == new_filter)
```

### AIのシステムプロンプトを変更する
`ai/system_prompt.py` の `system_text` を編集するだけです。
Claudeの振る舞いや知識を調整できます。
