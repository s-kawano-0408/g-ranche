'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import ClientCard from '@/components/clients/ClientCard';
import ClientSearch from '@/components/clients/ClientSearch';
import ClientForm from '@/components/clients/ClientForm';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { Client } from '@/types';

export default function ClientsPage() {
  const { clients, loading, error, addClient } = useClients();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [disabilityFilter, setDisabilityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return clients.filter(c => {
      const matchSearch =
        !search ||
        c.name.includes(search) ||
        c.name_kana?.includes(search);
      const matchDisability =
        disabilityFilter === 'all' || c.disability_type === disabilityFilter;
      const matchStatus =
        statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchDisability && matchStatus;
    });
  }, [clients, search, disabilityFilter, statusFilter]);

  return (
    <div className="flex flex-col flex-1">
      <Header title="利用者管理" description={`登録利用者: ${clients.length}名`}>
        <Button
          className="bg-teal-600 hover:bg-teal-700 gap-2"
          onClick={() => setShowForm(true)}
        >
          <Plus size={16} />
          新規利用者登録
        </Button>
      </Header>

      <div className="flex-1 p-8 space-y-6">
        <ClientSearch
          search={search}
          onSearchChange={setSearch}
          disabilityFilter={disabilityFilter}
          onDisabilityChange={(v) => setDisabilityFilter(v || 'all')}
          statusFilter={statusFilter}
          onStatusChange={(v) => setStatusFilter(v || 'all')}
        />

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500">
            <p>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Users size={48} className="mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">利用者が見つかりません</p>
            <p className="text-sm mt-1">検索条件を変更するか、新規登録してください</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(client => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )}
      </div>

      <ClientForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={async (data) => { await addClient(data); }}
      />
    </div>
  );
}
