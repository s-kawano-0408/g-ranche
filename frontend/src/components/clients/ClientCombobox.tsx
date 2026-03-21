'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Client } from '@/types';
import { Search } from 'lucide-react';

interface ClientComboboxProps {
  clients: Client[];
  value: number | null;
  onChange: (clientId: number | null) => void;
  placeholder?: string;
  allowEmpty?: boolean;    // 「選択なし」を許可（フィルター用）
  emptyLabel?: string;     // 「選択なし」のラベル
  className?: string;
}

export default function ClientCombobox({
  clients,
  value,
  onChange,
  placeholder = '利用者を検索...',
  allowEmpty = false,
  emptyLabel = '全利用者',
  className = '',
}: ClientComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [isOpen]);

  // 開いた時に検索入力にフォーカス
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const getClientName = (client: Client): string => {
    return `${client.family_name} ${client.given_name}`;
  };

  const getClientKana = (client: Client): string => {
    return `${client.family_name_kana} ${client.given_name_kana}`;
  };

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(c => {
      const name = getClientName(c).toLowerCase();
      const kana = getClientKana(c).toLowerCase();
      return name.includes(q) || kana.includes(q);
    });
  }, [clients, search]);

  const selectedClient = clients.find(c => c.id === value);
  const displayValue = selectedClient
    ? getClientName(selectedClient)
    : (allowEmpty ? emptyLabel : placeholder);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-400 truncate ${
          !selectedClient && !allowEmpty ? 'text-gray-500' : 'text-gray-900'
        }`}
      >
        {displayValue}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full text-sm outline-none bg-transparent"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {allowEmpty && (
              <button
                type="button"
                onClick={() => { onChange(null); setIsOpen(false); setSearch(''); }}
                className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-100 ${
                  value === null ? 'bg-teal-50 text-teal-700 font-medium' : ''
                }`}
              >
                {emptyLabel}
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">
                該当する利用者がいません
              </div>
            ) : (
              filtered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onChange(c.id); setIsOpen(false); setSearch(''); }}
                  className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-100 ${
                    value === c.id ? 'bg-teal-50 text-teal-700 font-medium' : ''
                  }`}
                >
                  <span>{getClientName(c)}</span>
                  <span className="ml-2 text-xs text-gray-400">{getClientKana(c)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
