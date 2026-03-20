"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { setKeyAndLoad } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // ① APIでログイン（サーバーがCookieにトークンをセット）
      await login(email, password);

      // ② パスワードから暗号鍵を導出 → IndexedDBのデータを復号
      await setKeyAndLoad(password);

      // ③ ダッシュボードへ遷移（router.pushでメモリを保持したまま遷移）
      router.push("/dashboard");
    } catch {
      setError("ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl border border-slate-100">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-teal-700">ぐ・らんちぇ</h1>
        <p className="text-sm text-slate-500 mt-1">相談支援管理システム</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            メールアドレス
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@g-ranche.jp"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            パスワード
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワードを入力"
            required
          />
        </div>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700"
        >
          {loading ? "ログイン中..." : "ログイン"}
        </Button>
      </form>
    </div>
  );
}
