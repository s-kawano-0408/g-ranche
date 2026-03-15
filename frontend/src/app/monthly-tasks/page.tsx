'use client';

import { useState, useEffect, useCallback } from 'react';
import { getClients, getMonthlyTasks, upsertMonthlyTask, deleteMonthlyTask } from '@/lib/api';
import { Client, MonthlyTask } from '@/types';
import { usePseudonym } from '@/contexts/PseudonymContext';

const TASK_TYPES = ['モニタ', '更新', '新規', '更+モニ', '新+モニ', 'その他', '最終モニタ'] as const;

const TASK_COLORS: Record<string, { bg: string; text: string }> = {
  'モニタ': { bg: 'bg-blue-100', text: 'text-blue-800' },
  '更新': { bg: 'bg-green-100', text: 'text-green-800' },
  '新規': { bg: 'bg-purple-100', text: 'text-purple-800' },
  '更+モニ': { bg: 'bg-teal-100', text: 'text-teal-800' },
  '新+モニ': { bg: 'bg-orange-100', text: 'text-orange-800' },
  'その他': { bg: 'bg-amber-100', text: 'text-amber-800' },
  '最終モニタ': { bg: 'bg-emerald-100', text: 'text-emerald-800' },
};

export default function MonthlyTasksPage() {
  const { resolve } = usePseudonym();
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<MonthlyTask[]>([]);
  const [showHashIds, setShowHashIds] = useState<Set<number>>(new Set());

  const toggleHash = (clientId: number) => {
    setShowHashIds(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };
  const [year, setYear] = useState(new Date().getFullYear());
  const [clientTypeFilter, setClientTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [kanaFilter, setKanaFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsData, tasksData] = await Promise.all([
        getClients(),
        getMonthlyTasks(year),
      ]);
      setClients(clientsData.filter((c) => c.status === 'active'));
      setTasks(tasksData);
    } catch (error) {
      console.error('データの取得に失敗しました', error);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const KANA_GROUPS = [
    { label: 'ア', chars: 'アイウエオ' },
    { label: 'カ', chars: 'カキクケコガギグゲゴ' },
    { label: 'サ', chars: 'サシスセソザジズゼゾ' },
    { label: 'タ', chars: 'タチツテトダヂヅデド' },
    { label: 'ナ', chars: 'ナニヌネノ' },
    { label: 'ハ', chars: 'ハヒフヘホバビブベボパピプペポ' },
    { label: 'マ', chars: 'マミムメモ' },
    { label: 'ヤ', chars: 'ヤユヨ' },
    { label: 'ラ', chars: 'ラリルレロ' },
    { label: 'ワ', chars: 'ワヲン' },
  ];

  const filteredClients = clients
    .filter((c) => {
      if (clientTypeFilter !== 'all' && c.client_type !== clientTypeFilter) return false;

      const p = resolve(c.pseudonym_hash);
      if (!p) return search === '';

      const fullName = `${p.family_name}${p.given_name}`;
      const fullKana = `${p.family_name_kana}${p.given_name_kana}`;

      if (search && !fullName.includes(search) && !fullKana.includes(search)) return false;

      if (kanaFilter !== 'all') {
        const group = KANA_GROUPS.find((g) => g.label === kanaFilter);
        if (group && !group.chars.includes(fullKana.charAt(0))) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const pa = resolve(a.pseudonym_hash);
      const pb = resolve(b.pseudonym_hash);
      const kanaA = pa ? `${pa.family_name_kana}${pa.given_name_kana}` : '\uffff';
      const kanaB = pb ? `${pb.family_name_kana}${pb.given_name_kana}` : '\uffff';
      return kanaA.localeCompare(kanaB, 'ja');
    });

  const filteredClientIds = new Set(filteredClients.map((c) => c.id));

  const getTask = (clientId: number, month: number): MonthlyTask | undefined => {
    return tasks.find((t) => t.client_id === clientId && t.year === year && t.month === month);
  };

  const getMonthCount = (month: number): number => {
    return tasks.filter((t) => t.year === year && t.month === month && filteredClientIds.has(t.client_id)).length;
  };

  const handleTaskChange = async (clientId: number, month: number, value: string) => {
    try {
      if (value === '') {
        await deleteMonthlyTask(clientId, year, month);
      } else {
        await upsertMonthlyTask({ client_id: clientId, year, month, task_type: value });
      }
      await loadData();
    } catch (error) {
      console.error('タスクの更新に失敗しました', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-hidden">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">月間業務管理</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            &lt;
          </button>
          <button
            onClick={() => setYear(new Date().getFullYear())}
            className="text-lg font-semibold text-slate-700 min-w-[80px] text-center hover:text-teal-600 transition-colors cursor-pointer"
            title="今年に戻る"
          >
            {year}年
          </button>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            &gt;
          </button>
        </div>
      </div>

      {/* 検索バー */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="名前・フリガナで検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
        />
      </div>

      {/* 児/者フィルター + ア行タブ */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex gap-2">
          {['all', '児', '者'].map((type) => (
            <button
              key={type}
              onClick={() => setClientTypeFilter(type)}
              className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${
                clientTypeFilter === type
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {type === 'all' ? 'すべて' : type}
            </button>
          ))}
        </div>

        <div className="h-6 border-l border-slate-300" />

        <div className="flex gap-1 flex-wrap">
          {['all', ...KANA_GROUPS.map((g) => g.label)].map((label) => (
            <button
              key={label}
              onClick={() => setKanaFilter(label)}
              className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                kanaFilter === label
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {label === 'all' ? '全' : label}
            </button>
          ))}
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {TASK_TYPES.map((type) => (
          <span
            key={type}
            className={`px-2 py-0.5 rounded text-xs font-medium ${TASK_COLORS[type].bg} ${TASK_COLORS[type].text}`}
          >
            {type}
          </span>
        ))}
      </div>

      <div className="border border-slate-200 rounded-lg bg-white shadow-sm overflow-x-auto max-w-full">
        <table className="border-collapse w-max">
          <thead>
            <tr className="bg-teal-600 text-white">
              <th className="sticky left-0 z-20 bg-teal-600 px-3 py-2 text-left text-sm font-medium border-r border-teal-500 w-[120px] max-w-[120px]">
                フリガナ
              </th>
              <th className="sticky left-[120px] z-20 bg-teal-600 px-3 py-2 text-left text-sm font-medium border-r border-teal-500 min-w-[100px] shadow-[4px_0_6px_-2px_rgba(0,0,0,0.15)]">
                名前
              </th>
              {months.map((m) => (
                <th
                  key={m}
                  className="px-0.5 py-2 text-center text-sm font-medium border-r border-teal-500 min-w-[100px]"
                >
                  {year}年{m}月
                </th>
              ))}
            </tr>
            <tr className="bg-teal-50">
              <th className="sticky left-0 z-20 bg-teal-50 px-3 py-1 border-r border-slate-200" />
              <th className="sticky left-[120px] z-20 bg-teal-50 px-3 py-1 border-r border-slate-200 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.15)]" />
              {months.map((m) => (
                <th
                  key={m}
                  className="px-2 py-1 text-center text-xs text-slate-600 border-r border-slate-200"
                >
                  {getMonthCount(m)}件
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client, idx) => (
              <tr
                key={client.id}
                className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
              >
                <td className="sticky left-0 z-10 px-3 py-1.5 text-sm text-slate-600 border-r border-slate-200 bg-inherit whitespace-nowrap">
                  {(() => {
                    const p = resolve(client.pseudonym_hash);
                    return p ? `${p.family_name_kana} ${p.given_name_kana}` : '-';
                  })()}
                </td>
                <td
                  className="sticky left-[120px] z-10 px-3 py-1.5 text-sm font-medium text-slate-800 border-r border-slate-200 bg-inherit whitespace-nowrap shadow-[4px_0_6px_-2px_rgba(0,0,0,0.15)]"
                >
                  {(() => {
                    const p = resolve(client.pseudonym_hash);
                    if (p) return `${p.family_name} ${p.given_name}`;
                    return (
                      <span
                        className="cursor-pointer hover:text-teal-600"
                        onClick={() => toggleHash(client.id)}
                      >
                        {showHashIds.has(client.id) ? client.pseudonym_hash : '仮名利用者'}
                      </span>
                    );
                  })()}
                </td>
                {months.map((m) => {
                  const task = getTask(client.id, m);
                  const taskType = task?.task_type || '';
                  const colors = taskType ? TASK_COLORS[taskType] : null;

                  return (
                    <td
                      key={m}
                      className="px-1 py-1 border-r border-slate-200 text-center"
                    >
                      <select
                        value={taskType}
                        onChange={(e) => handleTaskChange(client.id, m, e.target.value)}
                        className={`w-full px-1 py-1 text-xs rounded border-0 cursor-pointer appearance-none text-center focus:ring-2 focus:ring-teal-400 ${
                          colors
                            ? `${colors.bg} ${colors.text} font-medium`
                            : 'bg-transparent text-slate-400'
                        }`}
                      >
                        <option value="">-</option>
                        {TASK_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {clients.length === 0 && (
        <p className="text-center text-slate-500 mt-8">
          利用者が登録されていません
        </p>
      )}
    </div>
  );
}
