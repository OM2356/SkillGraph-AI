'use client';

import React, { useEffect, useState } from 'react';
import { MessageSquare, Plus, Send, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useAppToast } from '@/components/Providers';
import type { ChatConversation, ChatMessage } from '@/shared/types';

const STARTER_PROMPTS = [
  'What should I prioritize this week based on my highest-impact skill gaps?',
  'Suggest one portfolio upgrade that proves backend and database rigor.',
  'Give me 5 technical interview questions calibrated to my weakest target skills.',
];

export default function CareerCoachPage() {
  const { notify } = useAppToast();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadChat(convId?: string | null) {
    setLoading(true);
    try {
      const url = convId ? `/api/ai/chat?conversationId=${convId}` : '/api/ai/chat';
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) {
        setConversations(json.conversations || []);
        setActiveId(json.activeConversationId);
        setMessages(json.messages || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChat();
  }, []);

  async function sendMessage(textToSend: string) {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setInput('');

    const optimisticUser: ChatMessage = {
      id: `temp-${Date.now()}`,
      userId: 'me',
      conversationId: activeId || 'new',
      role: 'user',
      content: trimmed,
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeId || undefined,
          message: trimmed,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Chat request failed');
      setActiveId(json.conversationId);
      await loadChat(json.conversationId);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to send message.', 'error');
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
    } finally {
      setSending(false);
    }
  }

  async function deleteThread(id: string) {
    const res = await fetch(`/api/ai/chat?conversationId=${id}`, { method: 'DELETE' });
    if (res.ok) {
      const next = conversations.filter((c) => c.id !== id);
      setConversations(next);
      if (activeId === id) {
        setActiveId(next[0]?.id || null);
        if (next[0]?.id) loadChat(next[0].id);
        else setMessages([]);
      }
    }
  }

  return (
    <AppShell
      title="AI Career Coach"
      subtitle="Technical mentorship grounded in your skills, gap scores, roadmap tasks, and projects."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Thread Sidebar */}
        <aside className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <button
            onClick={() => {
              setActiveId(null);
              setMessages([]);
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Plus className="w-3.5 h-3.5" /> New Conversation
          </button>

          <div className="space-y-1.5 overflow-y-auto flex-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-slate-500 p-2">No saved threads yet.</p>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => loadChat(c.id)}
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 cursor-pointer ${
                    activeId === c.id
                      ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span className="truncate font-medium">{c.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteThread(c.id);
                    }}
                    aria-label="Delete thread"
                    className="p-1 text-slate-400 hover:text-red-600 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Chat Area */}
        <section className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col overflow-hidden">
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {loading ? (
              <p className="text-xs text-slate-500">Loading conversation...</p>
            ) : messages.length === 0 ? (
              <div className="py-10 space-y-4 text-center max-w-md mx-auto">
                <MessageSquare className="w-8 h-8 text-indigo-600 mx-auto" />
                <div className="text-sm font-semibold">Ask your AI Career Coach</div>
                <p className="text-xs text-slate-500">
                  Every answer uses your logged skills, target career gaps, and roadmap tasks.
                </p>
                <div className="space-y-2 text-left">
                  {STARTER_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="w-full p-3 text-xs rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-left transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="text-xs text-slate-400 font-mono">Coach is thinking...</div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about skill gaps, study strategy, or interview prep..."
              className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
