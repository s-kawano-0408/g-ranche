'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { CaseRecord } from '@/types';
import { createCaseRecord, updateCaseRecord } from '@/lib/api';
import { fetcher } from '@/lib/fetcher';

export function useRecords(clientId?: number) {
  const query = clientId ? `?client_id=${clientId}` : '';
  const swrKey = `/api/records${query}`;

  const { data: records = [], error: swrError, isLoading: loading, mutate } = useSWR<CaseRecord[]>(
    swrKey,
    fetcher,
  );

  const error = swrError ? '支援記録データの取得に失敗しました' : null;

  const addRecord = useCallback(async (data: Omit<CaseRecord, 'id'>) => {
    const newRecord = await createCaseRecord(data);
    await mutate([newRecord, ...records], false);
    return newRecord;
  }, [records, mutate]);

  const editRecord = useCallback(async (id: number, data: Partial<CaseRecord>) => {
    const updated = await updateCaseRecord(id, data);
    await mutate(records.map(r => (r.id === id ? updated : r)), false);
    return updated;
  }, [records, mutate]);

  return { records, loading, error, refetch: mutate, addRecord, editRecord };
}
