import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCatalogResources } from '@/lib/catalog';
import { mapSavedResourceRow } from '@/lib/mappers';
import { createServerSupabaseClient, requireApiAuth } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const resources = await getCatalogResources();
  let saved: ReturnType<typeof mapSavedResourceRow>[] = [];

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('saved_resources')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      saved = (data || []).map(mapSavedResourceRow);
    }
  }

  return NextResponse.json({ resources, saved });
}

const toggleBookmarkSchema = z.object({
  resourceId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  skill: z.string().trim().min(1),
  category: z.string().trim().min(1),
  provider: z.string().trim().optional().default(''),
  url: z.string().trim().optional().default(''),
  isSearchSuggestion: z.boolean().optional().default(false),
  isFree: z.boolean().optional().default(true),
  difficulty: z.string().trim().optional().default('Beginner'),
});

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = toggleBookmarkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const v = parsed.data;
    const { data: existing } = await auth.supabase
      .from('saved_resources')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('resource_id', v.resourceId)
      .maybeSingle();

    if (existing) {
      await auth.supabase
        .from('saved_resources')
        .delete()
        .eq('id', existing.id)
        .eq('user_id', auth.user.id);
      return NextResponse.json({ bookmarked: false, resourceId: v.resourceId });
    }

    const { data, error } = await auth.supabase
      .from('saved_resources')
      .insert({
        user_id: auth.user.id,
        resource_id: v.resourceId,
        title: v.title,
        skill: v.skill,
        category: v.category,
        provider: v.provider,
        url: v.url,
        is_search_suggestion: v.isSearchSuggestion,
        is_free: v.isFree,
        difficulty: v.difficulty,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ bookmarked: true, saved: mapSavedResourceRow(data) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
}
