import { NextResponse } from 'next/server';
import { getCatalogRoleById } from '@/lib/catalog';
import { CAREER_ROLE_DISCLAIMER, PROJECT_TEMPLATES } from '@/shared/catalogData';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const role = await getCatalogRoleById(id);

  if (!role) {
    return NextResponse.json({ error: 'Career role not found.' }, { status: 404 });
  }

  const templates = PROJECT_TEMPLATES.filter((t) => t.roleIds.includes(role.id));

  return NextResponse.json({
    role,
    recommendedTemplates: templates,
    disclaimer: CAREER_ROLE_DISCLAIMER,
  });
}
