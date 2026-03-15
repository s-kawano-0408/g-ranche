"use client";

import { useState, useMemo } from "react";
import Header from "@/components/layout/Header";
import ClientCard from "@/components/clients/ClientCard";
import ClientSearch from "@/components/clients/ClientSearch";
import ClientForm from "@/components/clients/ClientForm";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useAuth } from "@/contexts/AuthContext";
import { usePseudonym } from "@/contexts/PseudonymContext";

export default function ClientsPage() {
  const { clients, loading, error, addClient } = useClients();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [clientTypeFilter, setClientTypeFilter] = useState<string>("すべて");
  const [statusFilter, setStatusFilter] = useState<string>("利用中");
  const { user } = useAuth();
  const { resolve } = usePseudonym();

  const filtered = useMemo(() => {
    const result = clients.filter((c) => {
      // 名前検索（マッピングがあるクライアントのみ検索対象）
      let matchSearch = true;
      if (search) {
        const personal = resolve(c.pseudonym_hash);
        if (personal) {
          const fullName = `${personal.family_name}${personal.given_name}`;
          const fullNameKana = `${personal.family_name_kana}${personal.given_name_kana}`;
          matchSearch =
            fullName.includes(search) || fullNameKana.includes(search);
        } else {
          matchSearch = false;
        }
      }
      const matchClientType =
        clientTypeFilter === "すべて" || c.client_type === clientTypeFilter;
      const statusMap: Record<string, string> = {
        利用中: "active",
        利用終了: "inactive",
      };
      const matchStatus =
        statusFilter === "すべて" || c.status === statusMap[statusFilter];
      return matchSearch && matchClientType && matchStatus;
    });

    // マッピングのフリガナでソート（マッピングがない人は末尾）
    result.sort((a, b) => {
      const pa = resolve(a.pseudonym_hash);
      const pb = resolve(b.pseudonym_hash);
      const kanaA = pa
        ? `${pa.family_name_kana}${pa.given_name_kana}`
        : "\uffff";
      const kanaB = pb
        ? `${pb.family_name_kana}${pb.given_name_kana}`
        : "\uffff";
      return kanaA.localeCompare(kanaB, "ja");
    });

    return result;
  }, [clients, search, clientTypeFilter, statusFilter, resolve]);

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="利用者管理"
        description={`登録利用者: ${clients.length}名`}
      >
        {user?.role === "admin" && (
          <Button
            className="bg-teal-600 hover:bg-teal-700 gap-2"
            onClick={() => setShowForm(true)}
          >
            <Plus size={16} />
            新規利用者登録
          </Button>
        )}
      </Header>

      <div className="flex-1 p-8 space-y-6">
        <ClientSearch
          search={search}
          onSearchChange={setSearch}
          clientTypeFilter={clientTypeFilter}
          onClientTypeChange={(v) => setClientTypeFilter(v || "すべて")}
          statusFilter={statusFilter}
          onStatusChange={(v) => setStatusFilter(v || "すべて")}
        />

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-40 bg-gray-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500">
            <p>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Users size={48} className="mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">利用者が見つかりません</p>
            <p className="text-sm mt-1">
              検索条件を変更するか、新規登録してください
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )}
      </div>

      <ClientForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={async (data) => {
          const newClient = await addClient(data);
          return { pseudonym_hash: newClient.pseudonym_hash };
        }}
      />
    </div>
  );
}
