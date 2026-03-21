'use client';

import { CaseRecord, Client } from '@/types';
import { MessageSquare, Home, Phone, BarChart2, Users, Pencil } from 'lucide-react';

const typeConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  面談: { icon: <MessageSquare size={14} />, color: 'text-blue-600', bgColor: 'bg-blue-100', label: '面談' },
  訪問: { icon: <Home size={14} />, color: 'text-green-600', bgColor: 'bg-green-100', label: '訪問' },
  電話: { icon: <Phone size={14} />, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: '電話' },
  モニタリング: { icon: <BarChart2 size={14} />, color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'モニタリング' },
  会議: { icon: <Users size={14} />, color: 'text-purple-600', bgColor: 'bg-purple-100', label: '会議' },
};

interface RecordTimelineProps {
  records: CaseRecord[];
  clients?: Client[];
  onEdit?: (record: CaseRecord) => void;
}

export default function RecordTimeline({ records, clients, onEdit }: RecordTimelineProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <MessageSquare size={40} className="mx-auto mb-3 opacity-40" />
        <p>記録がありません</p>
      </div>
    );
  }

  const sorted = [...records].sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());

  return (
    <div className="relative">
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
      <div className="space-y-6">
        {sorted.map(record => {
          const config = typeConfig[record.record_type] || typeConfig['面談'];
          const client = clients?.find(c => c.id === record.client_id);
          return (
            <div key={record.id} className="relative flex gap-4 pl-14">
              <div className={`absolute left-4 w-5 h-5 rounded-full flex items-center justify-center -translate-x-1/2 ${config.bgColor} border-2 border-white shadow-sm`}>
                <span className={config.color}>{config.icon}</span>
              </div>
              <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.bgColor} ${config.color}`}>
                      {config.label}
                    </span>
                    {client && (
                      <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                        {client.family_name} {client.given_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(record)}
                        className="text-gray-400 hover:text-teal-600 transition-colors"
                        title="編集"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <time className="text-xs text-gray-400">
                      {new Date(record.record_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </time>
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{record.content}</p>
                {record.summary && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 mb-1">要約</p>
                    <p className="text-sm text-gray-600">{record.summary}</p>
                  </div>
                )}
                {record.next_action && (
                  <div className="mt-2 flex items-start gap-1.5">
                    <span className="text-xs font-medium text-teal-600 mt-0.5">次回対応:</span>
                    <p className="text-xs text-gray-600">{record.next_action}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
