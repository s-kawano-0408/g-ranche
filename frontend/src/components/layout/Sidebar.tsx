'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Calendar, FileText, Bot, ClipboardList, LogOut, Settings, Menu, X, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/clients', label: '利用者管理', icon: Users },
  { href: '/monthly-tasks', label: '月間業務管理', icon: ClipboardList },
  { href: '/schedules', label: 'スケジュール', icon: Calendar },
  { href: '/records', label: '支援記録', icon: FileText },
  { href: '/ai', label: 'AIアシスタント', icon: Bot },
  { href: '/transcription', label: 'Excel転記', icon: FileSpreadsheet },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  // ページ遷移時にメニューを閉じる
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // メニューが開いているときにスクロールを防止
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h1 className="text-teal-400 font-bold text-lg leading-tight">
            ぐ・らんちぇ
          </h1>
          <p className="text-slate-500 text-xs mt-1">管理システム</p>
        </div>
        {/* モバイル: 閉じるボタン */}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden text-slate-400 hover:text-white p-1"
        >
          <X size={20} />
        </button>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
        {user?.role === 'admin' && (
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
              pathname === '/settings' || pathname.startsWith('/settings/')
                ? 'bg-teal-600 text-white'
                : 'text-slate-400 hover:bg-slate-700 hover:text-white'
            )}
          >
            <Settings size={18} />
            設定
          </Link>
        )}
      </nav>
      <div className="p-4 border-t border-slate-700 space-y-3">
        {user && (
          <div className="px-2">
            <p className="text-slate-300 text-sm font-medium">{user.name}</p>
            <p className="text-slate-500 text-xs">{user.role === 'admin' ? '管理者' : 'スタッフ'}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors w-full"
        >
          <LogOut size={18} />
          ログアウト
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* モバイル: ハンバーガーボタン */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-slate-900 text-white p-2 rounded-lg shadow-lg"
        aria-label="メニューを開く"
      >
        <Menu size={20} />
      </button>

      {/* デスクトップ: 固定サイドバー */}
      <aside className="hidden lg:flex w-64 min-h-screen bg-slate-900 flex-col fixed left-0 top-0 z-40">
        {sidebarContent}
      </aside>

      {/* モバイル: オーバーレイ + ドロワー */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setOpen(false)}
        >
          <aside
            className="w-64 min-h-screen bg-slate-900 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
