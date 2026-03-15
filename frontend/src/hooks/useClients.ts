'use client';

import { useState, useEffect, useCallback } from 'react';
import { Client } from '@/types';
import { getClients, createClient, updateClient, deleteClient } from '@/lib/api';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getClients();
      setClients(data);
      setError(null);
    } catch (e) {
      setError('利用者データの取得に失敗しました');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const addClient = useCallback(async (data: Record<string, unknown>) => {
    const newClient = await createClient(data);
    setClients(prev => [...prev, newClient]);
    return newClient;
  }, []);

  const editClient = useCallback(async (id: number, data: Partial<Client>) => {
    const updated = await updateClient(id, data);
    setClients(prev => prev.map(c => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const removeClient = useCallback(async (id: number) => {
    await deleteClient(id);
    setClients(prev => prev.filter(c => c.id !== id));
  }, []);

  return { clients, loading, error, refetch: fetchClients, addClient, editClient, removeClient };
}
