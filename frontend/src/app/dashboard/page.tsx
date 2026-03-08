'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import StatsCard from '@/components/dashboard/StatsCard';
import TodaySchedule from '@/components/dashboard/TodaySchedule';
import MonitoringAlert from '@/components/dashboard/MonitoringAlert';
import { Users, Calendar, AlertTriangle, FileText, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getClients, getCaseRecords, getTodaySchedules, getSupportPlans } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalClients: 0,
    todaySchedules: 0,
    monitoringDue: 0,
    weekRecords: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [clients, todaySchedules, records, plans] = await Promise.all([
          getClients(),
          getTodaySchedules(),
          getCaseRecords(),
          getSupportPlans(),
        ]);

        const today = new Date();
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekRecords = records.filter(r => new Date(r.record_date) >= weekAgo).length;

        const thirtyDays = new Date();
        thirtyDays.setDate(thirtyDays.getDate() + 30);
        const monitoringDue = plans.filter(p => {
          if (!p.next_monitoring_date) return false;
          const d = new Date(p.next_monitoring_date);
          return d <= thirtyDays;
        }).length;

        setStats({
          totalClients: clients.length,
          todaySchedules: todaySchedules.length,
          monitoringDue,
          weekRecords,
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
            title="本日の予定"
            value={loading ? '-' : stats.todaySchedules}
            icon={Calendar}
            color="blue"
            description="本日のスケジュール件数"
          />
          <StatsCard
            title="モニタリング期限"
            value={loading ? '-' : stats.monitoringDue}
            icon={AlertTriangle}
            color="orange"
            description="30日以内に期限"
          />
          <StatsCard
            title="今週の記録"
            value={loading ? '-' : stats.weekRecords}
            icon={FileText}
            color="purple"
            description="過去7日間の支援記録"
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
          <MonitoringAlert />
        </div>
      </div>
    </div>
  );
}
