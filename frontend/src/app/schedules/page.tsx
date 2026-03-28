'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import CalendarView from '@/components/schedules/CalendarView';
import ScheduleForm from '@/components/schedules/ScheduleForm';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useSchedules } from '@/hooks/useSchedules';
import { useClients } from '@/hooks/useClients';
import { useToast } from '@/contexts/ToastContext';
import { Card } from '@/components/ui/card';
import { Schedule } from '@/types';

export default function SchedulesPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // 表示月 ±1ヶ月分だけ取得
  const dateRange = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m + 2, 0);
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { start_date: fmt(start), end_date: fmt(end) };
  }, [currentDate.getFullYear(), currentDate.getMonth()]);

  const { schedules, loading, addSchedule, editSchedule, removeSchedule } = useSchedules(dateRange);
  const { clients } = useClients();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState<string | undefined>(undefined);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const handleNewSchedule = (date?: string) => {
    setEditingSchedule(null);
    setFormDate(date);
    setShowForm(true);
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormDate(undefined);
    setShowForm(true);
  };

  const handleDeleteSchedule = async (id: number) => {
    try {
      await removeSchedule(id);
      showToast('スケジュールを削除しました');
    } catch (e) {
      console.error(e);
      showToast('削除に失敗しました', 'error');
    }
  };

  const handleSubmit = async (data: Omit<Schedule, 'id'>) => {
    if (editingSchedule) {
      await editSchedule(editingSchedule.id, data);
    } else {
      await addSchedule(data);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <Header title="スケジュール" description="月間カレンダー">
        <Button
          className="bg-teal-600 hover:bg-teal-700 gap-2"
          onClick={() => handleNewSchedule()}
        >
          <Plus size={16} />
          新規スケジュール
        </Button>
      </Header>

      <div className="flex-1 p-4 sm:p-8">
        <Card className="p-3 sm:p-6">
          {loading ? (
            <div className="space-y-4">
              <div className="h-8 bg-gray-100 rounded animate-pulse w-48 mx-auto" />
              <div className="grid grid-cols-7 gap-px">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 animate-pulse rounded" />
                ))}
              </div>
            </div>
          ) : (
            <CalendarView
              schedules={schedules}
              currentDate={currentDate}
              onMonthChange={setCurrentDate}
              onNewSchedule={handleNewSchedule}
              onEditSchedule={handleEditSchedule}
              onDeleteSchedule={handleDeleteSchedule}
            />
          )}
        </Card>
      </div>

      <ScheduleForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingSchedule(null); setFormDate(undefined); }}
        onSubmit={handleSubmit}
        clients={clients}
        defaultDate={formDate}
        initialData={editingSchedule ? {
          title: editingSchedule.title,
          schedule_type: editingSchedule.schedule_type,
          location: editingSchedule.location,
          notes: editingSchedule.notes,
          status: editingSchedule.status,
          client_id: editingSchedule.client_id,
          staff_id: editingSchedule.staff_id,
          start_datetime: editingSchedule.start_datetime,
          end_datetime: editingSchedule.end_datetime,
        } : undefined}
      />
    </div>
  );
}
