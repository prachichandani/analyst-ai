'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LogOut, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ThoughtBlock, getThoughtParts } from './ThoughtBlock';

interface ChatProps {
  initialMessages: any[];
  reasoningLevel?: string;
}

export default function Chat({ initialMessages, reasoningLevel }: ChatProps) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentReasoningLevel, setCurrentReasoningLevel] = useState(reasoningLevel);

  const { messages, sendMessage, status, setMessages } = useChat({
    messages: initialMessages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      parts: [  
        ...(msg.metadata?.reasoning
          ? [{ type: 'reasoning', text: msg.metadata.reasoning }]
          : []),
        ...(msg.tool_data ?? []).map((t: any) => ({
          type: `tool-${t.toolName}`,
          input: t.args,
          output: t.result,
          state: 'output-available',
        })),
        { type: 'text', text: msg.content },
      ],
      metadata: msg.metadata,
    })),
    experimental_throttle: 50,
    onFinish: async (response) => {
      if (response.message.role !== 'assistant') return;

      const textPart = response.message.parts.find((p: any) => p.type === 'text');
      const content = textPart && 'text' in textPart ? textPart.text : '';
      if (!content.trim()) return;

      const toolParts = response.message.parts.filter((p: any) => p.type && p.type.startsWith('tool-'));
      const toolData: any[] = toolParts.map((toolPart: any) => ({
        toolName: toolPart.type.replace('tool-', ''),
        args: toolPart.input,
        result: toolPart.output,
      }));

      const reasoningPart = response.message.parts.find((p: any) => p.type === 'reasoning') as any;
      const reasoning = reasoningPart?.text || null;

      try {
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'assistant',
            content,
            tool_data: toolData.length > 0 ? toolData : undefined,
            metadata: reasoning ? { reasoning, reasoningLevel } : undefined,
          }),
        });
      } catch (error) {
        console.error('Failed to save assistant message:', error);
      }
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const text = input;
    setInput('');

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content: text }),
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
    } catch (err) {
      console.error('Failed to save user message:', err);
    }

    sendMessage(
      { text },
      {
        body: {
          reasoningLevel: currentReasoningLevel,
        },
      }
    );
  };
  const handleReasoningChange = async (value: 'low' | 'medium' | 'high') => {
    setCurrentReasoningLevel(value);

    try {
      const res = await fetch('/api/users/reasoning', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reasoningLevel: value,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update reasoning level');
      }
    } catch (err) {
      console.error('Failed to update reasoning level:', err);
    }
  };

  const handleClearChat = async () => {
    try {
      const res = await fetch('/api/messages', { method: 'DELETE' });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) throw new Error('Failed to clear chat');
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  const isBusy = status === 'streaming' || status === 'submitted';

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const lastMessage = messages[messages.length - 1];

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold">Analyst AI</h1>
            <p className="text-xs text-muted-foreground">AI-powered financial assistant</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col px-6 py-8">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-32 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground text-3xl">
                🤖
              </div>
              <h2 className="text-4xl font-bold">Welcome to Analyst AI</h2>
              <p className="mt-3 max-w-md text-muted-foreground">
                Analyze reports, compare companies, summarize financial statements, or ask any business-related questions.
              </p>
              <div className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  "Which hedge funds have the highest AUM?",
                  "Show the top holdings of Citadel Advisors",
                  "Compare Bridgewater Associates and Renaissance Technologies",
                  "Which funds hold NVIDIA stock?",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="rounded-xl border bg-card p-4 text-left transition hover:bg-muted"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message: any) => {
                const isLast = message.id === lastMessage?.id;
                const isLive = isLast && message.role === 'assistant' && isBusy;
                const { reasoning, tools } = getThoughtParts(message);
                const textPart = message.parts?.find((p: any) => p.type === 'text');
                const hasText = textPart && 'text' in textPart && textPart.text.trim();

                return (
                  <div
                    key={message.id}
                    className={`mb-6 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] ${
                        message.role === 'user'
                          ? 'rounded-3xl bg-primary px-5 py-4 text-primary-foreground shadow-sm'
                          : 'w-full'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <ThoughtBlock reasoning={reasoning} tools={tools} live={isLive} />
                      )}

                      {message.role === 'assistant' && hasText && (
                        <div className="rounded-3xl border bg-card px-5 py-4 shadow-sm">
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                table: ({ children }) => (
                                  <div className="overflow-x-auto my-4">
                                    <table className="min-w-full border-collapse border border-border">
                                      {children}
                                    </table>
                                  </div>
                                ),
                                thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
                                tbody: ({ children }) => <tbody>{children}</tbody>,
                                tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
                                th: ({ children }) => (
                                  <th className="px-4 py-2 text-left font-semibold text-sm">{children}</th>
                                ),
                                td: ({ children }) => <td className="px-4 py-2 text-sm">{children}</td>,
                                code: ({ children, className }) => {
                                  const match = /language-(\w+)/.exec(className || '');
                                  return match ? (
                                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-4">
                                      <code className={className}>{children}</code>
                                    </pre>
                                  ) : (
                                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                                      {children}
                                    </code>
                                  );
                                },
                              }}
                            >
                              {textPart.text}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {message.role === 'user' &&
                        message.parts?.map((part: any, index: number) =>
                          part.type === 'text' ? (
                            <p key={index} className="whitespace-pre-wrap leading-7">
                              {part.text}
                            </p>
                          ) : null
                        )}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="border-t bg-background">
        <div className="mx-auto max-w-4xl px-6 py-5">
          <form onSubmit={handleSubmit}>
            <div className="flex items-end gap-3 rounded-3xl border bg-card p-3 shadow-sm">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message Analyst AI..."
                disabled={isBusy}
                className="max-h-48 min-h-[60px] flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              />

              <div className="flex items-center gap-2">
                <select
                  value={currentReasoningLevel}
                  onChange={(e) => handleReasoningChange(e.target.value as 'low' | 'medium' | 'high')}
                  disabled={isBusy}
                  className="h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Med</option>
                  <option value="high">High</option>
                </select>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClearChat}
                  disabled={messages.length === 0 || isBusy}
                  title="Clear Chat"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>

                <Button
                  type="submit"
                  disabled={isBusy || !input.trim()}
                  className="rounded-full px-6"
                >
                  {isBusy ? "..." : "Send"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </footer>
    </div>
  );
}