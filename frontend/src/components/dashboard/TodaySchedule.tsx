'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Calendar, MapPin } from 'lucide-react';
import { Schedule } from '@/types';
import { getTodaySchedules } from '@/lib/api';
import { usePseudonym } from '@/contexts/PseudonymContext';

const typeConfig: Record<string, { label: string; color: string }> = {
  面談: { label: '面談', color: 'bg-blue-100 text-blue-700' },
  訪問: { label: '訪問', color: 'bg-green-100 text-green-700' },
  モニタリング: { label: 'モニタリング', color: 'bg-orange-100 text-orange-700' },
  会議: { label: '会議', color: 'bg-purple-100 text-purple-700' },
  その他: { label: 'その他', color: 'bg-gray-100 text-gray-700' },
};

function formatTime(dt: string) {
  const d = new Date(dt);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

export default function TodaySchedule() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const { resolve } = usePseudonym();

  useEffect(() => {
    getTodaySchedules()
      .then(setSchedules)
      .catch(() => setSchedules([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={18} className="text-teal-600" />
        <h3 className="font-semibold text-gray-900">本日のスケジュール</h3>
        <span className="ml-auto text-sm text-gray-500">{schedules.length}件</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Calendar size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">本日の予定はありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map(s => {
            const config = typeConfig[s.schedule_type] || typeConfig['その他'];
            return (
              <div key={s.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-center min-w-[48px]">
                  <p className="text-xs text-gray-500">{formatTime(s.start_datetime)}</p>
                  <p className="text-xs text-gray-400">{formatTime(s.end_datetime)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  {s.location && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin size={11} className="text-gray-400" />
                      <p className="text-xs text-gray-400 truncate">{s.location}</p>
                    </div>
                  )}
                  {s.client && (
                    <p className="text-xs text-gray-500 mt-0.5">{s.client.pseudonym_hash ? (resolve(s.client.pseudonym_hash)?.family_name ?? '仮名利用者') : '仮名利用者'}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
