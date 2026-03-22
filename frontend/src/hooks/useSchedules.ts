'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { Schedule } from '@/types';
import { createSchedule, updateSchedule, deleteSchedule } from '@/lib/api';
import { fetcher } from '@/lib/fetcher';

export function useSchedules(params?: { client_id?: number; start_date?: string; end_date?: string }) {
  const query = params
    ? '?' +
      new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        ),
      ).toString()
    : '';

  const swrKey = `/api/schedules${query}`;

  const { data: schedules = [], error: swrError, isLoading: loading, mutate } = useSWR<Schedule[]>(
    swrKey,
    fetcher,
  );

  const error = swrError ? 'スケジュールデータの取得に失敗しました' : null;

  const addSchedule = useCallback(async (data: Omit<Schedule, 'id'>) => {
    const newSchedule = await createSchedule(data);
    await mutate([...schedules, newSchedule], false);
    return newSchedule;
  }, [schedules, mutate]);

  const editSchedule = useCallback(async (id: number, data: Partial<Schedule>) => {
    const updated = await updateSchedule(id, data);
    await mutate(schedules.map(s => (s.id === id ? updated : s)), false);
    return updated;
  }, [schedules, mutate]);

  const removeSchedule = useCallback(async (id: number) => {
    await deleteSchedule(id);
    await mutate(schedules.filter(s => s.id !== id), false);
  }, [schedules, mutate]);

  return { schedules, loading, error, refetch: mutate, addSchedule, editSchedule, removeSchedule };
}
