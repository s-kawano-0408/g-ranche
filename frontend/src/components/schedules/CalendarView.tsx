'use client';

import { useState } from 'react';
import { Schedule } from '@/types';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const typeColors: Record<string, string> = {
  面談: 'bg-blue-500',
  訪問: 'bg-green-500',
  モニタリング: 'bg-orange-500',
  会議: 'bg-purple-500',
  その他: 'bg-gray-400',
};

const typeBgColors: Record<string, string> = {
  面談: 'bg-blue-100 text-blue-800 border-blue-200',
  訪問: 'bg-green-100 text-green-800 border-green-200',
  モニタリング: 'bg-orange-100 text-orange-800 border-orange-200',
  会議: 'bg-purple-100 text-purple-800 border-purple-200',
  その他: 'bg-gray-100 text-gray-700 border-gray-200',
};

interface CalendarViewProps {
  schedules: Schedule[];
  onNewSchedule?: (date: string) => void;
  onEditSchedule?: (schedule: Schedule) => void;
  onDeleteSchedule?: (id: number) => void;
}

export default function CalendarView({ schedules, onNewSchedule, onEditSchedule, onDeleteSchedule }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogSchedules, setDialogSchedules] = useState<Schedule[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));

  const getSchedulesForDate = (date: Date) => {
    return schedules.filter(s => {
      const sd = new Date(s.start_datetime);
      return sd.getFullYear() === date.getFullYear() &&
        sd.getMonth() === date.getMonth() &&
        sd.getDate() === date.getDate();
    });
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const today = new Date();

  const toLocalDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatDateLabel = (date: Date) => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${days[date.getDay()]}）`;
  };

  const formatTimeRange = (s: Schedule) => {
    const start = new Date(s.start_datetime);
    const end = new Date(s.end_datetime);
    const fmt = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${fmt(start)} − ${fmt(end)}`;
  };

  const getClientName = (s: Schedule) => {
    if (!s.client_id) return null;
    const client = s.client;
    if (client) {
      return `${client.family_name} ${client.given_name}`;
    }
    return null;
  };

  const handleDateClick = (date: Date) => {
    const daySchedules = getSchedulesForDate(date);
    if (daySchedules.length === 0 && onNewSchedule) {
      // スケジュールなし → 直接新規作成
      onNewSchedule(toLocalDateStr(date));
    } else {
      // スケジュールあり → 一覧ダイアログ
      setDialogSchedules(daySchedules);
      setSelectedDate(date);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="icon" onClick={prevMonth}>
          <ChevronLeft size={16} />
        </Button>
        <button
          onClick={() => setCurrentDate(new Date())}
          className="font-semibold text-gray-900 text-lg hover:text-teal-600 transition-colors cursor-pointer"
          title="今月に戻る"
        >
          {year}年{month + 1}月
        </button>
        <Button variant="outline" size="icon" onClick={nextMonth}>
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(typeBgColors).map(([type, color]) => (
          <div key={type} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${color}`}>
            <div className={`w-2 h-2 rounded-full ${typeColors[type]}`} />
            {type}
          </div>
        ))}
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
          <div key={d} className={`text-center text-xs font-medium py-2 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {days.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className="bg-gray-50 min-h-[60px] sm:min-h-[80px]" />;
          }
          const daySchedules = getSchedulesForDate(day);
          const isToday = day.toDateString() === today.toDateString();
          const dayOfWeek = day.getDay();

          return (
            <div
              key={day.toISOString()}
              className="bg-white min-h-[60px] sm:min-h-[80px] p-1 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => handleDateClick(day)}
            >
              <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                isToday ? 'bg-teal-600 text-white' :
                dayOfWeek === 0 ? 'text-red-500' :
                dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-700'
              }`}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {/* モバイル: 件数バッジのみ、デスクトップ: スケジュール名表示 */}
                {daySchedules.length > 0 && (
                  <div className="sm:hidden text-xs text-center">
                    <span className={`inline-block w-5 h-5 leading-5 rounded-full text-white font-medium ${typeColors[daySchedules[0].schedule_type] || 'bg-gray-400'}`}>
                      {daySchedules.length}
                    </span>
                  </div>
                )}
                <div className="hidden sm:block space-y-0.5">
                  {daySchedules.slice(0, 2).map(s => (
                    <div
                      key={s.id}
                      className={`text-xs px-1 py-0.5 rounded truncate border ${typeBgColors[s.schedule_type] || typeBgColors['その他']}`}
                    >
                      {s.title}
                    </div>
                  ))}
                  {daySchedules.length > 2 && (
                    <div className="text-xs text-gray-400 px-1">+{daySchedules.length - 2}件</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 日付のスケジュール一覧ダイアログ */}
      <Dialog open={selectedDate !== null} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="max-w-sm overflow-hidden">
          <DialogHeader>
            <DialogTitle>{selectedDate && formatDateLabel(selectedDate)}</DialogTitle>
          </DialogHeader>

          {dialogSchedules.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">この日の予定はありません</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto -mx-1 px-1">
              {dialogSchedules.map(s => (
                <div key={s.id} className="border rounded-lg p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border shrink-0 ${typeBgColors[s.schedule_type] || typeBgColors['その他']}`}>
                      {s.schedule_type}
                    </span>
                    <span className="font-medium text-sm text-gray-900 truncate flex-1">{s.title}</span>
                    <button
                      onClick={() => { setSelectedDate(null); onEditSchedule?.(s); }}
                      className="p-1 text-gray-400 hover:text-teal-600 rounded shrink-0"
                      title="編集"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`「${s.title}」を削除しますか？`)) {
                          onDeleteSchedule?.(s.id);
                          setSelectedDate(null);
                        }
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 rounded shrink-0"
                      title="削除"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5 pl-1">
                    <p>{formatTimeRange(s)}</p>
                    {getClientName(s) && <p>利用者: {getClientName(s)}</p>}
                    {s.location && <p>場所: {s.location}</p>}
                    {s.notes && <p>備考: {s.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            className="w-full bg-teal-600 hover:bg-teal-700 gap-2"
            onClick={() => {
              setSelectedDate(null);
              if (selectedDate && onNewSchedule) {
                onNewSchedule(toLocalDateStr(selectedDate));
              }
            }}
          >
            <Plus size={16} />
            新規スケジュール
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
