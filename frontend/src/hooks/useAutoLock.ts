// 自動ロック: 一定時間操作がなかったらコールバックを実行する
import { useEffect, useRef } from 'react';

const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30分（ミリ秒）

/** 無操作タイマー。マウス・キーボード・タッチ操作でリセットされる */
export function useAutoLock(onLock: () => void, timeout = DEFAULT_TIMEOUT) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // タイマーをリセットする関数
    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(onLock, timeout);
    };

    // 監視するイベント（ユーザーが操作した = アクティブ）
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'touchstart', 'click'];

    // 各イベントにリスナーを登録
    events.forEach(event => window.addEventListener(event, resetTimer));

    // 初回タイマー開始
    resetTimer();

    // クリーンアップ（コンポーネントが消えるときにリスナーとタイマーを片付ける）
    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [onLock, timeout]);
}
