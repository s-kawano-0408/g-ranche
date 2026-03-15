'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import StatsCard from '@/components/dashboard/StatsCard';
import TodaySchedule from '@/components/dashboard/TodaySchedule';
import { Users, Calendar, Baby, UserCheck, PlusCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getClients, getTodaySchedules } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalClients: 0,
    childClients: 0,
    adultClients: 0,
    todaySchedules: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [clients, todaySchedules] = await Promise.all([
          getClients(),
          getTodaySchedules(),
        ]);

        setStats({
          totalClients: clients.length,
          childClients: clients.filter(c => c.client_type === '児').length,
          adultClients: clients.filter(c => c.client_type === '者').length,
          todaySchedules: todaySchedules.length,
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

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

      <div className="flex-1 p-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
          <StatsCard
            title="総利用者数"
            value={loading ? '-' : stats.totalClients}
            icon={Users}
            color="teal"
            description="登録中の利用者"
          />
          <StatsCard
            title="児の人数"
            value={loading ? '-' : stats.childClients}
            icon={Baby}
            color="blue"
            description="障害児の利用者"
          />
          <StatsCard
            title="者の人数"
            value={loading ? '-' : stats.adultClients}
            icon={UserCheck}
            color="purple"
            description="障害者の利用者"
          />
          <StatsCard
            title="本日の予定"
            value={loading ? '-' : stats.todaySchedules}
            icon={Calendar}
            color="orange"
            description="本日のスケジュール件数"
          />
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button className="bg-teal-600 hover:bg-teal-700 gap-2" onClick={() => router.push('/clients')}>
            <Users size={16} />
            新規利用者登録
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => router.push('/schedules')}>
            <Calendar size={16} />
            スケジュール追加
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => router.push('/records')}>
            <FileText size={16} />
            支援記録を入力
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => router.push('/ai')}>
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
