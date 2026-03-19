'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePseudonym } from '@/contexts/PseudonymContext';
import { deriveKey, generateSalt } from '@/lib/crypto';
import { loadEncrypted, saveEncrypted } from '@/lib/indexeddb';
import { migrateFromLocalStorage } from '@/lib/migrate-storage';
import { useAutoLock } from '@/hooks/useAutoLock';

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
  setKeyAndLoad: (password: string) => Promise<void>;
}

// Context を作成（初期値は null）
const AuthContext = createContext<AuthContextType | null>(null);

// saltをIndexedDBに保存する際のキー
const SALT_KEY = 'encryption_salt';

// AuthProvider: アプリ全体をラップして認証状態を管理する
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { setEncryptionKey, clearMappings } = usePseudonym();

  // 暗号鍵をメモリに保持（画面には関係ないのでuseRef）
  const keyRef = useRef<CryptoKey | null>(null);

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

  // パスワードから暗号鍵を導出し、PseudonymContextにデータを読み込む
  const setKeyAndLoad = async (password: string) => {
    // IndexedDBからsaltを読み出す（なければ新規生成して保存）
    const existing = await loadEncrypted(SALT_KEY);
    let saltBase64: string;

    if (existing?.salt) {
      saltBase64 = existing.salt;
    } else {
      // 初回ログイン時: saltを生成してIndexedDBに保存
      const newSalt = generateSalt();
      saltBase64 = btoa(String.fromCharCode(...newSalt));
      await saveEncrypted(SALT_KEY, { iv: '', salt: saltBase64, ciphertext: '' });
    }

    // Base64をUint8Arrayに戻す
    const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));

    // パスワード + salt → 暗号鍵を導出
    const key = await deriveKey(password, salt);
    keyRef.current = key;

    // localStorageに旧データがあれば暗号化してIndexedDBに移行
    const migrated = await migrateFromLocalStorage(key);
    if (migrated) {
      console.log('localStorageのデータをIndexedDBに移行しました');
    }

    // PseudonymContextに鍵を渡してデータを復号・読み込み
    await setEncryptionKey(key);
  };

  // ログアウト: トークン削除 → 鍵破棄 → マッピングクリア → ログイン画面へ
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    keyRef.current = null;
    clearMappings();
    setUser(null);
    router.push('/login');
  }, [clearMappings, router]);

  // 30分間操作がなかったら自動ログアウト（ログイン中のみ有効）
  useAutoLock(logout);

  return (
    <AuthContext.Provider value={{ user, loading, logout, setKeyAndLoad }}>
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
