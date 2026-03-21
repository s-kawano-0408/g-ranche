'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { KeyRound, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUsers, changePassword } from '@/lib/api';

interface UserItem {
  id: number;
  email: string;
  name: string;
  role: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // パスワード管理
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwords, setPasswords] = useState<Record<number, string>>({});
  const [success, setSuccess] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    async function load() {
      try {
        const data = await getUsers();
        setUsers(data);
      } catch {
        console.error('ユーザー一覧の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, router]);

  const handleChangePassword = async (userId: number) => {
    const newPassword = passwords[userId];
    if (!newPassword || newPassword.length < 6) {
      setErrors(prev => ({ ...prev, [userId]: '6文字以上で入力してください' }));
      return;
    }

    setSubmitting(prev => ({ ...prev, [userId]: true }));
    setErrors(prev => ({ ...prev, [userId]: '' }));
    setSuccess(prev => ({ ...prev, [userId]: false }));

    try {
      await changePassword(userId, newPassword);
      setSuccess(prev => ({ ...prev, [userId]: true }));
      setPasswords(prev => ({ ...prev, [userId]: '' }));
      setTimeout(() => {
        setSuccess(prev => ({ ...prev, [userId]: false }));
      }, 3000);
    } catch {
      setErrors(prev => ({ ...prev, [userId]: 'パスワードの変更に失敗しました' }));
    } finally {
      setSubmitting(prev => ({ ...prev, [userId]: false }));
    }
  };

  if (user?.role !== 'admin') return null;

  return (
    <div className="flex flex-col flex-1">
      <Header title="設定" description="ユーザー管理" />

      <div className="flex-1 p-4 sm:p-8 max-w-2xl space-y-8">

        {/* パスワード変更セクション */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">パスワード変更</h2>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {users.map(u => (
                <Card key={u.id} className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                      <KeyRound size={18} className="text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-sm text-gray-500">
                        {u.email} / {u.role === 'admin' ? '管理者' : 'スタッフ'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="新しいパスワード"
                      value={passwords[u.id] || ''}
                      onChange={e => setPasswords(prev => ({ ...prev, [u.id]: e.target.value }))}
                    />
                    <Button
                      onClick={() => handleChangePassword(u.id)}
                      disabled={submitting[u.id]}
                      className="bg-teal-600 hover:bg-teal-700 shrink-0"
                    >
                      {submitting[u.id] ? '変更中...' : '変更'}
                    </Button>
                  </div>
                  {errors[u.id] && (
                    <p className="text-sm text-red-500 mt-2">{errors[u.id]}</p>
                  )}
                  {success[u.id] && (
                    <p className="text-sm text-teal-600 mt-2 flex items-center gap-1">
                      <Check size={14} />
                      パスワードを変更しました
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
