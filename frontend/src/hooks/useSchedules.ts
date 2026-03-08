'use client';

import { useState, useEffect, useCallback } from 'react';
import { Schedule } from '@/types';
import { getSchedules, createSchedule, updateSchedule } from '@/lib/api';

export function useSchedules(params?: { client_id?: number; start_date?: string; end_date?: string }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSchedules(params);
      setSchedules(data);
      setError(null);
    } catch (e) {
      setError('スケジュールデータの取得に失敗しました');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [params?.client_id, params?.start_date, params?.end_date]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const addSchedule = useCallback(async (data: Omit<Schedule, 'id'>) => {
    const newSchedule = await createSchedule(data);
    setSchedules(prev => [...prev, newSchedule]);
    return newSchedule;
  }, []);

  const editSchedule = useCallback(async (id: number, data: Partial<Schedule>) => {
    const updated = await updateSchedule(id, data);
    setSchedules(prev => prev.map(s => (s.id === id ? updated : s)));
    return updated;
  }, []);

  return { schedules, loading, error, refetch: fetchSchedules, addSchedule, editSchedule };
}
