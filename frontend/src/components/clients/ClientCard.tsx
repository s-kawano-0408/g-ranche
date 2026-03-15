'use client';

import { useState } from 'react';
import { Client } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Calendar } from 'lucide-react';
import { calcAge, calcGrade } from '@/lib/utils';
import { usePseudonym } from '@/contexts/PseudonymContext';
import Link from 'next/link';

interface ClientCardProps {
  client: Client;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: '利用中', variant: 'default' },
  inactive: { label: '利用終了', variant: 'secondary' },
};

export default function ClientCard({ client }: ClientCardProps) {
  const { resolve } = usePseudonym();
  const personal = resolve(client.pseudonym_hash);
  const [showHash, setShowHash] = useState(false);

  const status = statusConfig[client.status] || { label: client.status, variant: 'outline' as const };

  // マッピングがあれば本名表示、なければ仮名表示
  const fullName = personal
    ? `${personal.family_name} ${personal.given_name}`
    : '仮名利用者';
  const fullNameKana = personal
    ? `${personal.family_name_kana} ${personal.given_name_kana}`
    : '';
  const age = personal ? calcAge(personal.birth_date) : null;
  const grade = personal && client.client_type === '児' ? calcGrade(personal.birth_date) : null;

  return (
    <Link href={`/clients/${client.id}`}>
      <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer hover:border-teal-300 group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center group-hover:bg-teal-200 transition-colors">
              <User size={20} className="text-teal-600" />
            </div>
            <div>
              <h3
                className="font-semibold text-gray-900 cursor-pointer"
                onClick={(e) => {
                  if (!personal) {
                    e.preventDefault();
                    setShowHash(!showHash);
                  }
                }}
              >
                {!personal && showHash ? client.pseudonym_hash : fullName}
              </h3>
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
            {personal?.certificate_number && (
              <span className="text-xs text-gray-400">受給者証: {personal.certificate_number}</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
