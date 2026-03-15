'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ユーザー情報の型
interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

// Contextで共有するデータの型
interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
}

// Context を作成（初期値は null）
const AuthContext = createContext<AuthContextType | null>(null);

// AuthProvider: アプリ全体をラップして認証状態を管理する
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ページ読み込み時にトークンを確認して、ユーザー情報を取得する
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');

      // トークンがなければ未ログイン
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // トークンを使って GET /api/auth/me を呼ぶ
        const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          // トークンが無効（期限切れなど）→ 削除
          localStorage.removeItem('token');
        }
      } catch {
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // ログアウト: トークン削除 → ユーザー情報クリア → ログイン画面へ
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// useAuth: 各コンポーネントから認証情報を使うためのフック
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
