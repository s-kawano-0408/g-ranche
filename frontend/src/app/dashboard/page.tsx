'use client';

import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Header from '@/components/layout/Header';
import StatsCard from '@/components/dashboard/StatsCard';
import TodaySchedule from '@/components/dashboard/TodaySchedule';
import { Users, Calendar, Baby, UserCheck, PlusCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Schedule } from '@/types';
import { fetcher } from '@/lib/fetcher';

type ClientStats = {
  total: number;
  child: number;
  adult: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: clientStats, isLoading: statsLoading } = useSWR<ClientStats>('/api/clients/stats', fetcher);
  const { data: todaySchedules = [], isLoading: schedulesLoading } = useSWR<Schedule[]>('/api/schedules/today', fetcher);

  const loading = statsLoading || schedulesLoading;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="ダッシュボード"
        description="本日の状況をご確認ください"
      >
        <Button
          variant="outline"
          className="gap-2 text-sm"
          onClick={() => router.push('/ai')}
        >
          <PlusCircle size={16} />
          AIアシスタントを開く
        </Button>
      </Header>

      <div className="flex-1 p-4 sm:p-8 space-y-6 sm:space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
          <StatsCard
            title="総利用者数"
            value={loading ? '-' : clientStats?.total ?? 0}
            icon={Users}
            color="teal"
            description="登録中の利用者"
          />
          <StatsCard
            title="児の人数"
            value={loading ? '-' : clientStats?.child ?? 0}
            icon={Baby}
            color="blue"
            description="障害児の利用者"
          />
          <StatsCard
            title="者の人数"
            value={loading ? '-' : clientStats?.adult ?? 0}
            icon={UserCheck}
            color="purple"
            description="障害者の利用者"
          />
          <StatsCard
            title="本日の予定"
            value={loading ? '-' : todaySchedules.length}
            icon={Calendar}
            color="orange"
            description="本日のスケジュール件数"
          />
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button className="bg-teal-600 hover:bg-teal-700 gap-2 text-sm" onClick={() => router.push('/clients')}>
            <Users size={16} />
            新規利用者登録
          </Button>
          <Button variant="outline" className="gap-2 text-sm" onClick={() => router.push('/schedules')}>
            <Calendar size={16} />
            スケジュール追加
          </Button>
          <Button variant="outline" className="gap-2 text-sm" onClick={() => router.push('/records')}>
            <FileText size={16} />
            支援記録を入力
          </Button>
          <Button variant="outline" className="gap-2 text-sm" onClick={() => router.push('/ai')}>
            AIに相談する
          </Button>
        </div>

        {/* Main widgets */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <TodaySchedule />
        </div>
      </div>
    </div>
  );
}
