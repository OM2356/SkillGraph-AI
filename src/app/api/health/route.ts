import { NextResponse } from 'next/server';
import { isGeminiConfigured, isSupabaseConfigured } from '@/lib/supabase/config';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'SkillGraph AI',
    runtime: 'nextjs-nodejs',
    supabaseConfigured: isSupabaseConfigured(),
    geminiConfigured: isGeminiConfigured(),
    timestamp: new Date().toISOString(),
  });
}
