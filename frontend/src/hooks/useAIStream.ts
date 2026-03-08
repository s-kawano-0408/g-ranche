'use client';

import { useState, useCallback } from 'react';
import { AIMessage, ToolCall, StreamEvent } from '@/types';
import { streamAIChat } from '@/lib/api';

interface UseAIStreamReturn {
  messages: AIMessage[];
  isStreaming: boolean;
  currentToolCall: ToolCall | null;
  sendMessage: (message: string, sessionId: string) => Promise<void>;
  clearMessages: () => void;
}

export function useAIStream(): UseAIStreamReturn {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentToolCall, setCurrentToolCall] = useState<ToolCall | null>(null);

  const sendMessage = useCallback(async (message: string, sessionId: string) => {
    if (isStreaming) return;

    const userMessage: AIMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setCurrentToolCall(null);

    const assistantMessage: AIMessage = { role: 'assistant', content: '', toolCalls: [] };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await streamAIChat(message, sessionId, history);

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamEvent = JSON.parse(line.slice(6));

              if (data.type === 'text' && data.content) {
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + data.content,
                    };
                  }
                  return updated;
                });
              } else if (data.type === 'tool_call' && data.name) {
                const toolCall: ToolCall = {
                  name: data.name,
                  input: data.input || {},
                };
                setCurrentToolCall(toolCall);
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...last,
                      toolCalls: [...(last.toolCalls || []), toolCall],
                    };
                  }
                  return updated;
                });
              } else if (data.type === 'tool_result') {
                setCurrentToolCall(null);
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === 'assistant' && last.toolCalls) {
                    const toolCalls = [...last.toolCalls];
                    const lastToolCall = toolCalls[toolCalls.length - 1];
                    if (lastToolCall) {
                      toolCalls[toolCalls.length - 1] = { ...lastToolCall, result: data.result };
                    }
                    updated[updated.length - 1] = { ...last, toolCalls };
                  }
                  return updated;
                });
              } else if (data.type === 'done') {
                setCurrentToolCall(null);
              } else if (data.type === 'error') {
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + `\n\nエラーが発生しました: ${data.error}`,
                    };
                  }
                  return updated;
                });
              }
            } catch {
              // ignore parse errors for incomplete JSON
            }
          }
        }
      }
    } catch (error) {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === 'assistant') {
          updated[updated.length - 1] = {
            ...last,
            content: 'エラーが発生しました。再度お試しください。',
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
      setCurrentToolCall(null);
    }
  }, [messages, isStreaming]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentToolCall(null);
  }, []);

  return { messages, isStreaming, currentToolCall, sendMessage, clearMessages };
}
