'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SWRConfig } from 'swr';
import Sidebar from '@/components/layout/Sidebar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// 認証チェック付きのレイアウト
function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isLoginPage = pathname === '/login';

  // 未ログインならログインページにリダイレクト
  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.push('/login');
    }
  }, [user, loading, isLoginPage, router]);

  // ログインページ: サイドバーなし
  if (isLoginPage) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        {children}
      </div>
    );
  }

  // 読み込み中
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  // 未ログイン（リダイレクト待ち）
  if (!user) {
    return null;
  }

  // ログイン済み: サイドバーあり
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0">
        {children}
      </div>
    </div>
  );
}

// AuthProviderでラップ
export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{
      revalidateOnFocus: false,      // タブ切替で再フェッチしない
      revalidateOnReconnect: false,  // ネット復帰で再フェッチしない
      dedupingInterval: 30000,       // 30秒以内の同じリクエストは重複排除
      errorRetryCount: 2,            // エラー時リトライは2回まで
    }}>
      <AuthProvider>
        <LayoutContent>{children}</LayoutContent>
      </AuthProvider>
    </SWRConfig>
  );
}
