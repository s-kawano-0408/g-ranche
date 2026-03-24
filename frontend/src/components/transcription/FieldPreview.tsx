'use client';

interface Field {
  field_name: string;
  value: string;
}

interface FieldPreviewProps {
  fields: Field[];
  onFieldChange: (index: number, value: string) => void;
  rawText: string;
}

export default function FieldPreview({ fields, onFieldChange, rawText }: FieldPreviewProps) {
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

      {/* OCR生テキスト（折りたたみ） */}
      <details className="group">
        <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-700">
          OCR読み取りテキストを表示
        </summary>
        <pre className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 whitespace-pre-wrap max-h-48 overflow-y-auto">
          {rawText}
        </pre>
      </details>
    </div>
  );
}
