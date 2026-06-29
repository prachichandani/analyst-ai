'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LogOut, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatProps {
  initialMessages: any[];
}

export default function Chat({ initialMessages }: ChatProps) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, setMessages } = useChat({
    messages: initialMessages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      parts: [
        {
          type: 'text' as const,
          text: msg.content,
        },
      ],
    })),
    experimental_throttle: 50,
    onFinish: async (response) => {
      if (response.message.role !== 'assistant') return;

      const textPart = response.message.parts.find((p: any) => p.type === 'text');
      const content = textPart && 'text' in textPart ? textPart.text : '';
      if (!content.trim()) return;

      try {
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'assistant', content }),
        });
      } catch (error) {
        console.error('Failed to save assistant message:', error);
      }
    },
  });

  // Auto scroll
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

    sendMessage({ text });
  };
  const handleClearChat = async () => {
    try {
      const res = await fetch('/api/messages', {
        method: 'DELETE',
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to clear chat');
      }

      // Clear messages from the UI
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

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold">Analyst AI</h1>
            <p className="text-xs text-muted-foreground">
              AI-powered financial assistant
            </p>
          </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
            </Button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col px-6 py-8">

          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-32 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground text-3xl">
                🤖
              </div>

              <h2 className="text-4xl font-bold">
                Welcome to Analyst AI
              </h2>

              <p className="mt-3 max-w-md text-muted-foreground">
                Analyze reports, compare companies, summarize financial
                statements, or ask any business-related questions.
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
              {messages.map((message: any) => (
                <div
                  key={message.id}
                  className={`mb-6 flex ${
                    message.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-3xl px-5 py-4 shadow-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border bg-card"
                    }`}
                  >
                    {message.parts?.map((part: any, index: number) =>
                      part.type === "text" ? (
                        message.role === "assistant" ? (
                          <div key={index} className="prose prose-sm dark:prose-invert max-w-none">
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
                                thead: ({ children }) => (
                                  <thead className="bg-muted">{children}</thead>
                                ),
                                tbody: ({ children }) => (
                                  <tbody>{children}</tbody>
                                ),
                                tr: ({ children }) => (
                                  <tr className="border-b border-border">{children}</tr>
                                ),
                                th: ({ children }) => (
                                  <th className="px-4 py-2 text-left font-semibold text-sm">{children}</th>
                                ),
                                td: ({ children }) => (
                                  <td className="px-4 py-2 text-sm">{children}</td>
                                ),
                                code: ({ children, className }) => {
                                  const match = /language-(\w+)/.exec(className || '');
                                  return match ? (
                                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-4">
                                      <code className={className}>{children}</code>
                                    </pre>
                                  ) : (
                                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                                  );
                                },
                              }}
                            >
                              {part.text}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p
                            key={index}
                            className="whitespace-pre-wrap leading-7"
                          >
                            {part.text}
                          </p>
                        )
                      ) : null
                    )}
                  </div>
                </div>
              ))}

              {isBusy && (
                <div className="mb-6 flex justify-start">
                  <div className="rounded-3xl border bg-card px-5 py-4 text-muted-foreground">
                    Thinking...
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
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