import { ToolCall } from '@/types';
import { Loader2 } from 'lucide-react';

const toolNameMap: Record<string, string> = {
  search_clients: '利用者を検索',
  get_client_detail: '利用者情報を取得',
  get_schedules: 'スケジュールを確認',
  get_case_records: '支援記録を確認',
  create_schedule: 'スケジュールを作成',
  create_case_record: '支援記録を作成',
  get_monitoring_due_clients: 'モニタリング対象を確認',
  get_dashboard_stats: '統計情報を取得',
};

interface ToolCallIndicatorProps {
  toolCall: ToolCall;
}

export default function ToolCallIndicator({ toolCall }: ToolCallIndicatorProps) {
  const label = toolNameMap[toolCall.name] || toolCall.name;
  const isDone = toolCall.result !== undefined;

  return (
    <div className="flex items-start gap-3 my-2">
      <div className="w-8 h-8 flex-shrink-0" />
      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${
        isDone
          ? 'bg-teal-50 border-teal-200 text-teal-700'
          : 'bg-blue-50 border-blue-200 text-blue-700'
      }`}>
        {isDone ? (
          <span className="w-3.5 h-3.5 rounded-full bg-teal-500 flex items-center justify-center">
            <span className="text-white text-[8px]">✓</span>
          </span>
        ) : (
          <Loader2 size={13} className="animate-spin" />
        )}
        <span>{label}{isDone ? '完了' : '中...'}</span>
      </div>
    </div>
  );
}
