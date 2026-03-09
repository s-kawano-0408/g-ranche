'use client';

import { useState } from 'react';
import { Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface ClientFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Client, 'id'>) => Promise<void>;
  initialData?: Partial<Client>;
  title?: string;
}

// パート1: 初期値（フォームを開いたときの空の状態）
const defaultData: Omit<Client, 'id'> = {
  family_name: '',
  given_name: '',
  family_name_kana: '',
  given_name_kana: '',
  birth_date: '',
  gender: '',
  client_type: '',
  certificate_number: '',
  staff_id: 1,
  status: 'active',
  end_date: '',
  notes: '',
};

// 生年月日スクロール用の選択肢を生成
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - i);  // 今年〜100年前
const months = Array.from({ length: 12 }, (_, i) => i + 1);            // 1〜12月
const days = Array.from({ length: 31 }, (_, i) => i + 1);              // 1〜31日

export default function ClientForm({ open, onClose, onSubmit, initialData, title = '新規利用者登録' }: ClientFormProps) {
  const [form, setForm] = useState<Omit<Client, 'id'>>({ ...defaultData, ...initialData });
  const [loading, setLoading] = useState(false);

  // パート2: ロジック

  // 入力欄の値を更新する関数
  const set = (key: keyof Omit<Client, 'id'>, value: string | number | null) => {
    setForm(prev => ({ ...prev, [key]: value ?? '' }));
  };

  // 生年月日を年・月・日に分解する（"2000-05-15" → { year: "2000", month: "5", day: "15" }）
  const birthParts = form.birth_date ? form.birth_date.split('-') : ['', '', ''];
  const [birthYear, setBirthYear] = useState(birthParts[0] || '');
  const [birthMonth, setBirthMonth] = useState(birthParts[1] ? String(Number(birthParts[1])) : '');
  const [birthDay, setBirthDay] = useState(birthParts[2] ? String(Number(birthParts[2])) : '');

  // 年・月・日のどれかが変わったら、birth_date を組み立て直す
  const updateBirthDate = (y: string, m: string, d: string) => {
    if (y && m && d) {
      set('birth_date', `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    }
  };

  // 保存ボタン押したときの処理
  const handleSubmit = async () => {
    // 必須項目チェック
    if (!form.family_name || !form.given_name || !form.family_name_kana || !form.given_name_kana || !form.birth_date || !form.client_type || !form.certificate_number) return;
    try {
      setLoading(true);
      await onSubmit(form);
      onClose();
      setForm(defaultData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isValid = form.family_name && form.given_name && form.family_name_kana && form.given_name_kana && form.birth_date && form.client_type && form.certificate_number;

  // パート3: 見た目
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* 姓・名 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">姓 *</label>
            <Input value={form.family_name} onChange={e => set('family_name', e.target.value)} placeholder="例: 山田" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">名 *</label>
            <Input value={form.given_name} onChange={e => set('given_name', e.target.value)} placeholder="例: 太郎" />
          </div>

          {/* フリガナ */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">セイ *</label>
            <Input value={form.family_name_kana} onChange={e => set('family_name_kana', e.target.value)} placeholder="例: ヤマダ" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">メイ *</label>
            <Input value={form.given_name_kana} onChange={e => set('given_name_kana', e.target.value)} placeholder="例: タロウ" />
          </div>

          {/* 生年月日（スクロール式） */}
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium text-gray-700">生年月日 *</label>
            <div className="flex items-center gap-1">
              <select
                value={birthYear}
                onChange={e => { setBirthYear(e.target.value); updateBirthDate(e.target.value, birthMonth, birthDay); }}
                className="flex-1 h-10 px-2 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="">年</option>
                {years.map(y => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
              <span className="text-sm text-gray-500">年</span>
              <select
                value={birthMonth}
                onChange={e => { setBirthMonth(e.target.value); updateBirthDate(birthYear, e.target.value, birthDay); }}
                className="w-20 h-10 px-2 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="">月</option>
                {months.map(m => (
                  <option key={m} value={String(m)}>{m}</option>
                ))}
              </select>
              <span className="text-sm text-gray-500">月</span>
              <select
                value={birthDay}
                onChange={e => { setBirthDay(e.target.value); updateBirthDate(birthYear, birthMonth, e.target.value); }}
                className="w-20 h-10 px-2 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="">日</option>
                {days.map(d => (
                  <option key={d} value={String(d)}>{d}</option>
                ))}
              </select>
              <span className="text-sm text-gray-500">日</span>
            </div>
          </div>

          {/* 児/者 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">区分 *</label>
            <Select value={form.client_type} onValueChange={v => set('client_type', v)}>
              <SelectTrigger>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="児">児</SelectItem>
                <SelectItem value="者">者</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 受給者証番号 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">受給者証番号 *</label>
            <Input value={form.certificate_number} onChange={e => set('certificate_number', e.target.value)} placeholder="受給者証番号を入力" />
          </div>

          {/* 性別 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">性別</label>
            <Select value={form.gender} onValueChange={v => set('gender', v)}>
              <SelectTrigger>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="男性">男性</SelectItem>
                <SelectItem value="女性">女性</SelectItem>
                <SelectItem value="その他">その他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ステータス */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">ステータス</label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">利用中</SelectItem>
                <SelectItem value="inactive">利用終了</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 終了日 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">終了日</label>
            <Input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
          </div>

          {/* 備考 */}
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium text-gray-700">備考</label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="備考・特記事項" rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>キャンセル</Button>
          <Button onClick={handleSubmit} disabled={loading || !isValid} className="bg-teal-600 hover:bg-teal-700">
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
