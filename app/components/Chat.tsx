'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LogOut, Trash2, Paperclip, X, Loader2, Check } from 'lucide-react';
import { handleChatFinish } from '@/app/lib/chatHandlers';
import MessageItem from './MessageItem';
import DatabaseDropdown from './DatabaseDropdown';

interface DatabaseFile {
  id: string;
  file_name: string;
  created_at: string;
}

interface ChatProps {
  initialMessages: any[];
  reasoningLevel?: string;
  activeDatabaseId?: string | null;
  activeDatabaseFileName?: string | null;
  initialDatabases?: DatabaseFile[];
}

export default function Chat({
  initialMessages,
  reasoningLevel,
  activeDatabaseId,
  activeDatabaseFileName,
  initialDatabases = [], // new
}: ChatProps) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentReasoningLevel, setCurrentReasoningLevel] = useState(reasoningLevel);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  

  const [currentActiveDatabaseId, setCurrentActiveDatabaseId] = useState<string | null>(
    activeDatabaseId ?? null
  );
  const [activeDatabaseName, setActiveDatabaseName] = useState<string | null>(
    activeDatabaseFileName ?? null
  );
  const [databases, setDatabases] = useState<DatabaseFile[]>(initialDatabases);

  useEffect(() => {
    setActiveDatabaseName(activeDatabaseFileName ?? null);
  }, [activeDatabaseFileName]);

  const fetchDatabases = async () => {
    try {
      const res = await fetch('/api/databases');
      if (!res.ok) return;
      const data = await res.json();
      setDatabases(data.databases ?? []);
    } catch (err) {
      console.error('Failed to fetch databases:', err);
    }
  };

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
    experimental_throttle: 150,
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

  const handleDatabaseChange = async (id: string | null) => {
    setCurrentActiveDatabaseId(id);

    try {
      const res = await fetch('/api/users/database', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeDatabaseId: id }),
      });

      if (!res.ok) throw new Error('Failed to update active database');
    } catch (err) {
      console.error('Failed to update active database:', err);
    }
  };

  const handleDropdownSelect = (id: string | null) => {
    const file = id ? databases.find((db) => db.id === id) : undefined;
    setActiveDatabaseName(file?.file_name ?? null);
    handleDatabaseChange(id);
  };

  const handleDropdownDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/databases/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete database');

      setDatabases((prev) => prev.filter((db) => db.id !== id));

      if (id === currentActiveDatabaseId) {
        setCurrentActiveDatabaseId(null);
        setActiveDatabaseName(null);
      }
    } catch (err) {
      console.error('Failed to delete database:', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadError(null);
    e.target.value = '';
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setUploadError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !selectedFile) return;

    const text = input;
    setInput('');

    const thisMessageFileName = selectedFile?.name ?? null; // only set if uploading right now

    if (selectedFile) {
      setIsUploading(true);
      setUploadError(null);

      try {
        // Step A: ask our server for a signed upload URL — tiny request, no file yet
        const signRes = await fetch('/api/upload-db/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: selectedFile.name }),
        });

        const signData = await signRes.json();

        if (!signRes.ok) {
          setUploadError(signData.error || 'Could not prepare upload');
          setIsUploading(false);
          return;
        }

        // Step B: upload the actual file directly to Supabase Storage,
        // bypassing our own server entirely — no Vercel payload size limit here
        const uploadRes = await fetch(signData.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/x-sqlite3' },
          body: selectedFile,
        });

        if (!uploadRes.ok) {
          setUploadError('File upload failed');
          setIsUploading(false);
          return;
        }

        // Step C: tell our server the file is uploaded, so it can extract
        // the schema and save the tracking row
        const processRes = await fetch('/api/upload-db/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storagePath: signData.storagePath,
            fileName: selectedFile.name,
          }),
        });

        const processData = await processRes.json();

        if (!processRes.ok) {
          setUploadError(processData.error || 'Failed to process file');
          setIsUploading(false);
          return;
        }

        setActiveDatabaseName(selectedFile.name);
        setSelectedFile(null);
        await handleDatabaseChange(processData.id);
        await fetchDatabases(); // refresh dropdown list to include the new upload
      } catch (err) {
        console.error('Upload failed:', err);
        setUploadError('Something went wrong uploading the file');
        setIsUploading(false);
        return;
      }

      setIsUploading(false);
    }

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
      {
        text,
        metadata: thisMessageFileName ? { attachedFileName: thisMessageFileName } : undefined,
      },
      {
        body: {
          reasoningLevel: currentReasoningLevel,
          uploadedDatabaseId: currentActiveDatabaseId,
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
      if ((input.trim() || selectedFile) && !isBusy) {
        handleSubmit(e as unknown as React.FormEvent);
      }
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
          <div className="mb-2 flex flex-wrap items-center gap-2">
            
            <DatabaseDropdown
              databases={databases}
              activeDatabaseId={currentActiveDatabaseId}
              onSelect={handleDropdownSelect}
              onDelete={handleDropdownDelete}
              onUpload={() => {
                document.getElementById('db-upload')?.click();
              }}
            />

            {selectedFile && (
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                <span className="font-mono truncate max-w-[200px]">{selectedFile.name}</span>
                <button
                  type="button"
                  onClick={handleClearFile}
                  className="ml-1 hover:text-foreground"
                  disabled={isUploading || isBusy}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>

          {uploadError && (
            <p className="mb-2 text-xs text-destructive">{uploadError}</p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="flex items-end gap-3 rounded-3xl border border-border/80 bg-card p-3 shadow-sm">
              <input
                type="file"
                accept=".sqlite,.db"
                onChange={handleFileUpload}
                className="hidden"
                id="db-upload"
                disabled={isUploading || isBusy}
              />
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
                  disabled={isBusy || (!input.trim() && !selectedFile)}
                  className="rounded-full px-6 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isUploading ? "Uploading..." : isBusy ? "..." : "Send"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </footer>
    </div>
  );
}