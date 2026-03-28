'use client';

interface Field {
  field_name: string;
  value: string;
}

interface FieldPreviewProps {
  fields: Field[];
  onFieldChange: (index: number, value: string) => void;
}

export default function FieldPreview({ fields, onFieldChange }: FieldPreviewProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-3">
          抽出結果（修正できます）
        </h3>
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.field_name} className="flex items-start gap-3">
              <label className="w-48 shrink-0 text-sm text-slate-600 pt-2 text-right">
                {field.field_name}
              </label>
              <input
                type="text"
                value={field.value}
                onChange={(e) => onFieldChange(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="（未検出）"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
