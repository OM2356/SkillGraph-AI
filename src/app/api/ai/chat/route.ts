import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/supabase/server';
import {
  mapChatMessageRow,
  mapConversationRow,
  mapProfileRow,
  mapProjectRow,
  mapUserSkillRow,
} from '@/lib/mappers';
import { chatRequestSchema } from '@/lib/validations';
import { runCareerCoachChatAI } from '@/lib/ai/gemini';
import { checkRateLimit } from '@/lib/rateLimit';
import { isGeminiConfigured } from '@/lib/supabase/config';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  const { data: convs, error: convErr } = await auth.supabase
    .from('chat_conversations')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (convErr) {
    return NextResponse.json({ error: convErr.message }, { status: 500 });
  }

  let messages: ReturnType<typeof mapChatMessageRow>[] = [];
  const activeId = conversationId || convs?.[0]?.id;
  if (activeId) {
    const { data: msgs, error: msgErr } = await auth.supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', activeId)
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: true });

    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }
    messages = (msgs || []).map(mapChatMessageRow);
  }

  return NextResponse.json({
    conversations: (convs || []).map(mapConversationRow),
    activeConversationId: activeId || null,
    messages,
  });
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const limit = checkRateLimit(`chat:${auth.user.id}`, 15, 60_000);
  if (!limit.allowed) return limit.response;

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      {
        error: 'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY to use the AI Career Coach.',
        code: 'GEMINI_NOT_CONFIGURED',
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { message } = parsed.data;
    let conversationId = parsed.data.conversationId;

    const [profRes, skillsRes, projRes, latestAnalysisRes, activeRoadmapRes] = await Promise.all([
      auth.supabase.from('profiles').select('*').eq('id', auth.user.id).maybeSingle(),
      auth.supabase.from('user_skills').select('*').eq('user_id', auth.user.id),
      auth.supabase.from('projects').select('*').eq('user_id', auth.user.id),
      auth.supabase
        .from('analyses')
        .select('id, target_role_name')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      auth.supabase
        .from('roadmaps')
        .select('id, title')
        .eq('user_id', auth.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const profile = profRes.data ? mapProfileRow(profRes.data) : { displayName: auth.user.email || 'Student', targetRoleName: '' };
    const skills = (skillsRes.data || []).map(mapUserSkillRow);
    const projects = (projRes.data || []).map(mapProjectRow);

    let topGaps: Array<{ skillName: string; priority: string; current: number; target: number }> = [];
    if (latestAnalysisRes.data?.id) {
      const { data: items } = await auth.supabase
        .from('analysis_items')
        .select('skill_name, priority, current_proficiency, target_proficiency, gap_score')
        .eq('analysis_id', latestAnalysisRes.data.id)
        .gt('gap_score', 0)
        .limit(8);
      topGaps = (items || []).map((i) => ({
        skillName: String(i.skill_name),
        priority: String(i.priority),
        current: Number(i.current_proficiency),
        target: Number(i.target_proficiency),
      }));
    }

    let pendingTasks: string[] = [];
    if (activeRoadmapRes.data?.id) {
      const { data: tasks } = await auth.supabase
        .from('roadmap_tasks')
        .select('title, status')
        .eq('roadmap_id', activeRoadmapRes.data.id)
        .neq('status', 'completed')
        .limit(6);
      pendingTasks = (tasks || []).map((t) => String(t.title));
    }

    if (!conversationId) {
      const { data: createdConv, error: cErr } = await auth.supabase
        .from('chat_conversations')
        .insert({
          user_id: auth.user.id,
          title: message.slice(0, 60),
          target_role_name: profile.targetRoleName || 'General Career',
          message_count: 0,
        })
        .select()
        .single();

      if (cErr || !createdConv) {
        return NextResponse.json({ error: cErr?.message || 'Failed to create conversation.' }, { status: 500 });
      }
      conversationId = createdConv.id;
    }

    const { data: historyRows } = await auth.supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: true })
      .limit(12);

    const history = (historyRows || []).map((r) => ({
      role: (r.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: String(r.content),
    }));

    const reply = await runCareerCoachChatAI({
      message,
      history,
      context: {
        displayName: profile.displayName || 'Student',
        targetRoleName: profile.targetRoleName || latestAnalysisRes.data?.target_role_name || '',
        skills: skills.map((s) => ({
          name: s.name,
          proficiency: s.proficiency,
          currentlyLearning: s.currentlyLearning,
        })),
        topGaps,
        activeRoadmapTitle: activeRoadmapRes.data?.title || undefined,
        pendingTasks,
        projects: projects.map((p) => `${p.title} (${p.status})`),
      },
    });

    const { data: insertedMsgs, error: mErr } = await auth.supabase
      .from('chat_messages')
      .insert([
        {
          conversation_id: conversationId,
          user_id: auth.user.id,
          role: 'user',
          content: message,
        },
        {
          conversation_id: conversationId,
          user_id: auth.user.id,
          role: 'assistant',
          content: reply,
        },
      ])
      .select();

    if (mErr) {
      return NextResponse.json({ error: mErr.message }, { status: 500 });
    }

    await auth.supabase
      .from('chat_conversations')
      .update({ message_count: history.length + 2 })
      .eq('id', conversationId)
      .eq('user_id', auth.user.id);

    return NextResponse.json({
      conversationId,
      reply,
      messages: (insertedMsgs || []).map(mapChatMessageRow),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Career coach chat failed.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required.' }, { status: 400 });
  }

  const { error, count } = await auth.supabase
    .from('chat_conversations')
    .delete({ count: 'exact' })
    .eq('id', conversationId)
    .eq('user_id', auth.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!count) {
    return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true, id: conversationId });
}
