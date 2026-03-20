'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { AlertTriangle, User } from 'lucide-react';
import { Client, SupportPlan } from '@/types';
import { getClients, getSupportPlans } from '@/lib/api';
import { usePseudonym } from '@/contexts/PseudonymContext';

interface ClientWithPlan {
  client: Client;
  plan: SupportPlan;
  daysUntil: number;
}

export default function MonitoringAlert() {
  const [alerts, setAlerts] = useState<ClientWithPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { resolve } = usePseudonym();

  useEffect(() => {
    async function fetchData() {
      try {
        const [clients, plans] = await Promise.all([getClients(), getSupportPlans()]);
        const today = new Date();
        const threshold = 30;

        const alertList: ClientWithPlan[] = [];
        for (const plan of plans) {
          if (!plan.next_monitoring_date) continue;
          const next = new Date(plan.next_monitoring_date);
          const daysUntil = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntil <= threshold) {
            const client = clients.find(c => c.id === plan.client_id);
            if (client) {
              alertList.push({ client, plan, daysUntil });
            }
          }
        }

        alertList.sort((a, b) => a.daysUntil - b.daysUntil);
        setAlerts(alertList.slice(0, 5));
      } catch {
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} className="text-orange-500" />
        <h3 className="font-semibold text-gray-900">モニタリング期限アラート</h3>
        {alerts.length > 0 && (
          <span className="ml-auto bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">
            {alerts.length}件
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          <AlertTriangle size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">期限が近いモニタリングはありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(({ client, daysUntil }) => {
            const isUrgent = daysUntil <= 7;
            const isWarning = daysUntil <= 14;
            const colorClass = isUrgent
              ? 'bg-red-50 border-red-200'
              : isWarning
              ? 'bg-orange-50 border-orange-200'
              : 'bg-yellow-50 border-yellow-200';
            const textClass = isUrgent
              ? 'text-red-700'
              : isWarning
              ? 'text-orange-700'
              : 'text-yellow-700';

            return (
              <div key={client.id} className={`flex items-center gap-3 p-3 rounded-lg border ${colorClass}`}>
                <div className="p-1.5 bg-white rounded-full">
                  <User size={14} className={textClass} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{resolve(client.pseudonym_hash)?.family_name ?? '仮名利用者'} {resolve(client.pseudonym_hash)?.given_name ?? ''}</p>
                  <p className="text-xs text-gray-500">{client.client_type}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${textClass}`}>
                    {daysUntil <= 0 ? '期限超過' : `${daysUntil}日後`}
                  </p>
                  <p className="text-xs text-gray-400">モニタリング</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
