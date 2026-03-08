'use client';

import { useEffect, useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import RecordTimeline from '@/components/records/RecordTimeline';
import RecordForm from '@/components/records/RecordForm';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { CaseRecord, Client } from '@/types';
import { getCaseRecords, createCaseRecord, getClients } from '@/lib/api';

export default function RecordsPage() {
  const [records, setRecords] = useState<CaseRecord[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clientFilter, setClientFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    Promise.all([getCaseRecords(), getClients()])
      .then(([r, c]) => { setRecords(r); setClients(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return records.filter(r => {
      const matchClient = clientFilter === 'all' || String(r.client_id) === clientFilter;
      const matchType = typeFilter === 'all' || r.record_type === typeFilter;
      return matchClient && matchType;
    });
  }, [records, clientFilter, typeFilter]);

  const handleAdd = async (data: Omit<CaseRecord, 'id'>) => {
    const newRecord = await createCaseRecord(data);
    setRecords(prev => [newRecord, ...prev]);
  };

  return (
    <div className="flex flex-col flex-1">
      <Header title="支援記録" description={`全 ${records.length} 件`}>
        <Button
          className="bg-teal-600 hover:bg-teal-700 gap-2"
          onClick={() => setShowForm(true)}
        >
          <Plus size={16} />
          新規記録
        </Button>
      </Header>

      <div className="flex-1 p-8 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={clientFilter} onValueChange={(v) => setClientFilter(v || 'all')}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="利用者で絞込" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全利用者</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v || 'all')}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="種別で絞込" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全種別</SelectItem>
              <SelectItem value="面談">面談</SelectItem>
              <SelectItem value="訪問">訪問</SelectItem>
              <SelectItem value="電話">電話</SelectItem>
              <SelectItem value="モニタリング">モニタリング</SelectItem>
              <SelectItem value="会議">会議</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <RecordTimeline records={filtered} clients={clients} />
        )}
      </div>

      <RecordForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleAdd}
        clients={clients}
      />
    </div>
  );
}
