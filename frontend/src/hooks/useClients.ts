'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { Client } from '@/types';
import { createClient, updateClient, deleteClient } from '@/lib/api';
import { fetcher } from '@/lib/fetcher';

export function useClients() {
  const { data: clients = [], error: swrError, isLoading: loading, mutate } = useSWR<Client[]>(
    '/api/clients',
    fetcher,
  );

  const error = swrError ? '利用者データの取得に失敗しました' : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addClient = useCallback(async (data: any) => {
    const newClient = await createClient(data);
    await mutate([...clients, newClient], false);
    return newClient;
  }, [clients, mutate]);

  const editClient = useCallback(async (id: number, data: Partial<Client>) => {
    const updated = await updateClient(id, data);
    await mutate(clients.map(c => (c.id === id ? updated : c)), false);
    return updated;
  }, [clients, mutate]);

  const removeClient = useCallback(async (id: number) => {
    await deleteClient(id);
    await mutate(clients.filter(c => c.id !== id), false);
  }, [clients, mutate]);

  return { clients, loading, error, refetch: mutate, addClient, editClient, removeClient };
}
