'use client';

import { useState } from 'react';
import { Schedule } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  onDateClick?: (date: Date) => void;
}

export default function CalendarView({ schedules, onDateClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="icon" onClick={prevMonth}>
          <ChevronLeft size={16} />
        </Button>
        <h3 className="font-semibold text-gray-900 text-lg">
          {year}年{month + 1}月
        </h3>
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
            return <div key={`empty-${i}`} className="bg-gray-50 min-h-[80px]" />;
          }
          const daySchedules = getSchedulesForDate(day);
          const isToday = day.toDateString() === today.toDateString();
          const dayOfWeek = day.getDay();

          return (
            <div
              key={day.toISOString()}
              className="bg-white min-h-[80px] p-1 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => onDateClick?.(day)}
            >
              <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                isToday ? 'bg-teal-600 text-white' :
                dayOfWeek === 0 ? 'text-red-500' :
                dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-700'
              }`}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {daySchedules.slice(0, 2).map(s => (
                  <div
                    key={s.id}
                    className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer border ${typeBgColors[s.schedule_type] || typeBgColors['その他']}`}
                    onClick={e => { e.stopPropagation(); setSelectedSchedule(s); }}
                  >
                    {s.title}
                  </div>
                ))}
                {daySchedules.length > 2 && (
                  <div className="text-xs text-gray-400 px-1">+{daySchedules.length - 2}件</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail popup */}
      {selectedSchedule && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center" onClick={() => setSelectedSchedule(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-semibold text-gray-900">{selectedSchedule.title}</h4>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setSelectedSchedule(null)}>✕</button>
            </div>
            <div className={`inline-block text-xs px-2 py-1 rounded-full border mb-3 ${typeBgColors[selectedSchedule.schedule_type] || typeBgColors['その他']}`}>
              {selectedSchedule.schedule_type}
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>開始: {new Date(selectedSchedule.start_datetime).toLocaleString('ja-JP')}</p>
              <p>終了: {new Date(selectedSchedule.end_datetime).toLocaleString('ja-JP')}</p>
              {selectedSchedule.location && <p>場所: {selectedSchedule.location}</p>}
              {selectedSchedule.client && <p>利用者: {selectedSchedule.client.name}</p>}
              {selectedSchedule.notes && <p>備考: {selectedSchedule.notes}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
