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

const defaultData: Omit<Client, 'id'> = {
  name: '',
  name_kana: '',
  birth_date: '',
  gender: '',
  disability_type: '',
  disability_certificate_level: '',
  address: '',
  phone: '',
  emergency_contact: '',
  emergency_phone: '',
  staff_id: 1,
  status: 'active',
  intake_date: new Date().toISOString().split('T')[0],
  notes: '',
};

export default function ClientForm({ open, onClose, onSubmit, initialData, title = '新規利用者登録' }: ClientFormProps) {
  const [form, setForm] = useState<Omit<Client, 'id'>>({ ...defaultData, ...initialData });
  const [loading, setLoading] = useState(false);

  const set = (key: keyof Omit<Client, 'id'>, value: string | number | null) => {
    setForm(prev => ({ ...prev, [key]: value ?? '' }));
  };

  const handleSubmit = async () => {
    if (!form.name) return;
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">氏名 *</label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="例: 山田 太郎" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">フリガナ</label>
            <Input value={form.name_kana} onChange={e => set('name_kana', e.target.value)} placeholder="例: ヤマダ タロウ" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">生年月日</label>
            <Input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
          </div>
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
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">障害種別</label>
            <Select value={form.disability_type} onValueChange={v => set('disability_type', v)}>
              <SelectTrigger>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="身体障害">身体障害</SelectItem>
                <SelectItem value="知的障害">知的障害</SelectItem>
                <SelectItem value="精神障害">精神障害</SelectItem>
                <SelectItem value="発達障害">発達障害</SelectItem>
                <SelectItem value="難病">難病</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">障害程度区分</label>
            <Select value={form.disability_certificate_level} onValueChange={v => set('disability_certificate_level', v)}>
              <SelectTrigger>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {['区分1', '区分2', '区分3', '区分4', '区分5', '区分6'].map(l => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium text-gray-700">住所</label>
            <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="住所を入力" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">電話番号</label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="000-0000-0000" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">ステータス</label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">利用中</SelectItem>
                <SelectItem value="inactive">利用終了</SelectItem>
                <SelectItem value="pending">待機中</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">緊急連絡先氏名</label>
            <Input value={form.emergency_contact} onChange={e => set('emergency_contact', e.target.value)} placeholder="緊急連絡先の氏名" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">緊急連絡先電話番号</label>
            <Input value={form.emergency_phone} onChange={e => set('emergency_phone', e.target.value)} placeholder="000-0000-0000" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">利用開始日</label>
            <Input type="date" value={form.intake_date} onChange={e => set('intake_date', e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium text-gray-700">備考</label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="備考・特記事項" rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>キャンセル</Button>
          <Button onClick={handleSubmit} disabled={loading || !form.name} className="bg-teal-600 hover:bg-teal-700">
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
