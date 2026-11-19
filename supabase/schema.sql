-- =============================================================================
-- SkillGraph AI — Complete Supabase PostgreSQL Schema, RLS Policies & Seed Data
-- Run this once in the Supabase Dashboard -> SQL Editor -> New Query
-- =============================================================================

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text not null default 'Student',
  avatar_url text,
  college text default '',
  degree text default '',
  current_year text default '',
  graduation_year text default '',
  country text default '',
  target_role_id text default '',
  target_role_name text default '',
  career_domain text default '',
  target_companies text[] not null default '{}',
  desired_industry text default '',
  job_goal text default 'Software Engineering Role',
  hours_per_week integer not null default 10 check (hours_per_week between 1 and 80),
  learning_style text default 'Hands-on projects & official docs',
  budget_preference text not null default 'free_preferred' check (budget_preference in ('free_only', 'free_preferred', 'paid_ok')),
  preferred_language text default 'English',
  learning_pace text not null default 'steady' check (learning_pace in ('steady', 'intensive', 'flexible')),
  onboarding_completed boolean not null default false,
  streak_days integer not null default 0,
  total_hours_studied numeric(8, 2) not null default 0,
  portfolio_public boolean not null default false,
  portfolio_slug text unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, 'Student'), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. SKILLS (Canonical Skill Catalog)
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  description text default '',
  created_at timestamptz not null default timezone('utc', now())
);

-- 3. USER_SKILLS
create table if not exists public.user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete set null,
  name text not null,
  category text not null,
  proficiency integer not null check (proficiency between 1 and 5),
  experience_months integer not null default 0 check (experience_months >= 0),
  last_practiced text default '',
  confidence integer check (confidence between 1 and 5),
  evidence text default '',
  linked_project_id uuid,
  currently_learning boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_user_skills_user on public.user_skills(user_id, created_at desc);

drop trigger if exists trg_user_skills_updated_at on public.user_skills;
create trigger trg_user_skills_updated_at
  before update on public.user_skills
  for each row execute function public.set_updated_at();

-- 4. CAREER_ROLES & 5. CAREER_ROLE_SKILLS
create table if not exists public.career_roles (
  id text primary key,
  name text not null,
  domain text not null,
  seniority_level text not null,
  description text not null,
  is_published boolean not null default true,
  example_responsibilities text[] not null default '{}',
  career_progression text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.career_role_skills (
  id uuid primary key default gen_random_uuid(),
  role_id text not null references public.career_roles(id) on delete cascade,
  skill_name text not null,
  category text not null,
  target_proficiency integer not null check (target_proficiency between 1 and 5),
  weight integer not null check (weight between 1 and 10),
  tier text not null check (tier in ('required', 'important', 'optional')),
  estimated_base_hours integer not null default 20,
  unique (role_id, skill_name)
);

create index if not exists idx_career_role_skills_role on public.career_role_skills(role_id);

-- 6. ANALYSES & 7. ANALYSIS_ITEMS
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_role_id text not null,
  target_role_name text not null,
  readiness_score integer not null check (readiness_score between 0 and 100),
  overall_match_percentage integer not null check (overall_match_percentage between 0 and 100),
  matched_count integer not null default 0,
  improve_count integer not null default 0,
  missing_count integer not null default 0,
  estimated_hours integer not null default 0,
  estimated_weeks integer not null default 0,
  methodology text not null,
  ai_report jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_analyses_user on public.analyses(user_id, created_at desc);

create table if not exists public.analysis_items (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_name text not null,
  category text not null,
  tier text not null,
  current_proficiency integer not null,
  target_proficiency integer not null,
  importance_weight integer not null,
  gap_score integer not null,
  weighted_impact numeric(6, 2) not null default 0,
  priority text not null check (priority in ('high', 'medium', 'low', 'met')),
  status text not null check (status in ('matched', 'needs_improvement', 'missing')),
  demonstrated_in_project boolean not null default false,
  estimated_hours integer not null default 0,
  reason_matters text,
  learning_approach text,
  recommended_project text,
  resource_suggestion text
);

create index if not exists idx_analysis_items_analysis on public.analysis_items(analysis_id);

-- 8. ROADMAPS & 9. ROADMAP_TASKS
create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target_role_id text not null,
  target_role_name text not null,
  duration_days integer not null check (duration_days between 7 and 365),
  hours_per_week integer not null default 10,
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  phases jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_roadmaps_user on public.roadmaps(user_id, created_at desc);

drop trigger if exists trg_roadmaps_updated_at on public.roadmaps;
create trigger trg_roadmaps_updated_at
  before update on public.roadmaps
  for each row execute function public.set_updated_at();

create table if not exists public.roadmap_tasks (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  phase_index integer not null check (phase_index between 1 and 5),
  phase_name text not null,
  title text not null,
  description text default '',
  skill_name text not null,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  estimated_hours numeric(5, 1) not null default 3,
  start_date text,
  due_date text,
  learning_resource text default '',
  assignment text default '',
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed', 'skipped')),
  order_index integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_roadmap_tasks_roadmap on public.roadmap_tasks(roadmap_id, order_index);

drop trigger if exists trg_roadmap_tasks_updated_at on public.roadmap_tasks;
create trigger trg_roadmap_tasks_updated_at
  before update on public.roadmap_tasks
  for each row execute function public.set_updated_at();

-- 10. PROJECTS
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  tech_stack text[] not null default '{}',
  skills_demonstrated text[] not null default '{}',
  github_url text default '',
  live_url text default '',
  status text not null default 'in_progress' check (status in ('idea', 'in_progress', 'completed')),
  user_role text default 'Developer',
  achievements text default '',
  ai_review jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_projects_user on public.projects(user_id, created_at desc);

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- 11. RESOURCES & 12. SAVED_RESOURCES
create table if not exists public.resources (
  id text primary key,
  title text not null,
  skill text not null,
  category text not null,
  provider text not null,
  url text not null default '',
  is_search_suggestion boolean not null default false,
  is_free boolean not null default true,
  difficulty text not null,
  description text not null,
  estimated_duration text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.saved_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id text not null,
  title text not null,
  skill text not null,
  category text not null,
  provider text default '',
  url text default '',
  is_search_suggestion boolean not null default false,
  is_free boolean not null default true,
  difficulty text default 'Beginner',
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, resource_id)
);

create index if not exists idx_saved_resources_user on public.saved_resources(user_id);

-- 13. PROGRESS_RECORDS
create table if not exists public.progress_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_date date not null default current_date,
  hours_studied numeric(5, 2) not null default 0,
  tasks_completed integer not null default 0,
  skills_improved integer not null default 0,
  readiness_score integer,
  note text default '',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_progress_records_user on public.progress_records(user_id, record_date desc);

-- 14. CHAT_CONVERSATIONS & 15. CHAT_MESSAGES
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target_role_name text default '',
  message_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_chat_conversations_user on public.chat_conversations(user_id, updated_at desc);

drop trigger if exists trg_chat_conversations_updated_at on public.chat_conversations;
create trigger trg_chat_conversations_updated_at
  before update on public.chat_conversations
  for each row execute function public.set_updated_at();

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_chat_messages_conversation on public.chat_messages(conversation_id, created_at asc);

-- ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.user_skills enable row level security;
alter table public.career_roles enable row level security;
alter table public.career_role_skills enable row level security;
alter table public.analyses enable row level security;
alter table public.analysis_items enable row level security;
alter table public.roadmaps enable row level security;
alter table public.roadmap_tasks enable row level security;
alter table public.projects enable row level security;
alter table public.resources enable row level security;
alter table public.saved_resources enable row level security;
alter table public.progress_records enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Public read skills catalog" on public.skills;
create policy "Public read skills catalog" on public.skills for select using (true);

drop policy if exists "Public read career roles" on public.career_roles;
create policy "Public read career roles" on public.career_roles for select using (is_published = true);

drop policy if exists "Public read career role skills" on public.career_role_skills;
create policy "Public read career role skills" on public.career_role_skills for select using (true);

drop policy if exists "Public read learning resources" on public.resources;
create policy "Public read learning resources" on public.resources for select using (true);

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users manage own user_skills" on public.user_skills;
create policy "Users manage own user_skills" on public.user_skills for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own analyses" on public.analyses;
create policy "Users manage own analyses" on public.analyses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own analysis_items" on public.analysis_items;
create policy "Users manage own analysis_items" on public.analysis_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own roadmaps" on public.roadmaps;
create policy "Users manage own roadmaps" on public.roadmaps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own roadmap_tasks" on public.roadmap_tasks;
create policy "Users manage own roadmap_tasks" on public.roadmap_tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own projects" on public.projects;
create policy "Users manage own projects" on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own saved_resources" on public.saved_resources;
create policy "Users manage own saved_resources" on public.saved_resources for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own progress_records" on public.progress_records;
create policy "Users manage own progress_records" on public.progress_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own chat_conversations" on public.chat_conversations;
create policy "Users manage own chat_conversations" on public.chat_conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own chat_messages" on public.chat_messages;
create policy "Users manage own chat_messages" on public.chat_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- SEED DATA: 15 Career Roles + Benchmarks + Canonical Skills + Curated Resources
insert into public.career_roles (id, name, domain, seniority_level, description, is_published, example_responsibilities, career_progression)
values
  ('sde', 'Software Development Engineer', 'Core Software Engineering', 'Entry-Level / Intern', 'Designs, builds, tests, and maintains scalable software systems with strong foundations in algorithms, system internals, and clean object-oriented architecture.', true, array['Implement clean, well-tested application modules and backend services.', 'Solve algorithmic and data-modeling bottlenecks in production workloads.', 'Participate in code reviews, architecture discussions, and sprint planning.'], array['SDE Intern', 'SDE I', 'SDE II', 'Senior SDE', 'Staff / Principal Engineer']),
  ('full-stack-developer', 'Full Stack Developer', 'Web & Product Engineering', 'Junior / Early Career', 'Delivers end-to-end web applications spanning responsive user interfaces, authenticated APIs, relational/document databases, and cloud deployments.', true, array['Build accessible React interfaces connected to validated Node.js/TypeScript APIs.', 'Design database schemas, indexing strategies, and migrations.', 'Deploy and monitor full-stack applications in cloud environments.'], array['Junior Full Stack Dev', 'Full Stack Engineer', 'Senior Engineer', 'Tech Lead']),
  ('frontend-developer', 'Frontend Developer', 'Web & Product Engineering', 'Junior / Early Career', 'Crafts accessible, high-performance user interfaces with strong command of browser internals, modern React/TypeScript state architecture, and design systems.', true, array['Translate product specifications and design systems into responsive React components.', 'Optimize bundle size, Core Web Vitals, and rendering performance.', 'Ensure keyboard navigation, screen-reader accessibility, and cross-browser fidelity.'], array['Junior Frontend Dev', 'Frontend Engineer', 'Senior UI Engineer', 'Staff Frontend Architect']),
  ('backend-developer', 'Backend Developer', 'Distributed Systems & APIs', 'Junior / Early Career', 'Architects reliable APIs, data pipelines, caching layers, and secure business logic powering web and mobile platforms.', true, array['Build modular REST/RPC services with strict schema validation and rate limiting.', 'Optimize slow database queries and design transactional data workflows.', 'Implement structured logging, error handling, and health checks.'], array['Junior Backend Dev', 'Backend Engineer', 'Senior Backend Engineer', 'Principal Systems Architect']),
  ('java-developer', 'Java Developer', 'Enterprise & Backend Engineering', 'Junior / Early Career', 'Builds enterprise-grade microservices and high-throughput backend applications using Java, Spring Boot, relational databases, and JVM tooling.', true, array['Develop Spring Boot REST microservices with JPA/Hibernate persistence.', 'Write comprehensive unit and integration tests using JUnit and Mockito.', 'Profile JVM memory, thread pools, and SQL connection pools.'], array['Java Developer', 'Senior Java Engineer', 'Enterprise Architect']),
  ('python-developer', 'Python Developer', 'Backend & Automation', 'Junior / Early Career', 'Creates web backends, automation pipelines, and data-centric services using Python, FastAPI/Django, and modern testing practices.', true, array['Design clean Python APIs with Pydantic validation and async I/O.', 'Build ETL scripts, task queues, and automated test harnesses with Pytest.', 'Maintain reproducible virtual environments and containerized services.'], array['Python Developer', 'Backend Python Engineer', 'Senior Staff Engineer']),
  ('data-analyst', 'Data Analyst', 'Analytics & Business Intelligence', 'Entry-Level / Intern', 'Transforms raw business datasets into clear executive dashboards, statistical findings, and actionable product insights.', true, array['Write complex SQL joins, window functions, and cohort queries.', 'Build self-serve KPI dashboards and identify funnel drop-off trends.', 'Communicate clear quantitative findings to product and leadership teams.'], array['Junior Data Analyst', 'Data Analyst', 'Senior Analytics Engineer', 'Analytics Lead']),
  ('data-scientist', 'Data Scientist', 'Data Science & Experimentation', 'Junior / Early Career', 'Combines statistical modeling, machine learning, and experimental design to forecast outcomes and solve complex product problems.', true, array['Formulate predictive modeling hypotheses and run statistically valid experiments.', 'Train, calibrate, and evaluate regression, classification, and clustering models.', 'Present model trade-offs, confidence intervals, and business impact.'], array['Data Scientist', 'Senior Data Scientist', 'Staff Applied Scientist']),
  ('ml-engineer', 'Machine Learning Engineer', 'Applied ML & MLOps', 'Junior / Early Career', 'Bridges research and production by building reproducible training pipelines, feature stores, and low-latency model inference services.', true, array['Build automated model training, evaluation, and registry workflows.', 'Serve ML models behind validated, low-latency inference APIs.', 'Monitor model drift, data quality, and latency budgets in production.'], array['ML Engineer', 'Senior ML Engineer', 'Principal MLOps Architect']),
  ('ai-engineer', 'AI Engineer', 'Generative AI & LLM Systems', 'Junior / Early Career', 'Builds production LLM applications featuring structured outputs, retrieval-augmented generation (RAG), evaluation harnesses, and agentic workflows.', true, array['Design grounded RAG pipelines with chunking, hybrid retrieval, and citation checks.', 'Build deterministic evaluation suites to measure hallucination rates and latency.', 'Ship full-stack AI workflows with server-side key protection and streaming UX.'], array['AI Engineer', 'Senior AI Systems Engineer', 'Head of Applied AI']),
  ('cybersecurity-analyst', 'Cybersecurity Analyst', 'Security & Threat Defense', 'Entry-Level / Intern', 'Protects networks, applications, and cloud assets through vulnerability assessment, SIEM monitoring, incident triage, and secure architecture review.', true, array['Triage security alerts, correlate logs, and investigate anomalous access patterns.', 'Perform vulnerability scans and verify remediation across web APIs.', 'Author clear incident reports and security hardening recommendations.'], array['SOC Analyst Tier 1', 'Cybersecurity Analyst', 'Security Engineer', 'CISO Track']),
  ('cloud-engineer', 'Cloud Engineer', 'Cloud Infrastructure', 'Junior / Early Career', 'Provisions, secures, and optimizes scalable cloud infrastructure using Infrastructure as Code, networking primitives, and managed cloud services.', true, array['Write modular Terraform configurations for reproducible multi-environment infrastructure.', 'Configure least-privilege IAM policies, VPC subnets, and load balancers.', 'Automate backups, observability alerts, and disaster recovery drills.'], array['Cloud Support / Junior Cloud', 'Cloud Engineer', 'Senior Cloud Architect']),
  ('devops-engineer', 'DevOps Engineer', 'CI/CD & Site Reliability', 'Junior / Early Career', 'Accelerates software delivery reliability through automated CI/CD pipelines, container orchestration, observability, and infrastructure automation.', true, array['Build zero-downtime CI/CD pipelines with automated test and security gates.', 'Manage containerized workloads, autoscaling, and ingress routing.', 'Define SLIs/SLOs and actionable alerting runbooks.'], array['Junior DevOps', 'DevOps / SRE Engineer', 'Senior Platform Engineer']),
  ('qa-automation-engineer', 'QA Automation Engineer', 'Quality Engineering', 'Junior / Early Career', 'Guarantees product reliability by building maintainable end-to-end, API, and performance test frameworks integrated directly into CI/CD.', true, array['Author deterministic Playwright E2E and API contract regression suites.', 'Eliminate flaky tests and integrate automated reporting into pull requests.', 'Collaborate with product and engineering to define acceptance criteria.'], array['QA Analyst', 'QA Automation Engineer', 'SDET / Staff Quality Engineer']),
  ('ui-ux-designer', 'UI/UX Designer', 'Product Design', 'Junior / Early Career', 'Designs intuitive, accessible digital products grounded in user research, information architecture, interactive prototyping, and scalable design systems.', true, array['Conduct user interviews, synthesize journey maps, and test clickable prototypes.', 'Maintain accessible token-based component libraries for engineering handoff.', 'Iterate on interaction flows based on usability findings and conversion metrics.'], array['Junior Product Designer', 'UI/UX Designer', 'Senior Product Designer', 'Design Lead'])
on conflict (id) do nothing;

insert into public.career_role_skills (role_id, skill_name, category, target_proficiency, weight, tier, estimated_base_hours)
values
  ('sde', 'Data Structures & Algorithms', 'Programming Languages', 4, 10, 'required', 60),
  ('sde', 'Java or C++', 'Programming Languages', 4, 9, 'required', 45),
  ('sde', 'Object-Oriented Programming', 'Programming Languages', 4, 9, 'required', 25),
  ('sde', 'DBMS', 'Database', 3, 8, 'required', 25),
  ('sde', 'SQL', 'Database', 3, 8, 'required', 20),
  ('sde', 'Git', 'Tools', 3, 8, 'required', 10),
  ('sde', 'Problem Solving', 'Soft Skills', 4, 9, 'required', 30),
  ('sde', 'Operating Systems', 'Backend', 3, 7, 'important', 25),
  ('sde', 'Computer Networks', 'Backend', 3, 6, 'important', 20),
  ('sde', 'REST APIs', 'Backend', 3, 7, 'important', 20),
  ('sde', 'Docker', 'DevOps', 2, 4, 'optional', 15),
  ('full-stack-developer', 'TypeScript', 'Programming Languages', 4, 9, 'required', 35),
  ('full-stack-developer', 'React', 'Frontend', 4, 9, 'required', 40),
  ('full-stack-developer', 'Node.js', 'Backend', 4, 9, 'required', 35),
  ('full-stack-developer', 'REST APIs', 'Backend', 4, 8, 'required', 20),
  ('full-stack-developer', 'SQL', 'Database', 3, 8, 'required', 25),
  ('full-stack-developer', 'Git', 'Tools', 3, 8, 'required', 10),
  ('full-stack-developer', 'HTML & CSS', 'Frontend', 4, 7, 'important', 20),
  ('full-stack-developer', 'PostgreSQL', 'Database', 3, 7, 'important', 20),
  ('full-stack-developer', 'Authentication & Security', 'Cybersecurity', 3, 7, 'important', 18),
  ('frontend-developer', 'JavaScript', 'Programming Languages', 4, 10, 'required', 40),
  ('frontend-developer', 'TypeScript', 'Programming Languages', 4, 9, 'required', 30),
  ('frontend-developer', 'React', 'Frontend', 4, 10, 'required', 45),
  ('frontend-developer', 'HTML & CSS', 'Frontend', 4, 9, 'required', 25),
  ('frontend-developer', 'Tailwind CSS', 'Frontend', 3, 7, 'required', 15),
  ('frontend-developer', 'Git', 'Tools', 3, 7, 'required', 10),
  ('frontend-developer', 'Web Accessibility (WCAG)', 'Frontend', 3, 8, 'important', 18),
  ('backend-developer', 'Node.js or Go or Java', 'Backend', 4, 10, 'required', 45),
  ('backend-developer', 'REST APIs', 'Backend', 4, 9, 'required', 25),
  ('backend-developer', 'SQL', 'Database', 4, 9, 'required', 30),
  ('backend-developer', 'PostgreSQL', 'Database', 4, 8, 'required', 25),
  ('backend-developer', 'Authentication & Security', 'Cybersecurity', 3, 8, 'required', 20),
  ('backend-developer', 'Docker', 'DevOps', 3, 7, 'important', 16),
  ('java-developer', 'Java', 'Programming Languages', 4, 10, 'required', 50),
  ('java-developer', 'Spring Boot', 'Backend', 4, 9, 'required', 40),
  ('java-developer', 'SQL', 'Database', 4, 8, 'required', 25),
  ('java-developer', 'REST APIs', 'Backend', 4, 8, 'required', 20),
  ('java-developer', 'JUnit & Mockito', 'Testing', 3, 7, 'important', 18),
  ('python-developer', 'Python', 'Programming Languages', 4, 10, 'required', 45),
  ('python-developer', 'FastAPI or Django', 'Backend', 4, 9, 'required', 35),
  ('python-developer', 'REST APIs', 'Backend', 4, 8, 'required', 20),
  ('python-developer', 'SQL', 'Database', 3, 8, 'required', 25),
  ('python-developer', 'Pytest', 'Testing', 3, 7, 'important', 16),
  ('data-analyst', 'SQL', 'Database', 4, 10, 'required', 35),
  ('data-analyst', 'Excel / Spreadsheets', 'Data', 4, 8, 'required', 20),
  ('data-analyst', 'Python or R', 'Programming Languages', 3, 8, 'required', 35),
  ('data-analyst', 'Data Visualization (Tableau/PowerBI)', 'Data', 4, 9, 'required', 30),
  ('data-analyst', 'Statistics & Probability', 'Data', 3, 8, 'required', 25),
  ('data-scientist', 'Python', 'Programming Languages', 4, 10, 'required', 40),
  ('data-scientist', 'Statistics & Probability', 'Data', 4, 10, 'required', 40),
  ('data-scientist', 'Machine Learning (Scikit-Learn)', 'AI/ML', 4, 9, 'required', 45),
  ('data-scientist', 'SQL', 'Database', 4, 8, 'required', 25),
  ('data-scientist', 'Pandas & NumPy', 'Data', 4, 9, 'required', 25),
  ('ml-engineer', 'Python', 'Programming Languages', 4, 10, 'required', 40),
  ('ml-engineer', 'PyTorch or TensorFlow', 'AI/ML', 4, 9, 'required', 50),
  ('ml-engineer', 'Machine Learning Algorithms', 'AI/ML', 4, 9, 'required', 45),
  ('ml-engineer', 'Docker', 'DevOps', 3, 8, 'required', 18),
  ('ml-engineer', 'MLOps & Model Serving', 'AI/ML', 3, 8, 'important', 30),
  ('ai-engineer', 'Python or TypeScript', 'Programming Languages', 4, 10, 'required', 40),
  ('ai-engineer', 'LLM APIs & Prompt Engineering', 'AI/ML', 4, 10, 'required', 30),
  ('ai-engineer', 'RAG & Vector Embeddings', 'AI/ML', 4, 9, 'required', 35),
  ('ai-engineer', 'REST APIs & Backend Architecture', 'Backend', 4, 8, 'required', 25),
  ('ai-engineer', 'AI Evaluation & Guardrails', 'AI/ML', 3, 8, 'required', 25),
  ('cybersecurity-analyst', 'Network Security & Protocols', 'Cybersecurity', 4, 10, 'required', 40),
  ('cybersecurity-analyst', 'Linux Administration', 'Tools', 4, 9, 'required', 30),
  ('cybersecurity-analyst', 'OWASP Top 10 & Web Security', 'Cybersecurity', 4, 9, 'required', 30),
  ('cybersecurity-analyst', 'SIEM & Log Analysis', 'Cybersecurity', 3, 8, 'required', 25),
  ('cloud-engineer', 'Cloud Platforms (AWS / GCP / Azure)', 'Cloud', 4, 10, 'required', 45),
  ('cloud-engineer', 'Networking & VPCs', 'Cloud', 4, 9, 'required', 30),
  ('cloud-engineer', 'Linux CLI', 'Tools', 4, 9, 'required', 25),
  ('cloud-engineer', 'Terraform / IaC', 'DevOps', 4, 9, 'required', 35),
  ('devops-engineer', 'CI/CD (GitHub Actions / GitLab)', 'DevOps', 4, 10, 'required', 30),
  ('devops-engineer', 'Docker & Containers', 'DevOps', 4, 10, 'required', 30),
  ('devops-engineer', 'Linux Administration', 'Tools', 4, 9, 'required', 28),
  ('devops-engineer', 'Kubernetes', 'DevOps', 3, 8, 'important', 35),
  ('qa-automation-engineer', 'Test Automation (Playwright / Selenium)', 'Testing', 4, 10, 'required', 40),
  ('qa-automation-engineer', 'JavaScript / TypeScript or Python', 'Programming Languages', 3, 9, 'required', 35),
  ('qa-automation-engineer', 'API Testing (Postman / RestAssured)', 'Testing', 4, 9, 'required', 25),
  ('qa-automation-engineer', 'Test Strategy & Bug Reporting', 'Testing', 4, 8, 'required', 18),
  ('ui-ux-designer', 'Figma & Prototyping', 'Tools', 4, 10, 'required', 40),
  ('ui-ux-designer', 'User Research & Usability Testing', 'Soft Skills', 4, 9, 'required', 30),
  ('ui-ux-designer', 'Design Systems & Components', 'Frontend', 4, 9, 'required', 30),
  ('ui-ux-designer', 'Accessibility Design (WCAG)', 'Frontend', 3, 8, 'required', 18)
on conflict (role_id, skill_name) do nothing;

insert into public.skills (slug, name, category, description)
values
  ('typescript', 'TypeScript', 'Programming Languages', 'Static type system layered over JavaScript'),
  ('javascript', 'JavaScript', 'Programming Languages', 'Core browser and Node.js programming language'),
  ('python', 'Python', 'Programming Languages', 'General-purpose language for backend, data, and AI'),
  ('java', 'Java', 'Programming Languages', 'Strongly typed object-oriented JVM language'),
  ('react', 'React', 'Frontend', 'Declarative UI library for interactive web applications'),
  ('nodejs', 'Node.js', 'Backend', 'Event-driven server runtime for JavaScript and TypeScript'),
  ('sql', 'SQL', 'Database', 'Relational database querying and schema language'),
  ('postgresql', 'PostgreSQL', 'Database', 'Open-source object-relational database system'),
  ('docker', 'Docker', 'DevOps', 'Containerization platform for reproducible builds'),
  ('git', 'Git', 'Tools', 'Distributed version control system'),
  ('dsa', 'Data Structures & Algorithms', 'Programming Languages', 'Foundational problem solving and complexity optimization'),
  ('rest-apis', 'REST APIs', 'Backend', 'HTTP resource architecture and endpoint design')
on conflict (slug) do nothing;

insert into public.resources (id, title, skill, category, provider, url, is_search_suggestion, is_free, difficulty, description, estimated_duration)
values
  ('res-mdn-js', 'MDN Web Docs — JavaScript & Web APIs', 'JavaScript', 'Official Documentation', 'Mozilla (MDN)', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', false, true, 'Beginner', 'Authoritative reference and tutorials for modern JavaScript, DOM APIs, and asynchronous programming.', 'Self-paced reference'),
  ('res-ts-handbook', 'The TypeScript Handbook', 'TypeScript', 'Official Documentation', 'Microsoft TypeScript', 'https://www.typescriptlang.org/docs/handbook/intro.html', false, true, 'Intermediate', 'Official guide covering type narrowing, generics, utility types, and strict compiler configuration.', '8–12 hours'),
  ('res-react-docs', 'React Official Learn Guide', 'React', 'Official Documentation', 'React Team', 'https://react.dev/learn', false, true, 'Beginner', 'Interactive mental model of React components, state, effects, and performance best practices.', '10–15 hours'),
  ('res-postgres-docs', 'PostgreSQL Official Tutorial & SQL Reference', 'SQL', 'Official Documentation', 'PostgreSQL Global Development Group', 'https://www.postgresql.org/docs/current/tutorial.html', false, true, 'Beginner', 'Foundational relational modeling, joins, window functions, transactions, and query optimization.', '12–16 hours'),
  ('res-python-docs', 'Official Python Tutorial', 'Python', 'Official Documentation', 'Python Software Foundation', 'https://docs.python.org/3/tutorial/', false, true, 'Beginner', 'Core Python data structures, modules, standard library, and object-oriented patterns.', '10–14 hours'),
  ('res-docker-docs', 'Docker Get Started Guide', 'Docker', 'Official Documentation', 'Docker', 'https://docs.docker.com/get-started/', false, true, 'Beginner', 'Container fundamentals, multi-stage Dockerfiles, networking, and Docker Compose workflows.', '6–8 hours'),
  ('res-owasp-top10', 'OWASP Top 10 Web Application Security Risks', 'OWASP Top 10 & Web Security', 'Official Documentation', 'OWASP Foundation', 'https://owasp.org/www-project-top-ten/', false, true, 'Intermediate', 'Industry-standard taxonomy of injection, broken access control, and cryptographic vulnerabilities.', '6–10 hours'),
  ('res-playwright-docs', 'Playwright Testing Documentation', 'Test Automation (Playwright / Selenium)', 'Official Documentation', 'Microsoft Playwright', 'https://playwright.dev/docs/intro', false, true, 'Intermediate', 'Reliable end-to-end browser testing, locators, API mocking, and CI trace debugging.', '8–10 hours'),
  ('res-pytorch-tutorials', 'PyTorch Official Tutorials', 'PyTorch or TensorFlow', 'Official Documentation', 'PyTorch', 'https://pytorch.org/tutorials/', false, true, 'Intermediate', 'Tensors, autograd, neural network modules, training loops, and model deployment guides.', '20–30 hours'),
  ('res-git-book', 'Pro Git Book (Free Online Edition)', 'Git', 'Books', 'Git SCM', 'https://git-scm.com/book/en/v2', false, true, 'Beginner', 'Complete reference on branching, rebasing, conflict resolution, and Git internals.', '6–8 hours'),
  ('res-dsa-search', 'NeetCode / LeetCode Blind 75 & Striver A2Z DSA Sheet', 'Data Structures & Algorithms', 'Coding Platforms', 'Search Suggestion', '', true, true, 'Intermediate', 'Search suggestion: Practice structured patterns (arrays, sliding window, trees, graphs, dynamic programming).', '40–60 hours'),
  ('res-system-design-search', 'MIT Distributed Systems & System Design Primer', 'System Design', 'Free Courses', 'Search Suggestion', '', true, true, 'Advanced', 'Search suggestion: Search "System Design Primer GitHub" and "MIT 6.824 Distributed Systems lectures" for caching, sharding, and consensus.', '25–35 hours'),
  ('res-sql-practice-search', 'SQLBolt & Mode SQL Analytics Tutorial', 'SQL', 'Interactive Practice', 'Search Suggestion', '', true, true, 'Beginner', 'Search suggestion: Search "SQLBolt interactive lessons" and "Mode SQL Tutorial window functions" for hands-on query drills.', '8–12 hours'),
  ('res-figma-learn', 'Figma Help Center & Design Systems 101', 'Figma & Prototyping', 'Official Documentation', 'Figma', 'https://help.figma.com/hc/en-us', false, true, 'Beginner', 'Auto-layout, component variants, interactive prototyping, and variable design tokens.', '8–12 hours'),
  ('res-k8s-docs', 'Kubernetes Official Tutorials', 'Kubernetes', 'Official Documentation', 'CNCF Kubernetes', 'https://kubernetes.io/docs/tutorials/', false, true, 'Intermediate', 'Pods, Deployments, Services, ConfigMaps, and production cluster scaling concepts.', '15–20 hours')
on conflict (id) do nothing;
