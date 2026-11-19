import { NextResponse } from 'next/server';
import { getCatalogRoles } from '@/lib/catalog';
import { CAREER_ROLE_DISCLAIMER } from '@/shared/catalogData';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');
  const query = searchParams.get('q')?.trim().toLowerCase();

  let roles = await getCatalogRoles();

  if (domain && domain !== 'All') {
    roles = roles.filter((r) => r.domain === domain);
  }
  if (query) {
    roles = roles.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.domain.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.requiredSkills.some((s) => s.name.toLowerCase().includes(query))
    );
  }

  return NextResponse.json({
    roles,
    disclaimer: CAREER_ROLE_DISCLAIMER,
  });
}
