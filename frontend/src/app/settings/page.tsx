'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { KeyRound, Check, Upload, Download, Trash2, RefreshCw, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePseudonym, ClientPersonalInfo } from '@/contexts/PseudonymContext';
import { getUsers, changePassword, getClients } from '@/lib/api';

interface UserItem {
  id: number;
  email: string;
  name: string;
  role: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { mappings, importFromFile, exportToFile, clearMappings, generateHash, addMapping } = usePseudonym();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // パスワード管理
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwords, setPasswords] = useState<Record<number, string>>({});
  const [success, setSuccess] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});

  // マッピング管理
  const [importResult, setImportResult] = useState('');
  const mappingCount = Object.keys(mappings).length;

  // 復元フォーム
  const [restoreCert, setRestoreCert] = useState('');
  const [restoreBirthDate, setRestoreBirthDate] = useState('');
  const [restoreFamilyName, setRestoreFamilyName] = useState('');
  const [restoreGivenName, setRestoreGivenName] = useState('');
  const [restoreFamilyNameKana, setRestoreFamilyNameKana] = useState('');
  const [restoreGivenNameKana, setRestoreGivenNameKana] = useState('');
  const [restoreResult, setRestoreResult] = useState('');
  const [restoring, setRestoring] = useState(false);

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

  // JSONインポート
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const count = await importFromFile(file);
      setImportResult(`${count}件のマッピングをインポートしました`);
      setTimeout(() => setImportResult(''), 3000);
    } catch {
      setImportResult('インポートに失敗しました。JSONファイルを確認してください。');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // マッピング復元
  const handleRestore = async () => {
    if (!restoreCert || !restoreBirthDate || !restoreFamilyName || !restoreGivenName || !restoreFamilyNameKana || !restoreGivenNameKana) {
      setRestoreResult('すべての項目を入力してください');
      return;
    }

    setRestoring(true);
    setRestoreResult('');

    try {
      // ブラウザ内でハッシュを生成
      const hash = await generateHash(restoreCert, restoreBirthDate);

      // DB上の既存ハッシュと照合
      const clients = await getClients();
      const matched = clients.find(c => c.pseudonym_hash === hash);

      if (matched) {
        const personal: ClientPersonalInfo = {
          family_name: restoreFamilyName,
          given_name: restoreGivenName,
          family_name_kana: restoreFamilyNameKana,
          given_name_kana: restoreGivenNameKana,
          birth_date: restoreBirthDate,
          certificate_number: restoreCert,
        };
        addMapping(hash, personal);
        setRestoreResult(`復元成功: ${restoreFamilyName} ${restoreGivenName} さんのマッピングを復元しました`);
        // フォームリセット
        setRestoreCert('');
        setRestoreBirthDate('');
        setRestoreFamilyName('');
        setRestoreGivenName('');
        setRestoreFamilyNameKana('');
        setRestoreGivenNameKana('');
      } else {
        setRestoreResult('一致する利用者が見つかりません。受給者証番号と生年月日を確認してください。');
      }
    } catch {
      setRestoreResult('復元に失敗しました');
    } finally {
      setRestoring(false);
    }
  };

  if (user?.role !== 'admin') return null;

  return (
    <div className="flex flex-col flex-1">
      <Header title="設定" description="ユーザー管理・個人情報マッピング" />

      <div className="flex-1 p-8 max-w-2xl space-y-8">

        {/* 個人情報マッピングセクション */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield size={20} className="text-teal-600" />
            個人情報マッピング
          </h2>

          <Card className="p-5 space-y-4">
            <p className="text-sm text-gray-600">
              現在 <span className="font-semibold text-teal-700">{mappingCount}人分</span> のマッピングが読み込まれています。
            </p>

            <div className="flex gap-2 flex-wrap">
              {/* インポート */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={15} />
                JSONインポート
              </Button>

              {/* エクスポート */}
              <Button
                variant="outline"
                className="gap-2"
                onClick={exportToFile}
                disabled={mappingCount === 0}
              >
                <Download size={15} />
                JSONエクスポート
              </Button>

              {/* クリア */}
              <Button
                variant="outline"
                className="gap-2 text-red-600 hover:text-red-700"
                onClick={() => {
                  if (confirm('すべてのマッピングを削除しますか？\nJSONファイルのバックアップがあることを確認してください。')) {
                    clearMappings();
                  }
                }}
                disabled={mappingCount === 0}
              >
                <Trash2 size={15} />
                クリア
              </Button>
            </div>

            {importResult && (
              <p className={`text-sm ${importResult.includes('失敗') ? 'text-red-500' : 'text-teal-600'} flex items-center gap-1`}>
                <Check size={14} />
                {importResult}
              </p>
            )}
          </Card>
        </div>

        {/* マッピング復元セクション */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <RefreshCw size={20} className="text-teal-600" />
            マッピング復元
          </h2>

          <Card className="p-5 space-y-4">
            <p className="text-sm text-gray-500">
              JSONファイルを紛失した場合、受給者証番号と生年月日からマッピングを復元できます。
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">受給者証番号 *</label>
                <Input value={restoreCert} onChange={e => setRestoreCert(e.target.value)} placeholder="例: 1311000001" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">生年月日 *</label>
                <Input type="date" value={restoreBirthDate} onChange={e => setRestoreBirthDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">姓 *</label>
                <Input value={restoreFamilyName} onChange={e => setRestoreFamilyName(e.target.value)} placeholder="例: 山田" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">名 *</label>
                <Input value={restoreGivenName} onChange={e => setRestoreGivenName(e.target.value)} placeholder="例: 太郎" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">セイ *</label>
                <Input value={restoreFamilyNameKana} onChange={e => setRestoreFamilyNameKana(e.target.value)} placeholder="例: ヤマダ" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">メイ *</label>
                <Input value={restoreGivenNameKana} onChange={e => setRestoreGivenNameKana(e.target.value)} placeholder="例: タロウ" />
              </div>
            </div>

            <Button
              onClick={handleRestore}
              disabled={restoring}
              className="bg-teal-600 hover:bg-teal-700 gap-2"
            >
              <RefreshCw size={15} />
              {restoring ? '照合中...' : '復元する'}
            </Button>

            {restoreResult && (
              <p className={`text-sm ${restoreResult.includes('成功') ? 'text-teal-600' : 'text-red-500'}`}>
                {restoreResult}
              </p>
            )}
          </Card>
        </div>

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
