'use client';

import { useState } from 'react';
import { Schedule, Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface ScheduleFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Schedule, 'id'>) => Promise<void>;
  clients: Client[];
  initialData?: Partial<Schedule>;
}

function toLocalDatetimeInput(dt: string) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toISOString().slice(0, 16);
}

export default function ScheduleForm({ open, onClose, onSubmit, clients, initialData }: ScheduleFormProps) {
  const now = new Date();
  const defaultStart = now.toISOString().slice(0, 16);
  now.setHours(now.getHours() + 1);
  const defaultEnd = now.toISOString().slice(0, 16);

  const [form, setForm] = useState({
    title: initialData?.title || '',
    schedule_type: initialData?.schedule_type || '面談',
    start_datetime: initialData?.start_datetime ? toLocalDatetimeInput(initialData.start_datetime) : defaultStart,
    end_datetime: initialData?.end_datetime ? toLocalDatetimeInput(initialData.end_datetime) : defaultEnd,
    location: initialData?.location || '',
    notes: initialData?.notes || '',
    status: initialData?.status || 'scheduled',
    client_id: initialData?.client_id ?? null as number | null,
    staff_id: initialData?.staff_id || 1,
  });
  const [loading, setLoading] = useState(false);

  const set = (key: string, value: string | number | null | undefined) => {
    setForm(prev => ({ ...prev, [key]: value ?? null }));
  };

  const handleSubmit = async () => {
    if (!form.title) return;
    try {
      setLoading(true);
      await onSubmit(form as Omit<Schedule, 'id'>);
      onClose();
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
          <DialogTitle>新規スケジュール</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">タイトル *</label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="スケジュールのタイトル" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">種別</label>
              <Select value={form.schedule_type} onValueChange={v => set('schedule_type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="面談">面談</SelectItem>
                  <SelectItem value="訪問">訪問</SelectItem>
                  <SelectItem value="モニタリング">モニタリング</SelectItem>
                  <SelectItem value="会議">会議</SelectItem>
                  <SelectItem value="その他">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">利用者</label>
              <Select
                value={form.client_id !== null ? String(form.client_id) : 'none'}
                onValueChange={v => set('client_id', v === 'none' ? null : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択なし" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">選択なし</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">開始日時</label>
              <Input type="datetime-local" value={form.start_datetime} onChange={e => set('start_datetime', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">終了日時</label>
              <Input type="datetime-local" value={form.end_datetime} onChange={e => set('end_datetime', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">場所</label>
            <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="実施場所" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">備考</label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="備考" rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>キャンセル</Button>
          <Button onClick={handleSubmit} disabled={loading || !form.title} className="bg-teal-600 hover:bg-teal-700">
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
