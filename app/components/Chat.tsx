'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LogOut, Trash2 } from 'lucide-react';
import { handleChatFinish } from '@/app/lib/chatHandlers';
import MessageItem from './MessageItem';

interface ChatProps {
  initialMessages: any[];
  reasoningLevel?: string;
}

export default function Chat({ initialMessages, reasoningLevel }: ChatProps) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentReasoningLevel, setCurrentReasoningLevel] = useState(reasoningLevel);

  const [chatMessages] = useState(() =>
    initialMessages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      parts: [{ type: 'text' as const, text: msg.content }],
      metadata: {
        ...msg.metadata,
        toolData: msg.tool_data,
      },
    }))
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    experimental_throttle: 150, // also recommended by AI SDK's own troubleshooting docs
    onFinish: async (response) => {
      await handleChatFinish(response, currentReasoningLevel);
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  useEffect(() => {
    if (chatMessages.length > 0) {
      setMessages(chatMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendFollowUp = (text: string) => {
    setInput(text);
  };
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
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isBusy) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
    // Shift+Enter: do nothing, let the browser insert a newline as normal
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
  const hasError = status === 'error';

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
      <header className="sticky top-0 z-20 border-b border-border/80 bg-card/80 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-6">
          <div>
            <h1 className="text-[0.98rem] font-semibold tracking-tight">Analyst AI</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Professional financial insights</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col px-6 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-32 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/60 text-foreground text-3xl shadow-sm">
                🤖
              </div>
              <h2 className="text-[2rem] font-bold tracking-tight">Welcome to Analyst AI</h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                Analyze reports, compare companies, summarize financial statements, or ask any business-related questions.
              </p>
              <div className="mt-9 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  "Which hedge funds have the highest AUM?",
                  "Show the top holdings of Citadel Advisors",
                  "Compare Bridgewater Associates and Renaissance Technologies",
                  "Which funds hold NVIDIA stock?",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="rounded-2xl border border-border/60 bg-card p-4 text-left text-sm transition hover:border-border/90 hover:bg-card"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message: any) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  isLast={message.id === lastMessage?.id}
                  isBusy={isBusy}
                  onFollowUp={sendFollowUp}
                />
              ))}
            </>
          )}
          {hasError && (
            <div className="mb-4 flex justify-start">
              <div className="max-w-[80%] rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Something went wrong generating a response. You can try sending your message again.
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="border-t border-border/80 bg-card">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <form onSubmit={handleSubmit}>
            <div className="flex items-end gap-3 rounded-3xl border border-border/80 bg-card p-3 shadow-sm">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Analyst AI..."
                disabled={isBusy}
                className="max-h-48 min-h-[60px] flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              />

              <div className="flex items-center gap-2">
                <select
                  value={currentReasoningLevel}
                  onChange={(e) => handleReasoningChange(e.target.value as 'low' | 'medium' | 'high')}
                  disabled={isBusy}
                  className="h-9 rounded-xl border border-input bg-card/50 px-3 text-sm outline-none transition hover:bg-card/70"
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
                  className="group"
                >
                  <Trash2 className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-destructive disabled:opacity-50" />
                </Button>

                <Button
                  type="submit"
                  variant="default"
                  disabled={isBusy || !input.trim()}
                  className="rounded-full px-6 bg-primary text-primary-foreground hover:bg-primary/90"
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
