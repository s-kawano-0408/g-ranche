'use client';

import { useState } from 'react';
import { CaseRecord, Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface RecordFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<CaseRecord, 'id'>) => Promise<void>;
  clients: Client[];
  defaultClientId?: number;
}

export default function RecordForm({ open, onClose, onSubmit, clients, defaultClientId }: RecordFormProps) {
  const [form, setForm] = useState({
    client_id: defaultClientId || (clients[0]?.id ?? 0),
    staff_id: 1,
    record_date: new Date().toISOString().split('T')[0],
    record_type: '面談',
    content: '',
    summary: '',
    next_action: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (key: string, value: string | number | null) => {
    setForm(prev => ({ ...prev, [key]: value ?? '' }));
  };

  const handleSubmit = async () => {
    if (!form.content || !form.client_id) return;
    try {
      setLoading(true);
      await onSubmit(form as Omit<CaseRecord, 'id'>);
      onClose();
      setForm(prev => ({ ...prev, content: '', summary: '', next_action: '' }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>新規支援記録</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">利用者 *</label>
              <Select value={String(form.client_id)} onValueChange={v => set('client_id', Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="利用者を選択" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">記録種別</label>
              <Select value={form.record_type} onValueChange={v => set('record_type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="面談">面談</SelectItem>
                  <SelectItem value="訪問">訪問</SelectItem>
                  <SelectItem value="電話">電話</SelectItem>
                  <SelectItem value="モニタリング">モニタリング</SelectItem>
                  <SelectItem value="会議">会議</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">記録日</label>
            <Input type="date" value={form.record_date} onChange={e => set('record_date', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">記録内容 *</label>
            <Textarea
              value={form.content}
              onChange={e => set('content', e.target.value)}
              placeholder="支援内容、利用者の状況、対応内容を記入してください"
              rows={5}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">要約</label>
            <Textarea
              value={form.summary}
              onChange={e => set('summary', e.target.value)}
              placeholder="記録の要約（任意）"
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">次回対応事項</label>
            <Input
              value={form.next_action}
              onChange={e => set('next_action', e.target.value)}
              placeholder="次回の対応事項（任意）"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>キャンセル</Button>
          <Button onClick={handleSubmit} disabled={loading || !form.content} className="bg-teal-600 hover:bg-teal-700">
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
