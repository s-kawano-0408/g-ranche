import { Client } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Calendar } from 'lucide-react';
import Link from 'next/link';

interface ClientCardProps {
  client: Client;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: '利用中', variant: 'default' },
  inactive: { label: '利用終了', variant: 'secondary' },
  pending: { label: '待機中', variant: 'outline' },
};

const disabilityColors: Record<string, string> = {
  身体障害: 'bg-blue-100 text-blue-700',
  知的障害: 'bg-green-100 text-green-700',
  精神障害: 'bg-purple-100 text-purple-700',
  発達障害: 'bg-yellow-100 text-yellow-700',
  難病: 'bg-red-100 text-red-700',
};

function calcAge(birthDate: string) {
  if (!birthDate) return '-';
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function ClientCard({ client }: ClientCardProps) {
  const status = statusConfig[client.status] || { label: client.status, variant: 'outline' as const };
  const disabilityColor = disabilityColors[client.disability_type] || 'bg-gray-100 text-gray-700';

  return (
    <Link href={`/clients/${client.id}`}>
      <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer hover:border-teal-300 group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center group-hover:bg-teal-200 transition-colors">
              <User size={20} className="text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{client.name}</h3>
              <p className="text-xs text-gray-400">{client.name_kana}</p>
            </div>
          </div>
          <Badge variant={status.variant} className={status.variant === 'default' ? 'bg-teal-600' : ''}>
            {status.label}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${disabilityColor}`}>
              {client.disability_type || '未設定'}
            </span>
            {client.disability_certificate_level && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {client.disability_certificate_level}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              <span>{calcAge(client.birth_date)}歳</span>
            </div>
            {client.phone && (
              <div className="flex items-center gap-1">
                <Phone size={12} />
                <span>{client.phone}</span>
              </div>
            )}
          </div>

          {client.intake_date && (
            <p className="text-xs text-gray-400">
              利用開始: {new Date(client.intake_date).toLocaleDateString('ja-JP')}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
