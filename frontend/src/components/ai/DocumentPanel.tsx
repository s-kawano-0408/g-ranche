'use client';

import { useState } from 'react';
import { Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, ClipboardList, BookOpen, Copy, Download, Loader2 } from 'lucide-react';
import { generateSupportPlan, generateReport } from '@/lib/api';

interface DocumentPanelProps {
  clients: Client[];
}

type DocType = 'plan' | 'report' | 'summary';

export default function DocumentPanel({ clients }: DocumentPanelProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<string>('');
  const [docType, setDocType] = useState<DocType | null>(null);

  const generate = async (type: DocType) => {
    if (!selectedClientId) {
      alert('利用者を選択してください');
      return;
    }
    const clientId = Number(selectedClientId);
    try {
      setLoading(true);
      setDocType(type);
      setGeneratedDoc('');

      let result = '';
      if (type === 'plan') {
        const res = await generateSupportPlan(clientId);
        result = res.plan || JSON.stringify(res, null, 2);
      } else if (type === 'report') {
        const res = await generateReport(clientId);
        result = res.report || JSON.stringify(res, null, 2);
      }
      setGeneratedDoc(result);
    } catch (e) {
      setGeneratedDoc('エラーが発生しました。再度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedDoc);
  };

  const download = () => {
    const blob = new Blob([generatedDoc], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const docLabels: Record<DocType, string> = {
    plan: '支援計画書',
    report: 'モニタリング報告書',
    summary: '支援記録要約',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-white">
        <h3 className="font-semibold text-gray-900 mb-3">書類生成</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">利用者を選択</label>
            <Select value={selectedClientId} onValueChange={(v) => setSelectedClientId(v || '')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="利用者を選択..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-sm h-9"
              onClick={() => generate('plan')}
              disabled={loading}
            >
              <FileText size={15} className="text-teal-600" />
              支援計画書生成
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-sm h-9"
              onClick={() => generate('report')}
              disabled={loading}
            >
              <ClipboardList size={15} className="text-blue-600" />
              モニタリング報告書
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-sm h-9"
              onClick={() => generate('summary')}
              disabled={loading}
            >
              <BookOpen size={15} className="text-purple-600" />
              支援記録要約
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-4">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Loader2 size={32} className="animate-spin mx-auto mb-2 text-teal-600" />
              <p className="text-sm">{docType ? docLabels[docType] : '書類'}を生成中...</p>
            </div>
          </div>
        ) : generatedDoc ? (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">
                {docType ? docLabels[docType] : '生成された書類'}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyToClipboard} title="コピー">
                  <Copy size={13} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={download} title="ダウンロード">
                  <Download size={13} />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg p-3 border">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{generatedDoc}</pre>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">利用者を選択して書類を生成</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
