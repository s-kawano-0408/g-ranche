'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePseudonym } from '@/contexts/PseudonymContext';
import { deriveKey, generateSalt } from '@/lib/crypto';
import { loadEncrypted, saveEncrypted, saveCryptoKey, loadCryptoKey } from '@/lib/indexeddb';
import { migrateFromLocalStorage } from '@/lib/migrate-storage';
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

          // リロード時: IndexedDBからCryptoKeyを復元してマッピングを読み込む
          const savedKey = await loadCryptoKey();
          if (savedKey) {
            keyRef.current = savedKey;
            await setEncryptionKey(savedKey);
          }
        }
      } catch {
        // ネットワークエラーなど
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // CryptoKeyをIndexedDBに保存（リロード時に復元するため）
    await saveCryptoKey(key);

    // localStorageに旧データがあれば暗号化してIndexedDBに移行
    const migrated = await migrateFromLocalStorage(key);
    if (migrated) {
      console.log('localStorageのデータをIndexedDBに移行しました');
    }

    // PseudonymContextに鍵を渡してデータを復号・読み込み
    await setEncryptionKey(key);

    // ユーザー情報を取得してstateにセット（router.pushではリロードしないため）
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
    const res = await fetch(`${BASE_URL}/api/auth/me`, { credentials: 'include' });
    if (res.ok) {
      const userData = await res.json();
      setUser(userData);
    }
  };

  // ログアウト: Cookie削除 → メモリ上の鍵破棄 → マッピングクリア → ログイン画面へ
  // ※ CryptoKeyはIndexedDBに残す（再ログイン時にすぐ名前を復元するため）
  const logout = useCallback(() => {
    apiLogout().catch(() => {}); // サーバーにCookie削除を依頼
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
