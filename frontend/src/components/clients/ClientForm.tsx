"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateClient } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

// フォームのデータ型
interface ClientFormData {
  family_name: string;
  given_name: string;
  family_name_kana: string;
  given_name_kana: string;
  birth_date: string;
  certificate_number: string;
  gender: string;
  client_type: string;
  staff_id: number;
  status: string;
  end_date: string;
  notes: string;
}

interface ClientFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<unknown>;
  initialData?: Partial<ClientFormData>;
  title?: string;
  clientId?: number;
}

const defaultData: ClientFormData = {
  family_name: "",
  given_name: "",
  family_name_kana: "",
  given_name_kana: "",
  birth_date: "",
  gender: "",
  client_type: "",
  certificate_number: "",
  staff_id: 1,
  status: "利用中",
  end_date: "",
  notes: "",
};

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);
const days = Array.from({ length: 31 }, (_, i) => i + 1);

export default function ClientForm({
  open,
  onClose,
  onSubmit,
  initialData,
  title,
  clientId,
}: ClientFormProps) {
  const { showToast } = useToast();
  const isEditMode = clientId !== undefined;
  const [form, setForm] = useState<ClientFormData>({
    ...defaultData,
    ...initialData,
  });
  const [loading, setLoading] = useState(false);

  const set = (key: keyof ClientFormData, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [key]: value ?? "" }));
  };

  const birthParts = form.birth_date
    ? form.birth_date.split("-")
    : ["", "", ""];
  const [birthYear, setBirthYear] = useState(birthParts[0] || "");
  const [birthMonth, setBirthMonth] = useState(
    birthParts[1] ? String(Number(birthParts[1])) : "",
  );
  const [birthDay, setBirthDay] = useState(
    birthParts[2] ? String(Number(birthParts[2])) : "",
  );

  const updateBirthDate = (y: string, m: string, d: string) => {
    if (y && m && d) {
      set("birth_date", `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    }
  };

  const statusMap: Record<string, string> = {
    利用中: "active",
    利用終了: "inactive",
  };

  const handleSubmit = async () => {
    if (
      !form.family_name ||
      !form.given_name ||
      !form.family_name_kana ||
      !form.given_name_kana ||
      !form.birth_date ||
      !form.client_type ||
      !form.certificate_number
    )
      return;
    try {
      setLoading(true);

      if (isEditMode) {
        // 編集モード: updateClient APIを呼ぶ
        await updateClient(clientId, {
          family_name: form.family_name,
          given_name: form.given_name,
          family_name_kana: form.family_name_kana,
          given_name_kana: form.given_name_kana,
          birth_date: form.birth_date,
          certificate_number: form.certificate_number,
          gender: form.gender || undefined,
          client_type: form.client_type,
          status: statusMap[form.status] || form.status,
          end_date: form.end_date || undefined,
          notes: form.notes || undefined,
        } as Record<string, unknown>);
      } else {
        // 新規登録モード
        await onSubmit({
          ...form,
          status: statusMap[form.status] || form.status,
          end_date: form.end_date || null,
        });
      }

      onClose();
      setForm(defaultData);
      showToast(isEditMode ? '利用者情報を更新しました' : '利用者を登録しました');
    } catch (e) {
      console.error(e);
      showToast(isEditMode ? '更新に失敗しました' : '登録に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isValid =
    form.family_name &&
    form.given_name &&
    form.family_name_kana &&
    form.given_name_kana &&
    form.birth_date &&
    form.client_type &&
    form.certificate_number;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title || (isEditMode ? "利用者情報の編集" : "新規利用者登録")}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* 姓・名 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">姓 *</label>
            <Input
              value={form.family_name}
              onChange={(e) => set("family_name", e.target.value)}
              placeholder="例: 山田"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">名 *</label>
            <Input
              value={form.given_name}
              onChange={(e) => set("given_name", e.target.value)}
              placeholder="例: 太郎"
            />
          </div>

          {/* フリガナ */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">セイ *</label>
            <Input
              value={form.family_name_kana}
              onChange={(e) => set("family_name_kana", e.target.value)}
              placeholder="例: ヤマダ"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">メイ *</label>
            <Input
              value={form.given_name_kana}
              onChange={(e) => set("given_name_kana", e.target.value)}
              placeholder="例: タロウ"
            />
          </div>

          {/* 生年月日（スクロール式） */}
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium text-gray-700">
              生年月日 *
            </label>
            <div className="flex items-center gap-1">
              <select
                value={birthYear}
                onChange={(e) => {
                  setBirthYear(e.target.value);
                  updateBirthDate(e.target.value, birthMonth, birthDay);
                }}
                className="flex-1 h-10 px-2 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="">年</option>
                {years.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-500">年</span>
              <select
                value={birthMonth}
                onChange={(e) => {
                  setBirthMonth(e.target.value);
                  updateBirthDate(birthYear, e.target.value, birthDay);
                }}
                className="w-20 h-10 px-2 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="">月</option>
                {months.map((m) => (
                  <option key={m} value={String(m)}>
                    {m}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-500">月</span>
              <select
                value={birthDay}
                onChange={(e) => {
                  setBirthDay(e.target.value);
                  updateBirthDate(birthYear, birthMonth, e.target.value);
                }}
                className="w-20 h-10 px-2 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="">日</option>
                {days.map((d) => (
                  <option key={d} value={String(d)}>
                    {d}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-500">日</span>
            </div>
          </div>

          {/* 児/者 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">区分 *</label>
            <Select
              value={form.client_type}
              onValueChange={(v) => set("client_type", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="児">児</SelectItem>
                <SelectItem value="者">者</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 受給者証番号 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              受給者証番号 *
            </label>
            <Input
              value={form.certificate_number}
              onChange={(e) => set("certificate_number", e.target.value)}
              placeholder="受給者証番号を入力"
            />
          </div>

          {/* 性別 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">性別</label>
            <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="男性">男性</SelectItem>
                <SelectItem value="女性">女性</SelectItem>
                <SelectItem value="その他">その他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ステータス */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              ステータス
            </label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="利用中">利用中</SelectItem>
                <SelectItem value="利用終了">利用終了</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 終了日 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">終了日</label>
            <Input
              type="date"
              value={form.end_date}
              onChange={(e) => set("end_date", e.target.value)}
            />
          </div>

          {/* 備考 */}
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium text-gray-700">備考</label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="備考・特記事項"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !isValid}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {loading ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
