"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

interface ClientSearchProps {
  search: string;
  onSearchChange: (v: string) => void;
  clientTypeFilter: string;
  onClientTypeChange: (v: string | null) => void;
  statusFilter: string;
  onStatusChange: (v: string | null) => void;
}

export default function ClientSearch({
  search,
  onSearchChange,
  clientTypeFilter,
  onClientTypeChange,
  statusFilter,
  onStatusChange,
}: ClientSearchProps) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-0 w-full sm:min-w-[200px]">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <Input
          placeholder={isMobile ? "検索..." : "名前・フリガナで検索..."}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={clientTypeFilter} onValueChange={onClientTypeChange}>
        <SelectTrigger className="w-20 sm:w-28 shrink-0">
          <SelectValue placeholder="児/者" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="すべて">すべて</SelectItem>
          <SelectItem value="児">児</SelectItem>
          <SelectItem value="者">者</SelectItem>
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-24 sm:w-36 shrink-0">
          <SelectValue placeholder="ステータス" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="すべて">すべて</SelectItem>
          <SelectItem value="利用中">利用中</SelectItem>
          <SelectItem value="利用終了">利用終了</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
