'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { useRouter } from 'next/navigation';

export default function Chat() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, setMessages } = useChat({
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

  // Load messages on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/messages');
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const saved = await res.json();
        setMessages(
          saved.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            parts: [{ type: 'text' as const, text: msg.content }],
          }))
        );
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const isBusy = status === 'streaming' || status === 'submitted';

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-white">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-center text-black">AI Chat</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-black text-black rounded hover:bg-gray-100"
          >
            Logout
          </button>
        </div>

        <div className="mb-6 space-y-4">
          {messages.map((message: any) => (
            <div
              key={message.id}
              className={`p-4 border rounded ${
                message.role === 'user'
                  ? 'border-black ml-8 bg-gray-100'
                  : 'border-black mr-8 bg-white'
              }`}
            >
              {message.parts?.map((part: any, i: number) =>
                part.type === 'text' ? (
                  <p key={i} className="whitespace-pre-wrap text-black">{part.text}</p>
                ) : null
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-3 border border-black rounded resize-none bg-white text-black"
            rows={3}
            disabled={isBusy}
          />
          <button
            type="submit"
            disabled={isBusy || !input.trim()}
            className="px-6 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isBusy ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}