'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface ClientSearchProps {
  search: string;
  onSearchChange: (v: string) => void;
  disabilityFilter: string;
  onDisabilityChange: (v: string | null) => void;
  statusFilter: string;
  onStatusChange: (v: string | null) => void;
}

export default function ClientSearch({
  search,
  onSearchChange,
  disabilityFilter,
  onDisabilityChange,
  statusFilter,
  onStatusChange,
}: ClientSearchProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="名前・かなで検索..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={disabilityFilter} onValueChange={onDisabilityChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="障害種別" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべて</SelectItem>
          <SelectItem value="身体障害">身体障害</SelectItem>
          <SelectItem value="知的障害">知的障害</SelectItem>
          <SelectItem value="精神障害">精神障害</SelectItem>
          <SelectItem value="発達障害">発達障害</SelectItem>
          <SelectItem value="難病">難病</SelectItem>
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="ステータス" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべて</SelectItem>
          <SelectItem value="active">利用中</SelectItem>
          <SelectItem value="inactive">利用終了</SelectItem>
          <SelectItem value="pending">待機中</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
