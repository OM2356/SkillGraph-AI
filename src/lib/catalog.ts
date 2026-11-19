import { SEEDED_CAREER_ROLES, LEARNING_RESOURCES } from '@/shared/catalogData';
import type { CareerRole, LearningResourceItem, RoleSkillRequirement, SkillCategory } from '@/shared/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface DbRoleRow {
  id: string;
  name: string;
  domain: string;
  seniority_level: string;
  description: string;
  is_published: boolean;
  example_responsibilities: string[] | null;
  career_progression: string[] | null;
}

interface DbRoleSkillRow {
  role_id: string;
  skill_name: string;
  category: string;
  target_proficiency: number;
  weight: number;
  tier: 'required' | 'important' | 'optional';
  estimated_base_hours: number;
}

export async function getCatalogRoles(): Promise<CareerRole[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return SEEDED_CAREER_ROLES;

    const [{ data: rolesData, error: rolesErr }, { data: skillsData, error: skillsErr }] =
      await Promise.all([
        supabase.from('career_roles').select('*').eq('is_published', true),
        supabase.from('career_role_skills').select('*'),
      ]);

    if (rolesErr || skillsErr || !rolesData || rolesData.length === 0) {
      return SEEDED_CAREER_ROLES;
    }

    const dbRoles = rolesData as DbRoleRow[];
    const dbSkills = (skillsData || []) as DbRoleSkillRow[];
    const seedMap = new Map(SEEDED_CAREER_ROLES.map((r) => [r.id, r]));

    return dbRoles.map((row) => {
      const seed = seedMap.get(row.id);
      const roleSkills = dbSkills.filter((s) => s.role_id === row.id);
      if (roleSkills.length === 0 && seed) {
        return seed;
      }

      const toReq = (s: DbRoleSkillRow): RoleSkillRequirement => ({
        name: s.skill_name,
        category: s.category as SkillCategory,
        targetProficiency: Math.min(5, Math.max(1, s.target_proficiency)) as 1 | 2 | 3 | 4 | 5,
        weight: s.weight,
        tier: s.tier,
        estimatedBaseHours: s.estimated_base_hours,
      });

      return {
        id: row.id,
        name: row.name,
        domain: row.domain,
        seniorityLevel: row.seniority_level as CareerRole['seniorityLevel'],
        description: row.description,
        isPublished: row.is_published,
        requiredSkills: roleSkills.filter((s) => s.tier === 'required').map(toReq),
        importantSkills: roleSkills.filter((s) => s.tier === 'important').map(toReq),
        optionalSkills: roleSkills.filter((s) => s.tier === 'optional').map(toReq),
        exampleResponsibilities: row.example_responsibilities || seed?.exampleResponsibilities || [],
        careerProgression: row.career_progression || seed?.careerProgression || [],
      };
    });
  } catch {
    return SEEDED_CAREER_ROLES;
  }
}

export async function getCatalogRoleById(id: string): Promise<CareerRole | null> {
  const roles = await getCatalogRoles();
  return roles.find((r) => r.id === id) || null;
}

export async function getCatalogResources(): Promise<LearningResourceItem[]> {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return LEARNING_RESOURCES;

    const { data, error } = await supabase.from('resources').select('*');
    if (error || !data || data.length === 0) {
      return LEARNING_RESOURCES;
    }

    return data.map((row) => ({
      id: row.id,
      title: row.title,
      skill: row.skill,
      category: row.category as LearningResourceItem['category'],
      provider: row.provider,
      url: row.url || '',
      isSearchSuggestion: Boolean(row.is_search_suggestion),
      isFree: Boolean(row.is_free),
      difficulty: row.difficulty as LearningResourceItem['difficulty'],
      description: row.description,
      estimatedDuration: row.estimated_duration,
    }));
  } catch {
    return LEARNING_RESOURCES;
  }
}
