'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { encrypt, decrypt, generateSalt } from '@/lib/crypto';
import { saveEncrypted, loadEncrypted, clearAll } from '@/lib/indexeddb';

// マッピングに保存する個人情報の型
export type ClientPersonalInfo = {
  family_name: string;
  given_name: string;
  family_name_kana: string;
  given_name_kana: string;
  birth_date: string;
  certificate_number: string;
};

// ハッシュをキーにした辞書型
type PseudonymMappings = Record<string, ClientPersonalInfo>;

// コンテキストで提供する関数・値の型
interface PseudonymContextType {
  mappings: PseudonymMappings;
  resolve: (hash: string) => ClientPersonalInfo | null;
  addMapping: (hash: string, data: ClientPersonalInfo) => void;
  importFromFile: (file: File) => Promise<number>;
  exportToFile: () => void;
  clearMappings: () => void;
  generateHash: (certificateNumber: string, birthDate: string) => Promise<string>;
  setEncryptionKey: (key: CryptoKey) => Promise<void>;
}

const STORAGE_KEY = 'pseudonym_mappings';

const PseudonymContext = createContext<PseudonymContextType | null>(null);

// ブラウザ側でSHA-256ハッシュを生成する関数（バックエンドと同じ結果になる）
async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.slice(0, 16);
}

export function PseudonymProvider({ children }: { children: ReactNode }) {
  const [mappings, setMappings] = useState<PseudonymMappings>({});

  // 暗号鍵をメモリに保持する（useRefはReactの再描画を起こさない変数）
  const keyRef = useRef<CryptoKey | null>(null);

  // 暗号化してIndexedDBに保存する
  const saveMappings = useCallback(async (newMappings: PseudonymMappings) => {
    setMappings(newMappings);

    if (!keyRef.current) return; // 鍵がなければ保存しない

    try {
      const json = JSON.stringify(newMappings);
      const { iv, ciphertext } = await encrypt(keyRef.current, json);

      // saltはIndexedDBに既に保存されているものを読み出す（なければ新規生成）
      const existing = await loadEncrypted(STORAGE_KEY);
      const salt = existing?.salt ?? btoa(String.fromCharCode(...generateSalt()));

      await saveEncrypted(STORAGE_KEY, { iv, salt, ciphertext });
    } catch {
      console.error('マッピングの保存に失敗しました');
    }
  }, []);

  // 暗号鍵をセットし、IndexedDBからデータを読み込んで復号する
  const setEncryptionKey = useCallback(async (key: CryptoKey) => {
    keyRef.current = key;

    try {
      const stored = await loadEncrypted(STORAGE_KEY);
      if (stored) {
        const json = await decrypt(key, stored.iv, stored.ciphertext);
        setMappings(JSON.parse(json));
      }
    } catch {
      console.error('マッピングの復号に失敗しました');
    }
  }, []);

  // ハッシュから個人情報を取得する
  const resolve = useCallback((hash: string): ClientPersonalInfo | null => {
    return mappings[hash] || null;
  }, [mappings]);

  // マッピングを1件追加する
  const addMapping = useCallback((hash: string, data: ClientPersonalInfo) => {
    const updated = { ...mappings, [hash]: data };
    saveMappings(updated);
  }, [mappings, saveMappings]);

  // JSONファイルからインポートする（追加された件数を返す）
  const importFromFile = useCallback(async (file: File): Promise<number> => {
    const text = await file.text();
    const imported: PseudonymMappings = JSON.parse(text);
    const updated = { ...mappings, ...imported };
    saveMappings(updated);
    return Object.keys(imported).length;
  }, [mappings, saveMappings]);

  // 全マッピングをJSONファイルとしてダウンロードする（復号済みデータをエクスポート）
  const exportToFile = useCallback(() => {
    const json = JSON.stringify(mappings, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pseudonym_mapping_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [mappings]);

  // 全マッピングを削除する（IndexedDBも空にする）
  const clearMappings = useCallback(() => {
    setMappings({});
    keyRef.current = null;
    clearAll().catch(() => console.error('IndexedDBのクリアに失敗しました'));
  }, []);

  // ブラウザ側でハッシュを生成する（復元用）
  const generateHash = useCallback(async (certificateNumber: string, birthDate: string): Promise<string> => {
    return sha256Hex(`${certificateNumber}:${birthDate}`);
  }, []);

  return (
    <PseudonymContext.Provider value={{
      mappings,
      resolve,
      addMapping,
      importFromFile,
      exportToFile,
      clearMappings,
      generateHash,
      setEncryptionKey,
    }}>
      {children}
    </PseudonymContext.Provider>
  );
}

// コンテキストを使うためのカスタムフック
export function usePseudonym() {
  const context = useContext(PseudonymContext);
  if (!context) {
    throw new Error('usePseudonym must be used within PseudonymProvider');
  }
  return context;
}
