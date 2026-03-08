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

export default function SchedulesPage() {
  const { schedules, loading, addSchedule } = useSchedules();
  const { clients } = useClients();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col flex-1">
      <Header title="スケジュール" description="月間カレンダー">
        <Button
          className="bg-teal-600 hover:bg-teal-700 gap-2"
          onClick={() => setShowForm(true)}
        >
          <Plus size={16} />
          新規スケジュール
        </Button>
      </Header>

      <div className="flex-1 p-8">
        <Card className="p-6">
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
            <CalendarView schedules={schedules} />
          )}
        </Card>
      </div>

      <ScheduleForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={async (data) => { await addSchedule(data); }}
        clients={clients}
      />
    </div>
  );
}
