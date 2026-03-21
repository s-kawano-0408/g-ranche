'use client';

import { useEffect, useRef, useState } from 'react';
import { useAIStream } from '@/hooks/useAIStream';
import ChatMessage from '@/components/ai/ChatMessage';
import ToolCallIndicator from '@/components/ai/ToolCallIndicator';
import DocumentPanel from '@/components/ai/DocumentPanel';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Trash2, Bot } from 'lucide-react';
import { getClients } from '@/lib/api';
import { Client } from '@/types';

const SESSION_ID = `session_${Date.now()}`;

const SYSTEM_HINTS = [
  '「田中さんの今週の予定を教えて」',
  '「来週月曜日に山田さんとの面談を追加して」',
  '「モニタリング期限が近い利用者を確認して」',
  '「今月の支援記録を要約して」',
];

export default function AIPage() {
  const { messages, isStreaming, currentToolCall, sendMessage, clearMessages } = useAIStream();
  const [input, setInput] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getClients().then(setClients).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentToolCall]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    await sendMessage(text, SESSION_ID);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-1 h-screen overflow-hidden">
      {/* Chat Panel */}
      <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
        {/* Chat Header */}
        <div className="bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0 pl-12 lg:pl-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center">
              <Bot size={20} className="text-teal-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">AIアシスタント</h2>
              <p className="text-xs text-gray-400">Claude - 相談支援特化AI</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            className="text-gray-400 hover:text-gray-600 gap-1"
          >
            <Trash2 size={14} />
            クリア
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
          {/* System intro */}
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-sm text-teal-800">
            <div className="flex items-center gap-2 mb-2">
              <Bot size={16} className="text-teal-600" />
              <span className="font-semibold">AIアシスタントへようこそ</span>
            </div>
            <p className="mb-3 text-teal-700">
              利用者情報の検索、スケジュール管理、支援記録の作成など、様々なサポートが可能です。
            </p>
            <div className="flex flex-wrap gap-2">
              {SYSTEM_HINTS.map((hint, i) => (
                <button
                  key={i}
                  className="text-xs bg-white text-teal-700 border border-teal-300 rounded-lg px-3 py-1.5 hover:bg-teal-100 transition-colors"
                  onClick={() => setInput(hint.replace(/「|」/g, ''))}
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>

          {messages.map((msg, i) => (
            <div key={i}>
              <ChatMessage message={msg} />
              {msg.toolCalls?.map((tc, j) => (
                <ToolCallIndicator key={j} toolCall={tc} />
              ))}
            </div>
          ))}

          {currentToolCall && (
            <ToolCallIndicator toolCall={currentToolCall} />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t px-4 sm:px-6 py-4 flex-shrink-0">
          <div className="flex gap-3 items-end">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力... (Shift+Enterで改行)"
              className="flex-1 resize-none min-h-[44px] max-h-32"
              rows={1}
              disabled={isStreaming}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="bg-teal-600 hover:bg-teal-700 h-11 px-4"
            >
              <Send size={16} />
            </Button>
          </div>
          {isStreaming && (
            <p className="text-xs text-gray-400 mt-2">AIが応答中です...</p>
          )}
        </div>
      </div>

      {/* Document Panel — デスクトップのみ表示 */}
      <div className="hidden lg:flex w-80 border-l bg-gray-50 flex-col flex-shrink-0 overflow-hidden">
        <DocumentPanel clients={clients} />
      </div>
    </div>
  );
}
