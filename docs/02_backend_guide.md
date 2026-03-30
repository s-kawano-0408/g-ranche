# バックエンド実装ガイド

## 1. database.py — DB接続の仕組み

```python
# database.py
DATABASE_URL = os.environ.get("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db      # FastAPIのDependsで使われる
    finally:
        db.close()   # リクエスト終了後に必ず閉じる
```

**ポイント：**
- `DATABASE_URL` は `.env` に記述（Supabase PostgreSQLの接続文字列）
- `get_db()` はFastAPIの依存性注入で使う
- 各エンドポイントの引数に `db: Session = Depends(get_db)` と書くだけでDBセッションが使える

---

## 2. models/ — テーブル定義

```python
# models/client.py（現在の定義）
class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    family_name = Column(String, nullable=False)        # 姓
    given_name = Column(String, nullable=False)         # 名
    family_name_kana = Column(String, nullable=False)   # セイ
    given_name_kana = Column(String, nullable=False)    # メイ
    birth_date = Column(String, nullable=False)         # 生年月日
    certificate_number = Column(String, nullable=False) # 受給者証番号
    gender = Column(String)                             # 性別（任意）
    client_type = Column(String, nullable=False)        # "児"/"者"
    staff_id = Column(Integer, ForeignKey("staffs.id")) # 担当スタッフ
    status = Column(String, default="active")           # active/inactive
    end_date = Column(String)                           # 終了日
    notes = Column(Text)                                # 備考
    deleted_at = Column(DateTime)                       # 論理削除用

    # リレーションシップ
    staff = relationship("Staff", back_populates="clients")
    support_plans = relationship("SupportPlan", back_populates="client")
```

**全テーブル共通:**
- `deleted_at` カラムによる**論理削除**
- DELETE APIは `deleted_at` に現在日時を設定
- GET APIは `deleted_at IS NULL` でフィルタ

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
    birth_date: str
    certificate_number: str
    client_type: str
    gender: Optional[str] = None
    # ...

class ClientUpdate(BaseModel):
    family_name: Optional[str] = None   # 全部任意（部分更新したい）
    given_name: Optional[str] = None
    # ...

class ClientResponse(BaseModel):
    id: int
    family_name: str
    given_name: str
    client_type: str
    status: str
    # ...
    model_config = {"from_attributes": True}  # SQLAlchemyオブジェクトを変換
```

**なぜCreate/Update/Responseを分けるか：**
- `Create`: 必須フィールドあり（姓名など）
- `Update`: 全部任意（部分更新したい）
- `Response`: idやcreated_atを含む（DBが自動生成するフィールド）

---

## 4. routers/ — APIエンドポイント

```python
# routers/clients.py（パターン解説）

# 一覧取得（認証必須 + クエリパラメータでフィルタ）
@router.get("", response_model=List[ClientResponse])
def list_clients(
    client_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _user = Depends(get_current_user),   # ← 認証チェック
):
    stmt = select(Client).where(Client.deleted_at.is_(None))
    if client_type:
        stmt = stmt.where(Client.client_type == client_type)
    return db.execute(stmt).scalars().all()

# 新規作成
@router.post("", response_model=ClientResponse, status_code=201)
def create_client(
    client_in: ClientCreate,
    db: Session = Depends(get_db),
    _user = Depends(require_admin),   # ← 管理者のみ
):
    client = Client(**client_in.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client

# 更新（部分更新）
@router.put("/{client_id}", response_model=ClientResponse)
def update_client(client_id: int, client_in: ClientUpdate, db: Session = Depends(get_db)):
    client = db.execute(
        select(Client).where(Client.id == client_id, Client.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="利用者が見つかりません")

    update_data = client_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(client, key, value)
    db.commit()
    return client
```

**新しいルーターを追加するには：**
1. `routers/新ファイル.py` を作成
2. `main.py` に `app.include_router(新ルーター, prefix="/api/新パス")` を追加

---

## 5. 認証の仕組み

```python
# auth.py
# JWT（JSON Web Token）をHttpOnly Cookieで管理

def get_current_user(request: Request, db: Session = Depends(get_db)):
    """Cookieからトークンを取得 → ユーザー情報を返す"""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401)
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    user = db.query(Staff).filter(Staff.id == payload["sub"]).first()
    return user

def require_admin(user = Depends(get_current_user)):
    """管理者のみアクセス可"""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    return user
```

---

## 6. Excel転記の仕組み

```
backend/transcription/
├── ocr.py           ← Claude Vision APIで画像 → フィールド抽出
├── cell_mappings.py ← フィールド名 → セル座標のマッピング + 抽出プロンプト
└── excel_writer.py  ← openpyxlでテンプレートに書き込み
```

**OCR処理（ocr.py）:**
- 画像をbase64エンコードしてClaude Vision APIに送信
- 1回のAPI呼び出しでOCR + フィールド構造化を同時に行う
- 返されたfield_nameをCELL_MAPPINGSのキーと照合してバリデーション

**テンプレート書き込み（excel_writer.py）:**
- openpyxlでテンプレートを直接開いて値だけ書き込む（書式は保持）
- テンプレートパス: Volume（`/data/template.xlsx`）優先、なければローカル

---

## 7. よくある修正パターン

### フィールドを追加する
```python
# 1. models/*.py にカラム追加
new_field = Column(String)

# 2. schemas/*.py に追加
new_field: Optional[str] = None

# 3. Supabase SQL EditorでALTER TABLE
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
