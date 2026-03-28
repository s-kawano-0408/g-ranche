'use client';

import { useState, useEffect, useRef } from 'react';
import { Schedule, Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ClientCombobox from '@/components/clients/ClientCombobox';
import { useToast } from '@/contexts/ToastContext';

interface ScheduleFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Schedule, 'id'>) => Promise<void>;
  clients: Client[];
  initialData?: Partial<Schedule>;
  defaultDate?: string; // "YYYY-MM-DD" カレンダーからの日付指定
}

// 15分刻みの時刻リスト（"00:00" 〜 "23:45"）
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, '0');
  const m = String((i % 4) * 15).padStart(2, '0');
  return `${h}:${m}`;
});

// Googleカレンダー風の時刻セレクター
function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [isOpen]);

  // 開いた時に現在の値までスクロール
  useEffect(() => {
    if (isOpen && listRef.current) {
      const idx = TIME_OPTIONS.indexOf(value);
      if (idx >= 0) {
        const item = listRef.current.children[idx] as HTMLElement;
        item?.scrollIntoView({ block: 'center' });
      }
    }
  }, [isOpen, value]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 px-3 rounded-md border border-gray-200 bg-white text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-400 min-w-[80px] text-center"
      >
        {value || '--:--'}
      </button>
      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-[120px] max-h-[200px] overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg"
        >
          {TIME_OPTIONS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { onChange(t); setIsOpen(false); }}
              className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-100 ${
                t === value ? 'bg-teal-50 text-teal-700 font-medium' : ''
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function extractDate(dt: string): string {
  if (!dt) return new Date().toISOString().slice(0, 10);
  return new Date(dt).toISOString().slice(0, 10);
}

function extractTime(dt: string): string {
  if (!dt) return '';
  const d = new Date(dt);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function roundToNext15(date: Date): Date {
  const ms = 15 * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function ScheduleForm({ open, onClose, onSubmit, clients, initialData, defaultDate }: ScheduleFormProps) {
  const { showToast } = useToast();

  const [form, setForm] = useState({
    title: '',
    schedule_type: '面談',
    location: '',
    notes: '',
    status: 'scheduled',
    client_id: null as number | null,
    staff_id: 1,
  });

  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);

  // ダイアログが開くたびにフォームをリセット
  useEffect(() => {
    if (open) {
      const rounded = roundToNext15(new Date());
      const dateDefault = defaultDate || rounded.toISOString().slice(0, 10);
      const defaultStartTime = formatTime(rounded);
      const defaultEndTime = formatTime(new Date(rounded.getTime() + 60 * 60 * 1000));

      setForm({
        title: initialData?.title || '',
        schedule_type: initialData?.schedule_type || '面談',
        location: initialData?.location || '',
        notes: initialData?.notes || '',
        status: initialData?.status || 'scheduled',
        client_id: initialData?.client_id ?? null,
        staff_id: initialData?.staff_id || 1,
      });
      setStartDate(initialData?.start_datetime ? extractDate(initialData.start_datetime) : dateDefault);
      setStartTime(initialData?.start_datetime ? extractTime(initialData.start_datetime) : defaultStartTime);
      setEndDate(initialData?.end_datetime ? extractDate(initialData.end_datetime) : dateDefault);
      setEndTime(initialData?.end_datetime ? extractTime(initialData.end_datetime) : defaultEndTime);
    }
  }, [open, initialData, defaultDate]);

  const set = (key: string, value: string | number | null | undefined) => {
    setForm(prev => ({ ...prev, [key]: value ?? null }));
  };


  const handleSubmit = async () => {
    if (!form.title) return;
    try {
      setLoading(true);
      const submitData = {
        ...form,
        start_datetime: `${startDate}T${startTime}`,
        end_datetime: `${endDate}T${endTime}`,
      } as Omit<Schedule, 'id'>;
      await onSubmit(submitData);
      onClose();
      showToast(initialData?.title ? 'スケジュールを更新しました' : 'スケジュールを登録しました');
    } catch (e) {
      console.error(e);
      showToast(initialData?.title ? '更新に失敗しました' : '登録に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData?.title ? 'スケジュール編集' : '新規スケジュール'}</DialogTitle>
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
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
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
              <ClientCombobox
                clients={clients}
                value={form.client_id}
                onChange={id => set('client_id', id)}
                allowEmpty
                emptyLabel="選択なし"
                placeholder="利用者を検索..."
              />
            </div>
          </div>

          {/* 日時入力（Googleカレンダー風） */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">日時</label>
            <div className="flex items-center gap-2">
              <Input type="date" value={startDate} onChange={e => {
                setStartDate(e.target.value);
                setEndDate(e.target.value);
              }} className="w-[140px] shrink-0" />
              <TimePicker value={startTime} onChange={setStartTime} />
              <span className="text-gray-400 shrink-0">−</span>
              <TimePicker value={endTime} onChange={setEndTime} />
            </div>
            {startDate !== endDate && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">終了日:</span>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-[140px]" />
              </div>
            )}
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
