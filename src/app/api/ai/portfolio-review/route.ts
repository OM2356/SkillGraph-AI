import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/supabase/server';
import { mapProjectRow } from '@/lib/mappers';
import { portfolioReviewSchema } from '@/lib/validations';
import { evaluatePortfolioProjectAI } from '@/lib/ai/gemini';
import { checkRateLimit } from '@/lib/rateLimit';
import { isGeminiConfigured } from '@/lib/supabase/config';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const limit = checkRateLimit(`review:${auth.user.id}`, 8, 60_000);
  if (!limit.allowed) return limit.response;

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      {
        error: 'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY to enable AI portfolio audits.',
        code: 'GEMINI_NOT_CONFIGURED',
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parsed = portfolioReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [{ data: projectRow, error: pErr }, { data: profileRow }] = await Promise.all([
      auth.supabase
        .from('projects')
        .select('*')
        .eq('id', parsed.data.projectId)
        .eq('user_id', auth.user.id)
        .maybeSingle(),
      auth.supabase
        .from('profiles')
        .select('target_role_name')
        .eq('id', auth.user.id)
        .maybeSingle(),
    ]);

    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }
    if (!projectRow) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }

    const project = mapProjectRow(projectRow);
    const targetRoleName = String(profileRow?.target_role_name || 'Software Engineer');
    const review = await evaluatePortfolioProjectAI({ project, targetRoleName });

    const { data: updated, error: uErr } = await auth.supabase
      .from('projects')
      .update({ ai_review: review })
      .eq('id', project.id)
      .eq('user_id', auth.user.id)
      .select()
      .single();

    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 });
    }

    return NextResponse.json({
      review,
      project: mapProjectRow(updated),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Portfolio review failed.' },
      { status: 500 }
    );
  }
}
