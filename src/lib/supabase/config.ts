export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

  return {
    url,
    anonKey,
    serviceRoleKey,
    configured: Boolean(url && anonKey),
    adminConfigured: Boolean(url && serviceRoleKey),
  };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv().configured;
}

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim() || '';
  return Boolean(key && key !== 'MY_GEMINI_API_KEY');
}

export const PROTECTED_ROUTES = [
  '/dashboard',
  '/onboarding',
  '/profile',
  '/skills',
  '/career-explorer',
  '/analysis',
  '/roadmap',
  '/projects',
  '/resources',
  '/portfolio',
  '/career-coach',
  '/analytics',
  '/settings',
];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}
