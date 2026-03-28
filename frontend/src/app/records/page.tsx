'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import RecordTimeline from '@/components/records/RecordTimeline';
import RecordForm from '@/components/records/RecordForm';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { CaseRecord } from '@/types';
import ClientCombobox from '@/components/clients/ClientCombobox';
import { useClients } from '@/hooks/useClients';
import { useRecords } from '@/hooks/useRecords';
import { useToast } from '@/contexts/ToastContext';

export default function RecordsPage() {
  const { clients } = useClients();
  const { records, loading, addRecord, editRecord, removeRecord } = useRecords();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CaseRecord | null>(null);
  const [clientFilter, setClientFilter] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = useMemo(() => {
    return records.filter(r => {
      const matchClient = clientFilter === null || r.client_id === clientFilter;
      const matchType = typeFilter === 'all' || r.record_type === typeFilter;
      return matchClient && matchType;
    });
  }, [records, clientFilter, typeFilter]);

  const handleAdd = async (data: Omit<CaseRecord, 'id'>) => {
    await addRecord(data);
  };

  const handleUpdate = async (data: Omit<CaseRecord, 'id'>) => {
    if (!editingRecord) return;
    await editRecord(editingRecord.id, data);
  };

  const handleEdit = (record: CaseRecord) => {
    setEditingRecord(record);
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

      <div className="flex-1 p-4 sm:p-8 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <ClientCombobox
            clients={clients}
            value={clientFilter}
            onChange={setClientFilter}
            allowEmpty
            emptyLabel="全利用者"
            placeholder="利用者で絞込..."
            className="w-full sm:w-52"
          />
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v || 'all')}>
            <SelectTrigger className="w-full sm:w-36">
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
          <RecordTimeline records={filtered} clients={clients} onEdit={handleEdit} onDelete={async (id) => {
            try {
              await removeRecord(id);
              showToast('支援記録を削除しました');
            } catch {
              showToast('削除に失敗しました', 'error');
            }
          }} />
        )}
      </div>

      <RecordForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleAdd}
        clients={clients}
      />

      {editingRecord && (
        <RecordForm
          open={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          onSubmit={handleUpdate}
          clients={clients}
          initialData={editingRecord}
        />
      )}
    </div>
  );
}
