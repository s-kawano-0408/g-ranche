// 暗号化・復号ユーティリティ（Web Crypto API）
// パスワードからAES-GCM暗号鍵を導出し、データを暗号化・復号する

/** ランダムなsalt（16バイト）を生成する */
export function generateSalt(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(16));
}

/** パスワード + salt → PBKDF2(10万回) → AES-GCM暗号鍵を導出する */
export async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  // パスワード（文字列）を「鍵の素材」に変換
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // 素材 + salt → 10万回ハッシュ → AES-GCM用の暗号鍵を生成
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** データをAES-GCMで暗号化する（毎回ランダムなIVを使う） */
export async function encrypt(
  key: CryptoKey,
  data: string
): Promise<{ iv: string; ciphertext: string }> {
  // 毎回ランダムなIV（12バイト）を生成
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // データを暗号化
  const encoded = new TextEncoder().encode(data);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  // バイナリデータをBase64文字列に変換して返す
  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
  };
}

/** 暗号化されたデータを復号する */
export async function decrypt(
  key: CryptoKey,
  iv: string,
  ciphertext: string
): Promise<string> {
  // Base64文字列をバイナリに戻す
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const encryptedBytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

  // 復号
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    encryptedBytes
  );

  // バイナリを文字列に戻す
  return new TextDecoder().decode(decrypted);
}
