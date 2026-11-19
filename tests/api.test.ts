import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function expectStatus(path: string, allowedStatuses: number[], init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    redirect: 'manual',
    ...init,
  });
  assert.ok(
    allowedStatuses.includes(res.status),
    `Expected ${path} to return one of [${allowedStatuses.join(', ')}], got ${res.status}`
  );
  return res;
}

async function run() {
  // 1. Health endpoint
  const healthRes = await expectStatus('/api/health', [200]);
  const healthJson = await healthRes.json();
  assert.equal(healthJson.ok, true);
  assert.equal(healthJson.service, 'SkillGraph AI');
  assert.equal(healthJson.runtime, 'nextjs-nodejs');

  // 2. Public Careers Catalog + Role Detail + Role Comparison
  const careersRes = await expectStatus('/api/careers', [200]);
  const careersJson = await careersRes.json();
  assert.ok(Array.isArray(careersJson.roles), 'Expected roles array');
  assert.equal(careersJson.roles.length, 15, 'Expected 15 seeded career roles');

  const detailRes = await expectStatus('/api/careers/sde', [200]);
  const detailJson = await detailRes.json();
  assert.equal(detailJson.role.id, 'sde');

  await expectStatus('/api/careers/unknown-role-id', [404]);

  const compareRes = await expectStatus('/api/careers/compare', [200], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roleAId: 'sde', roleBId: 'full-stack-developer' }),
  });
  const compareJson = await compareRes.json();
  assert.equal(compareJson.roleA?.id, 'sde');
  assert.equal(compareJson.roleB?.id, 'full-stack-developer');
  assert.ok(Array.isArray(compareJson.sharedSkills), 'Expected sharedSkills in comparison');
  assert.ok(compareJson.sharedSkills.length >= 1);

  const resourcesRes = await expectStatus('/api/resources', [200]);
  const resourcesJson = await resourcesRes.json();
  assert.ok(Array.isArray(resourcesJson.resources) && resourcesJson.resources.length >= 15);

  // 3. Unauthenticated Protected API Routes must fail closed (401 or 503, never 200 or 500)
  const protectedEndpoints: Array<{ path: string; method?: string; body?: unknown }> = [
    { path: '/api/profile' },
    { path: '/api/skills' },
    { path: '/api/analysis' },
    { path: '/api/analysis', method: 'POST', body: { targetRoleId: 'sde' } },
    { path: '/api/roadmaps' },
    { path: '/api/projects' },
    {
      path: '/api/resources',
      method: 'POST',
      body: { resourceId: 'res-1', title: 'Test', skill: 'SQL', category: 'Official Documentation' },
    },
    { path: '/api/dashboard' },
    { path: '/api/analytics' },
    { path: '/api/ai/chat' },
    { path: '/api/ai/portfolio-review', method: 'POST', body: { projectId: 'x' } },
    { path: '/api/ai/project-recommendations', method: 'POST', body: { roleId: 'sde' } },
  ];

  for (const ep of protectedEndpoints) {
    await expectStatus(ep.path, [401, 503], {
      method: ep.method || 'GET',
      headers: ep.body ? { 'Content-Type': 'application/json' } : undefined,
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
  }

  // 4. Protected Frontend Routes must redirect unauthenticated users to /login
  for (const protectedRoute of ['/dashboard', '/skills', '/analysis', '/roadmap', '/portfolio', '/career-coach']) {
    const res = await expectStatus(protectedRoute, [302, 307, 308]);
    const location = res.headers.get('location') || '';
    assert.ok(location.includes('/login'), `Expected ${protectedRoute} redirect to /login, got "${location}"`);
  }

  // 5. Public Pages & Static Hero/Feature Images must return 200
  const publicPaths = [
    '/',
    '/features',
    '/careers',
    '/login',
    '/signup',
    '/images/hero_career_architecture.jpg',
    '/images/portfolio_project_preview.jpg',
    '/images/career_advisor_portrait.jpg',
  ];
  for (const path of publicPaths) {
    await expectStatus(path, [200]);
  }

  console.log('api.test.ts: All HTTP, auth guard, and static asset checks passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
