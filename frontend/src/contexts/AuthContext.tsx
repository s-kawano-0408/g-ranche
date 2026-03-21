'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAutoLock } from '@/hooks/useAutoLock';
import { logout as apiLogout } from '@/lib/api';

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
  refreshUser: () => Promise<void>;
}

// Context を作成（初期値は null）
const AuthContext = createContext<AuthContextType | null>(null);

// AuthProvider: アプリ全体をラップして認証状態を管理する
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ページ読み込み時にCookieのトークンを確認して、ユーザー情報を取得する
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Cookieが自動送信される → サーバーがトークンを検証
        const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
        const res = await fetch(`${BASE_URL}/api/auth/me`, {
          credentials: 'include',
        });

        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch {
        // ネットワークエラーなど
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // ログイン後にユーザー情報を再取得する
  const refreshUser = useCallback(async () => {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
    const res = await fetch(`${BASE_URL}/api/auth/me`, { credentials: 'include' });
    if (res.ok) {
      const userData = await res.json();
      setUser(userData);
    }
  }, []);

  // ログアウト: Cookie削除 → ログイン画面へ
  const logout = useCallback(() => {
    apiLogout().catch(() => {}); // サーバーにCookie削除を依頼
    setUser(null);
    router.push('/login');
  }, [router]);

  // 30分間操作がなかったら自動ログアウト（ログイン中のみ有効）
  useAutoLock(logout);

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
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
