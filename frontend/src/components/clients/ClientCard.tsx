import { Client } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Calendar } from 'lucide-react';
import { calcAge, calcGrade } from '@/lib/utils';
import Link from 'next/link';

interface ClientCardProps {
  client: Client;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: '利用中', variant: 'default' },
  inactive: { label: '利用終了', variant: 'secondary' },
};

export default function ClientCard({ client }: ClientCardProps) {
  const status = statusConfig[client.status] || { label: client.status, variant: 'outline' as const };
  const fullName = `${client.family_name} ${client.given_name}`;
  const fullNameKana = `${client.family_name_kana || ''} ${client.given_name_kana || ''}`.trim();
  const age = calcAge(client.birth_date);
  const grade = client.client_type === '児' ? calcGrade(client.birth_date) : null;

  return (
    <Link href={`/clients/${client.id}`}>
      <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer hover:border-teal-300 group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center group-hover:bg-teal-200 transition-colors">
              <User size={20} className="text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{fullName}</h3>
              <p className="text-xs text-gray-400">{fullNameKana}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${client.client_type === '児' ? 'bg-pink-100 text-pink-700' : 'bg-sky-100 text-sky-700'}`}>
              {client.client_type}
            </span>
            <Badge variant={status.variant} className={status.variant === 'default' ? 'bg-teal-600' : ''}>
              {status.label}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              <span>{age !== null ? `${age}歳` : '-'}</span>
            </div>
            {grade && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-pink-50 text-pink-600 font-medium">{grade}</span>
            )}
            {client.certificate_number && (
              <span className="text-xs text-gray-400">受給者証: {client.certificate_number}</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
