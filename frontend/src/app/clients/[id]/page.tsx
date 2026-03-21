'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import RecordTimeline from '@/components/records/RecordTimeline';
import RecordForm from '@/components/records/RecordForm';
import ClientForm from '@/components/clients/ClientForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Plus, Sparkles, User, Calendar, Pencil } from 'lucide-react';
import { Client, SupportPlan, CaseRecord, Schedule } from '@/types';
import { getClient, getSupportPlans, getCaseRecords, getSchedules, createCaseRecord, updateCaseRecord, generateSupportPlan } from '@/lib/api';
import { calcAge, calcGrade } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: '利用中', color: 'bg-teal-100 text-teal-700' },
  inactive: { label: '利用終了', color: 'bg-gray-100 text-gray-600' },
};

const scheduleTypeColors: Record<string, string> = {
  面談: 'bg-blue-100 text-blue-700',
  訪問: 'bg-green-100 text-green-700',
  モニタリング: 'bg-orange-100 text-orange-700',
  会議: 'bg-purple-100 text-purple-700',
  その他: 'bg-gray-100 text-gray-600',
};

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex py-3 border-b border-gray-100 last:border-0">
      <dt className="w-28 sm:w-40 text-sm text-gray-500 flex-shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900 font-medium">{value || '-'}</dd>
    </div>
  );
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [client, setClient] = useState<Client | null>(null);
  const [plans, setPlans] = useState<SupportPlan[]>([]);
  const [records, setRecords] = useState<CaseRecord[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CaseRecord | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [c, p, r, s] = await Promise.all([
          getClient(id),
          getSupportPlans(id),
          getCaseRecords(id),
          getSchedules({ client_id: id }),
        ]);
        setClient(c);
        setPlans(p);
        setRecords(r);
        setSchedules(s);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleAddRecord = async (data: Omit<CaseRecord, 'id'>) => {
    const newRecord = await createCaseRecord(data);
    setRecords(prev => [newRecord, ...prev]);
  };

  const handleUpdateRecord = async (data: Omit<CaseRecord, 'id'>) => {
    if (!editingRecord) return;
    const updated = await updateCaseRecord(editingRecord.id, data);
    setRecords(prev => prev.map(r => r.id === editingRecord.id ? updated : r));
  };

  const handleGeneratePlan = async () => {
    try {
      setGeneratingPlan(true);
      const res = await generateSupportPlan(id);
      setGeneratedPlan(res.plan || JSON.stringify(res, null, 2));
    } catch {
      setGeneratedPlan('エラーが発生しました');
    } finally {
      setGeneratingPlan(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <div className="h-20 bg-white border-b animate-pulse" />
        <div className="p-4 sm:p-8 space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center text-gray-500">
        <p>利用者が見つかりません</p>
        <Button variant="link" onClick={() => router.push('/clients')}>一覧に戻る</Button>
      </div>
    );
  }

  const fullName = `${client.family_name} ${client.given_name}`;
  const fullNameKana = `${client.family_name_kana} ${client.given_name_kana}`;
  const status = statusConfig[client.status] || { label: client.status, color: 'bg-gray-100 text-gray-600' };

  return (
    <div className="flex flex-col flex-1">
      <Header
        title={fullName}
        description={fullNameKana}
      >
        <span className={`text-sm px-2 py-1 rounded font-medium ${client.client_type === '児' ? 'bg-pink-100 text-pink-700' : 'bg-sky-100 text-sky-700'}`}>
          {client.client_type}
        </span>
        <span className={`text-sm px-3 py-1 rounded-full font-medium ${status.color}`}>
          {status.label}
        </span>
        <Button variant="ghost" size="sm" onClick={() => router.push('/clients')} className="gap-1">
          <ArrowLeft size={15} />
          一覧
        </Button>
      </Header>

      <div className="flex-1 p-4 sm:p-8">
        <Tabs defaultValue="profile">
          <TabsList className="mb-6 w-full sm:w-auto overflow-x-auto">
            <TabsTrigger value="profile">プロフィール</TabsTrigger>
            <TabsTrigger value="plans">支援計画 ({plans.length})</TabsTrigger>
            <TabsTrigger value="records">支援記録 ({records.length})</TabsTrigger>
            <TabsTrigger value="schedules">スケジュール ({schedules.length})</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                    <User size={24} className="text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{fullName}</h3>
                    <p className="text-sm text-gray-500">{fullNameKana}</p>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setShowEditForm(true)}
                  >
                    <Pencil size={14} />
                    編集
                  </Button>
                )}
              </div>
              <dl>
                <InfoRow label="生年月日" value={`${new Date(client.birth_date).toLocaleDateString('ja-JP')} (${calcAge(client.birth_date)}歳)`} />
                {client.client_type === '児' && calcGrade(client.birth_date) && (
                  <InfoRow label="学年" value={calcGrade(client.birth_date) || undefined} />
                )}
                <InfoRow label="受給者証番号" value={client.certificate_number} />
                <InfoRow label="性別" value={client.gender} />
                {client.end_date && (
                  <InfoRow label="終了日" value={new Date(client.end_date).toLocaleDateString('ja-JP')} />
                )}
              </dl>
              {client.notes && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 mb-1">備考</p>
                  <p className="text-sm text-gray-700">{client.notes}</p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleGeneratePlan}
                  disabled={generatingPlan}
                >
                  <Sparkles size={15} className="text-teal-600" />
                  {generatingPlan ? 'AI生成中...' : 'AI生成'}
                </Button>
              </div>

              {generatedPlan && (
                <Card className="p-5 border-teal-200 bg-teal-50">
                  <h4 className="font-semibold text-teal-800 mb-2 flex items-center gap-2">
                    <Sparkles size={15} />
                    AI生成サポートプラン
                  </h4>
                  <pre className="text-sm text-teal-900 whitespace-pre-wrap font-sans">{generatedPlan}</pre>
                </Card>
              )}

              {plans.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p>支援計画がありません</p>
                </div>
              ) : (
                plans.map(plan => (
                  <Card key={plan.id} className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm text-gray-500">計画日: {new Date(plan.plan_date).toLocaleDateString('ja-JP')}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${plan.status === 'active' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'}`}>
                          {plan.status === 'active' ? '有効' : '終了'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">次回モニタリング: {plan.next_monitoring_date ? new Date(plan.next_monitoring_date).toLocaleDateString('ja-JP') : '-'}</p>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">長期目標</p>
                        <p className="text-sm text-gray-800">{plan.long_term_goal}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">短期目標</p>
                        <p className="text-sm text-gray-800">{plan.short_term_goal}</p>
                      </div>
                      {plan.service_contents?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">サービス内容</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            {plan.service_contents.map((s, i) => (
                              <li key={i} className="text-sm text-gray-700">
                                {typeof s === 'string' ? s : `${s.service}（${s.provider}・${s.frequency}）`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Records Tab */}
          <TabsContent value="records">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  className="bg-teal-600 hover:bg-teal-700 gap-2"
                  onClick={() => setShowRecordForm(true)}
                >
                  <Plus size={15} />
                  新規記録
                </Button>
              </div>
              <RecordTimeline records={records} clients={[client]} onEdit={setEditingRecord} />
            </div>
          </TabsContent>

          {/* Schedules Tab */}
          <TabsContent value="schedules">
            {schedules.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Calendar size={40} className="mx-auto mb-3 opacity-40" />
                <p>スケジュールがありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules
                  .sort((a, b) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime())
                  .map(s => (
                    <Card key={s.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-center min-w-[60px]">
                          <p className="text-xs font-medium text-gray-900">
                            {new Date(s.start_datetime).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(s.start_datetime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">{s.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${scheduleTypeColors[s.schedule_type] || 'bg-gray-100 text-gray-600'}`}>
                              {s.schedule_type}
                            </span>
                            {s.location && <span className="text-xs text-gray-500">{s.location}</span>}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <RecordForm
        open={showRecordForm}
        onClose={() => setShowRecordForm(false)}
        onSubmit={handleAddRecord}
        clients={[client]}
        defaultClientId={client.id}
      />

      {editingRecord && (
        <RecordForm
          open={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          onSubmit={handleUpdateRecord}
          clients={[client]}
          initialData={editingRecord}
        />
      )}

      {showEditForm && (
        <ClientForm
          open={showEditForm}
          onClose={async () => {
            setShowEditForm(false);
            // 保存後にデータをリフレッシュ
            try {
              const refreshed = await getClient(id);
              setClient(refreshed);
            } catch (e) {
              console.error(e);
            }
          }}
          onSubmit={async () => {}}
          clientId={client.id}
          initialData={{
            family_name: client.family_name,
            given_name: client.given_name,
            family_name_kana: client.family_name_kana,
            given_name_kana: client.given_name_kana,
            birth_date: client.birth_date,
            certificate_number: client.certificate_number,
            gender: client.gender || '',
            client_type: client.client_type,
            status: client.status === 'active' ? '利用中' : '利用終了',
            end_date: client.end_date || '',
            notes: client.notes || '',
          }}
        />
      )}
    </div>
  );
}
