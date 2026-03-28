'use client';

interface SheetSelectorProps {
  selectedSheet: string;
  onSelect: (sheet: string) => void;
}

const SHEETS = [
  { name: '別紙１', description: '申請者の現状（基本情報）', supported: true },
  { name: '別紙２', description: '現在の生活（週間スケジュール）', supported: false },
  { name: '1_1計画案', description: 'サービス等利用計画案', supported: true },
  { name: '１_2計画案週', description: '計画案の週間計画表', supported: false },
  { name: '2_1計画', description: 'サービス等利用計画', supported: false },
  { name: '2_2計画週', description: '計画の週間計画表', supported: false },
  { name: '3_1モニタ', description: 'モニタリング報告書', supported: false },
  { name: '3_2モニタ週', description: 'モニタリング週間計画表', supported: false },
];

export default function SheetSelector({ selectedSheet, onSelect }: SheetSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        転記先シート
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SHEETS.map((sheet) => (
          <button
            key={sheet.name}
            onClick={() => sheet.supported && onSelect(sheet.name)}
            disabled={!sheet.supported}
            className={`text-left p-3 rounded-lg border transition-colors ${
              selectedSheet === sheet.name
                ? 'border-teal-500 bg-teal-50 text-teal-800'
                : sheet.supported
                  ? 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                  : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
            }`}
          >
            <p className="font-medium text-sm">{sheet.name}</p>
            <p className={`text-xs mt-0.5 ${
              selectedSheet === sheet.name ? 'text-teal-600' : 'text-slate-400'
            }`}>
              {sheet.description}
              {!sheet.supported && '（準備中）'}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
