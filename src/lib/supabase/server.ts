import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSupabaseEnv } from './config';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function createServerSupabaseClient(): Promise<SupabaseClient | null> {
  const { url, anonKey, configured } = getSupabaseEnv();
  if (!configured) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called inside a Server Component render where headers are immutable; middleware refreshes tokens.
        }
      },
    },
  });
}

export function createServiceRoleSupabaseClient(): SupabaseClient | null {
  const { url, serviceRoleKey, adminConfigured } = getSupabaseEnv();
  if (!adminConfigured) {
    return null;
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function requireApiAuth(): Promise<
  | { ok: true; supabase: SupabaseClient; user: User }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.',
          code: 'SUPABASE_NOT_CONFIGURED',
        },
        { status: 503 }
      ),
    };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Authentication required. Please sign in to continue.',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      ),
    };
  }

  return { ok: true, supabase, user };
}
