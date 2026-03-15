# バックエンド実装ガイド

## 1. database.py — DB接続の仕組み

```python
# database.py
engine = create_engine("sqlite:///./g_ranche.db")
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db      # FastAPIのDependsで使われる
    finally:
        db.close()   # リクエスト終了後に必ず閉じる
```

**ポイント：** `get_db()` はFastAPIの依存性注入で使います。
各エンドポイントの引数に `db: Session = Depends(get_db)` と書くだけでDBセッションが使えます。

---

## 2. models/ — テーブル定義

```python
# models/client.py（抜粋）
class Client(Base):
    __tablename__ = "clients"   # ← SQLiteのテーブル名

    id = Column(Integer, primary_key=True, index=True)
    pseudonym_hash = Column(String, unique=True, nullable=False)  # 仮名化ハッシュ
    gender = Column(String)
    client_type = Column(String, nullable=False)  # "児"/"者"
    staff_id = Column(Integer, ForeignKey("staffs.id"))  # 外部キー
    status = Column(String, default="active")

    # ※ 姓名・フリガナ・生年月日・受給者証番号はDBに保存しない（仮名化）
    # リレーションシップ（JOINなしで関連データにアクセスできる）
    staff = relationship("Staff", back_populates="clients")
    support_plans = relationship("SupportPlan", back_populates="client")
```

**カラムを追加したいとき：**
```python
# 例：メールアドレスを追加
email = Column(String)

# DBに反映するには（既存DBがある場合）
# → Alembicでマイグレーション or DBファイルを削除して再起動
```

**テーブルを作るには：**
`main.py` の startup イベントで `Base.metadata.create_all(bind=engine)` が呼ばれるので、
モデルを追加してサーバーを再起動すれば自動でテーブルが作成されます。

---

## 3. schemas/ — APIの型定義

```python
# schemas/client.py
class ClientCreate(BaseModel):
    family_name: str           # APIで受け取る（ハッシュ生成のため）
    given_name: str
    birth_date: date
    certificate_number: str
    client_type: str
    # ... 他のフィールド

class ClientUpdate(BaseModel):
    gender: Optional[str] = None   # 更新可能なフィールドのみ
    client_type: Optional[str] = None
    # ... （個人情報フィールドは含まない）

class ClientResponse(BaseModel):
    id: int
    pseudonym_hash: str        # ハッシュだけ返す（個人情報なし）
    client_type: str
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}  # SQLAlchemyオブジェクトを変換
```

**なぜCreate/Update/Responseを分けるか：**
- `Create`: 必須フィールドあり（nameなど）
- `Update`: 全部任意（部分更新したい）
- `Response`: idやcreated_atを含む（DBが自動生成するフィールド）

---

## 4. routers/ — APIエンドポイント

```python
# routers/clients.py（パターン解説）

# 一覧取得（クエリパラメータでフィルタ）
@router.get("/", response_model=List[ClientResponse])
def list_clients(
    name: Optional[str] = Query(None),   # ?name=田中 でフィルタ
    db: Session = Depends(get_db),
):
    stmt = select(Client)
    if name:
        stmt = stmt.where(Client.name.contains(name))
    return db.execute(stmt).scalars().all()

# 新規作成
@router.post("/", response_model=ClientResponse, status_code=201)
def create_client(client_in: ClientCreate, db: Session = Depends(get_db)):
    client = Client(**client_in.model_dump())   # Pydantic → SQLAlchemy
    db.add(client)
    db.commit()
    db.refresh(client)   # DBが生成したidを取得するため必要
    return client

# 更新（部分更新）
@router.put("/{client_id}", response_model=ClientResponse)
def update_client(client_id: int, client_in: ClientUpdate, db: Session = Depends(get_db)):
    client = db.execute(select(Client).where(Client.id == client_id)).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="利用者が見つかりません")

    update_data = client_in.model_dump(exclude_unset=True)  # 送られてきたフィールドだけ
    for key, value in update_data.items():
        setattr(client, key, value)
    db.commit()
    return client
```

**新しいルーターを追加するには：**
1. `routers/新ファイル.py` を作成
2. `main.py` に `app.include_router(新ルーター, prefix="/api/新パス")` を追加

---

## 5. AI統合の仕組み

### ai/tools.py — Claudeに使わせるツールの定義

```python
{
    "name": "search_clients",        # ← tool_executor.py の関数名と一致させる
    "description": "利用者を検索...", # ← Claudeがいつ使うか判断する説明文（重要！）
    "input_schema": {
        "type": "object",
        "properties": {
            "name": {"type": "string", "description": "名前（部分一致）"},
        },
        "required": [],   # 必須パラメータ
    },
}
```

**ツールを追加するには：**
1. `ai/tools.py` の `get_tools()` リストに追加
2. `ai/tool_executor.py` の `tool_map` に対応するメソッドを追加

### ai/tool_executor.py — ツールの実際の処理

```python
class ToolExecutor:
    def execute(self, tool_name: str, tool_input: dict):
        tool_map = {
            "search_clients": self._search_clients,
            # ↑ ツール名 → 実行するメソッド
        }
        handler = tool_map.get(tool_name)
        return handler(**tool_input)   # Claudeが決めた引数で実行

    def _search_clients(self, client_type=None, status="active"):
        # 実際のDBクエリ（名前検索はDB側では不可 → フロントで対応）
        stmt = select(Client)
        if name:
            stmt = stmt.where(Client.name.contains(name))
        clients = self.db.execute(stmt).scalars().all()
        return {"clients": [...], "total": len(clients)}
        # ↑ JSON化できる dict で返す（必須）
```

### ai/client.py — Tool Use ループ

Claudeがツールを使うとき、以下のループが発生します：

```
1. Claudeにメッセージを送る
2. Claudeが "tool_use" ブロックを返す（stop_reason="tool_use"）
3. ツールを実行する
4. 結果をClaudeに送り返す (role="user", type="tool_result")
5. Claudeが最終回答を返す (stop_reason="end_turn")
6. ループ終了
```

コードでは `while True:` ループで実装されています：
```python
while True:
    # Claudeにストリーミング送信
    with self.client.messages.stream(...) as stream:
        final_message = stream.get_final_message()
        stop_reason = final_message.stop_reason

    if stop_reason == "end_turn" or not tool_use_blocks:
        break   # ← ここでループ終了

    # ツールを実行して結果をmessagesに追加
    # → ループの先頭に戻りClaudeに再送信
```

---

## 6. よくある修正パターン

### フィールドを追加する
```python
# 1. models/client.py にカラム追加
new_field = Column(String)

# 2. schemas/client.py に追加
new_field: Optional[str] = None

# 3. DBファイルを削除して再起動（or Alembicを使う）
rm g_ranche.db
uv run uvicorn main:app --reload
```

### 新しい検索条件を追加する
```python
# routers/clients.py
@router.get("/")
def list_clients(
    name: Optional[str] = Query(None),
    new_filter: Optional[str] = Query(None),   # 追加
    db: Session = Depends(get_db),
):
    if new_filter:
        conditions.append(Client.new_field == new_filter)  # 追加
```

### AIのシステムプロンプトを変更する
`ai/system_prompt.py` の `system_text` を編集するだけです。
Claudeの振る舞いや知識を調整できます。
