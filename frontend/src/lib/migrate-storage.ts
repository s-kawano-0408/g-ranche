// localStorage → IndexedDB マイグレーション
// 初回ログイン時に一度だけ実行される

import { encrypt, generateSalt } from '@/lib/crypto';
import { saveEncrypted } from '@/lib/indexeddb';

const OLD_STORAGE_KEY = 'pseudonym_mappings';

/** localStorageの旧データを暗号化してIndexedDBに移行する */
export async function migrateFromLocalStorage(key: CryptoKey): Promise<boolean> {
  // localStorageに旧データがあるか確認
  const stored = localStorage.getItem(OLD_STORAGE_KEY);
  if (!stored) return false; // 移行不要

  // 暗号化してIndexedDBに保存
  const salt = generateSalt();
  const saltBase64 = btoa(String.fromCharCode(...salt));
  const { iv, ciphertext } = await encrypt(key, stored);
  await saveEncrypted(OLD_STORAGE_KEY, { iv, salt: saltBase64, ciphertext });

  // localStorageから旧データを削除
  localStorage.removeItem(OLD_STORAGE_KEY);

  return true; // 移行した
}
