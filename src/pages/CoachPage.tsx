import { useEffect, useState } from 'react';
import { Loader2, MessageSquarePlus, RefreshCw, Send, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useApp } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { sendCoachMessageAPI } from '../services/apiClient';
import {
  appendChatMessage,
  createConversation,
  deleteConversation,
  subscribeConversationMessages,
} from '../services/firestoreService';
import type { ChatConversation, ChatMessage } from '../shared/types';

export function CoachPage() {
  const { user, profile, skills, analyses, roadmaps, projects, conversations } = useApp();
  const { notify } = useToast();

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [lastFailedInput, setLastFailedInput] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<ChatConversation | null>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId) || conversations[0] || null;

  useEffect(() => {
    if (!user || !activeConv) {
      setMessages([]);
      return;
    }
    return subscribeConversationMessages(user.uid, activeConv.id, setMessages);
  }, [user, activeConv]);

  const handleNewConversation = async () => {
    if (!user) return;
    const id = await createConversation(
      user.uid,
      `Coaching · ${profile?.targetRoleName || 'Career Planning'}`,
      profile?.targetRoleName || 'Software Development Engineer'
    );
    setActiveConvId(id);
  };

  const handleSend = async (textToSend?: string) => {
    if (!user) return;
    const text = (textToSend ?? input).trim();
    if (!text || sending) return;

    setSending(true);
    setLastFailedInput(null);
    if (!textToSend) setInput('');

    try {
      let convId = activeConv?.id;
      let currentCount = activeConv?.messageCount || 0;
      if (!convId) {
        convId = await createConversation(
          user.uid,
          text.slice(0, 60),
          profile?.targetRoleName || 'Software Development Engineer'
        );
        setActiveConvId(convId);
      }

      if (!textToSend) {
        await appendChatMessage(user.uid, convId, 'user', text, currentCount + 1);
        currentCount += 1;
      }

      const topGaps = (analyses[0]?.gapItems || [])
        .filter((g) => g.gapScore > 0)
        .slice(0, 6)
        .map((g) => ({
          skillName: g.skillName,
          priority: g.priority,
          current: g.currentProficiency,
          target: g.targetProficiency,
        }));

      const res = await sendCoachMessageAPI({
        message: text,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
        context: {
          displayName: profile?.displayName || 'Student',
          targetRoleName: profile?.targetRoleName || 'Software Development Engineer',
          skills: skills.map((s) => ({
            name: s.name,
            proficiency: s.proficiency,
            currentlyLearning: s.currentlyLearning,
          })),
          topGaps,
          activeRoadmapTitle: roadmaps[0]?.title,
          projects: projects.map((p) => `${p.title} (${p.status})`),
        },
      });

      await appendChatMessage(user.uid, convId, 'assistant', res.reply, currentCount + 1);
    } catch (err) {
      setLastFailedInput(text);
      notify(err instanceof Error ? err.message : 'AI Career Coach error.', 'error');
    } finally {
      setSending(false);
    }
  };

  const starterPrompts = [
    'Which of my missing skills should I tackle first this week and why?',
    'How should I structure my portfolio README to stand out for my target role?',
    'Give me 5 targeted technical interview questions based on my current skill gaps.',
    'Explain how to demonstrate system design and REST API rigor in a student project.',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-10rem)] min-h-[540px]">
      {/* Thread Sidebar */}
      <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col">
        <button
          onClick={handleNewConversation}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 mb-4"
        >
          <MessageSquarePlus className="w-4 h-4" />
          New Coaching Thread
        </button>

        <div className="flex-1 overflow-y-auto space-y-2">
          {conversations.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">
              Start a conversation to save your coaching history.
            </p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                  activeConv?.id === c.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <button
                  onClick={() => setActiveConvId(c.id)}
                  className="text-left min-w-0 flex-1"
                >
                  <div className="text-xs font-medium truncate">{c.title}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{c.messageCount} msgs</div>
                </button>
                <button
                  onClick={() => setConfirmClear(c)}
                  aria-label="Delete conversation"
                  className="p-1 text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Viewport */}
      <div className="lg:col-span-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <img
            src="/src/assets/images/career_advisor_portrait_1795085996190.jpg"
            alt="AI Career Coach"
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
          />
          <div>
            <div className="text-sm font-semibold">SkillGraph AI Career Coach</div>
            <div className="text-xs text-slate-500">
              Grounded in your {skills.length} skills · Target: {profile?.targetRoleName || 'SDE'}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="max-w-xl mx-auto py-8 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
                Ask anything about your skill gaps, roadmap priorities, project architecture, or technical interviews.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-xs text-slate-700 dark:text-slate-300"
                  >
                    {prompt}
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
                  className={`max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
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
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              Reviewing your skill profile and preparing guidance...
            </div>
          )}

          {lastFailedInput && (
            <div className="flex items-center gap-3 text-xs text-red-600">
              <span>Message failed to send.</span>
              <button
                onClick={() => handleSend(lastFailedInput)}
                className="inline-flex items-center gap-1 underline font-medium"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your AI career coach..."
            className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>
      </div>

      <ConfirmDialog
        open={Boolean(confirmClear)}
        title="Delete Conversation"
        description={`Clear and delete "${confirmClear?.title}"?`}
        confirmLabel="Delete Thread"
        onConfirm={async () => {
          if (user && confirmClear) {
            await deleteConversation(user.uid, confirmClear.id);
            setActiveConvId(null);
            notify('Conversation deleted.', 'info');
          }
          setConfirmClear(null);
        }}
        onCancel={() => setConfirmClear(null)}
      />
    </div>
  );
}
