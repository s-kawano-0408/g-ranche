'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import CalendarView from '@/components/schedules/CalendarView';
import ScheduleForm from '@/components/schedules/ScheduleForm';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useSchedules } from '@/hooks/useSchedules';
import { useClients } from '@/hooks/useClients';
import { Card } from '@/components/ui/card';
import { Schedule } from '@/types';

export default function SchedulesPage() {
  const { schedules, loading, addSchedule, editSchedule, removeSchedule } = useSchedules();
  const { clients } = useClients();
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
    } catch (e) {
      console.error(e);
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
