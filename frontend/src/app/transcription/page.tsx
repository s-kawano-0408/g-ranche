'use client';

import { useState } from 'react';
import { FileSpreadsheet, Scan, Download, Loader2 } from 'lucide-react';
import ImageUploader from '@/components/transcription/ImageUploader';
import SheetSelector from '@/components/transcription/SheetSelector';
import FieldPreview from '@/components/transcription/FieldPreview';
import { ocrImage, generateExcel } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface Field {
  field_name: string;
  value: string;
}

export default function TranscriptionPage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedSheet, setSelectedSheet] = useState('別紙１');
  const [fields, setFields] = useState<Field[]>([]);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const { showToast } = useToast();

  const handleOcr = async () => {
    if (!selectedImage) return;
    setError(null);
    setIsOcrLoading(true);

    try {
      const result = await ocrImage(selectedImage, selectedSheet);
      setFields(result.fields);
      setStep('preview');
      showToast('読み取りが完了しました');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OCR処理に失敗しました');
      showToast('読み取りに失敗しました', 'error');
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleFieldChange = (index: number, value: string) => {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, value } : f))
    );
  };

  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);

    try {
      const blob = await generateExcel(selectedSheet, fields);

      // ブラウザでダウンロード
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedSheet}_転記済み.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      handleReset();
      showToast('Excelファイルをダウンロードしました');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Excel生成に失敗しました');
      showToast('Excel生成に失敗しました', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setFields([]);
    setError(null);
    setStep('upload');
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <FileSpreadsheet className="text-teal-600" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Excel転記</h1>
          <p className="text-sm text-slate-500">
            書類の写真を読み取り、テンプレートに転記します
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {step === 'upload' ? (
        <div className="space-y-6 bg-white rounded-xl border border-slate-200 p-6">
          <ImageUploader
            onImageSelect={setSelectedImage}
            selectedImage={selectedImage}
            onClear={() => setSelectedImage(null)}
          />

          <SheetSelector
            selectedSheet={selectedSheet}
            onSelect={setSelectedSheet}
          />

          <button
            onClick={handleOcr}
            disabled={!selectedImage || isOcrLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            {isOcrLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                読み取り中...
              </>
            ) : (
              <>
                <Scan size={20} />
                読み取り
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <FieldPreview
              fields={fields}
              onFieldChange={handleFieldChange}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              やり直す
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Download size={20} />
                  Excelに書き込み
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
