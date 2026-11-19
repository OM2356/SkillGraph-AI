import { GoogleGenAI, Type } from '@google/genai';
import type {
  AIAnalysisReportPayload,
  CareerRole,
  GapItemResult,
  PortfolioAIReview,
  ProjectTemplate,
  RoadmapPhase,
  UserProfile,
  UserProject,
  UserSkill,
} from '@/shared/types';

const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 600 * attempt));
      }
    }
  }
  throw lastErr;
}

export async function generateGapAnalysisNarrative(params: {
  role: CareerRole;
  profile: Partial<UserProfile>;
  userSkills: UserSkill[];
  userProjects: UserProject[];
  readinessScore: number;
  overallMatchPercentage: number;
  estimatedHours: number;
  gapItems: GapItemResult[];
}): Promise<{
  report: AIAnalysisReportPayload;
  gapEnrichments: Array<{
    skillName: string;
    reasonMatters: string;
    learningApproach: string;
    recommendedProject: string;
    resourceSuggestion: string;
  }>;
}> {
  const ai = getGeminiClient();

  const missingOrWeak = params.gapItems.filter((g) => g.gapScore > 0).slice(0, 14);
  const strong = params.gapItems.filter((g) => g.gapScore === 0);
  const totalExpMonths = params.userSkills.reduce((acc, s) => acc + (s.experienceMonths || 0), 0);

  const prompt = `
You are an expert software engineering career architect analyzing a candidate's readiness for "${params.role.name}" (${params.role.domain}).
Use ONLY the factual data provided below. Make the analysis deeply specific to this individual candidate's background, skills, project achievements, and time constraints — never produce generic boilerplate. Do NOT invent fake salaries or unverified external URLs.

CANDIDATE PROFILE:
- Name: ${params.profile.displayName || 'Candidate'}
- Education: ${params.profile.degree || 'Not specified'} at ${params.profile.college || 'Not specified'} (Stage: ${params.profile.currentYear || 'N/A'}, Grad: ${params.profile.graduationYear || 'N/A'})
- Career Goal: ${params.profile.jobGoal || 'Software Role'} in ${params.profile.desiredIndustry || params.role.domain}
- Weekly Study Capacity: ${params.profile.hoursPerWeek || 10} hours/week
- Learning Style: ${params.profile.learningStyle || 'Hands-on projects'}
- Budget Preference: ${params.profile.budgetPreference || 'free_preferred'}

CANDIDATE SKILL INVENTORY (${params.userSkills.length} skills, ${totalExpMonths} cumulative practice months):
${params.userSkills.map((s) => `- ${s.name} [${s.category}]: Prof ${s.proficiency}/5, ${s.experienceMonths ?? 0} mos${s.currentlyLearning ? ', currently learning' : ''}${s.evidence ? `, evidence: ${s.evidence}` : ''}`).join('\n') || '- No skills logged yet.'}

DETERMINISTIC SCORING RESULTS (DO NOT CHANGE THESE NUMBERS):
- Readiness Score: ${params.readinessScore}%
- Weighted Skill Match: ${params.overallMatchPercentage}%
- Estimated Study Effort: ${params.estimatedHours} hours
- Strong / Matched Skills (${strong.length}): ${strong.map((s) => `${s.skillName} (Lvl ${s.currentProficiency}/${s.targetProficiency})`).join(', ') || 'None yet'}
- Gaps to Close (${missingOrWeak.length}):
${missingOrWeak.map((g) => `  * ${g.skillName} [${g.priority.toUpperCase()}, Weight ${g.importanceWeight}/10]: Current ${g.currentProficiency}/5 -> Target ${g.targetProficiency}/5 (${g.estimatedHours}h est, Project Evidence: ${g.demonstratedInProject ? 'Yes' : 'No'})`).join('\n')}

PORTFOLIO PROJECTS (${params.userProjects.length}):
${params.userProjects.map((p) => `- ${p.title} (${p.status}, Role: ${p.userRole || 'Developer'}): Stack [${(p.techStack || []).join(', ')}]. ${p.achievements ? `Achievements: ${p.achievements}.` : ''} Summary: ${p.description.slice(0, 180)}`).join('\n') || '- No portfolio projects logged yet.'}

Generate a crisp, practical, candidate-specific career readiness report and per-skill guidance in the exact JSON schema requested. Reference their actual skills, missing requirements, existing projects, and ${params.profile.hoursPerWeek || 10}h/week cadence.
`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction:
          'You are SkillGraph AI Career Architect. Respond strictly in concise, actionable JSON conforming to the responseSchema. Tailor every insight to the candidate profile provided. Never fabricate URLs.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveOverview: { type: Type.STRING },
            strengthsSummary: { type: Type.ARRAY, items: { type: Type.STRING } },
            criticalGapInsights: { type: Type.ARRAY, items: { type: Type.STRING } },
            learningSequenceRationale: { type: Type.ARRAY, items: { type: Type.STRING } },
            projectRecommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  targetSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                  scope: { type: Type.STRING },
                  impact: { type: Type.STRING },
                },
              },
            },
            portfolioImprovements: { type: Type.ARRAY, items: { type: Type.STRING } },
            interviewPreparation: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedWeeklySchedule: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayOrBlock: { type: Type.STRING },
                  focusArea: { type: Type.STRING },
                  hours: { type: Type.NUMBER },
                  activity: { type: Type.STRING },
                },
              },
            },
            careerAdvice: { type: Type.STRING },
            thirtyDayActionPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
            gapEnrichments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  skillName: { type: Type.STRING },
                  reasonMatters: { type: Type.STRING },
                  learningApproach: { type: Type.STRING },
                  recommendedProject: { type: Type.STRING },
                  resourceSuggestion: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    })
  );

  const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<AIAnalysisReportPayload> & {
    gapEnrichments?: Array<{
      skillName: string;
      reasonMatters: string;
      learningApproach: string;
      recommendedProject: string;
      resourceSuggestion: string;
    }>;
  };

  return {
    report: {
      executiveOverview: parsed.executiveOverview || `Analysis complete for ${params.role.name}.`,
      strengthsSummary: Array.isArray(parsed.strengthsSummary) ? parsed.strengthsSummary : [],
      criticalGapInsights: Array.isArray(parsed.criticalGapInsights) ? parsed.criticalGapInsights : [],
      learningSequenceRationale: Array.isArray(parsed.learningSequenceRationale)
        ? parsed.learningSequenceRationale
        : [],
      projectRecommendations: Array.isArray(parsed.projectRecommendations)
        ? parsed.projectRecommendations
        : [],
      portfolioImprovements: Array.isArray(parsed.portfolioImprovements)
        ? parsed.portfolioImprovements
        : [],
      interviewPreparation: Array.isArray(parsed.interviewPreparation)
        ? parsed.interviewPreparation
        : [],
      recommendedWeeklySchedule: Array.isArray(parsed.recommendedWeeklySchedule)
        ? parsed.recommendedWeeklySchedule
        : [],
      careerAdvice: parsed.careerAdvice || '',
      thirtyDayActionPlan: Array.isArray(parsed.thirtyDayActionPlan) ? parsed.thirtyDayActionPlan : [],
    },
    gapEnrichments: Array.isArray(parsed.gapEnrichments) ? parsed.gapEnrichments : [],
  };
}

const CANONICAL_PHASES = [
  'Foundation',
  'Core Skills',
  'Advanced Skills',
  'Projects & Portfolio',
  'Interview & Job Preparation',
];

export async function generatePersonalizedRoadmapAI(params: {
  role: CareerRole;
  durationDays: number;
  hoursPerWeek: number;
  learningStyle: string;
  budgetPreference: string;
  gapItems: GapItemResult[];
  existingSkills: UserSkill[];
}): Promise<{
  title: string;
  phases: RoadmapPhase[];
  tasks: Array<{
    phaseIndex: number;
    phaseName: string;
    title: string;
    description: string;
    skillName: string;
    priority: 'high' | 'medium' | 'low';
    estimatedHours: number;
    dayOffsetStart: number;
    dayOffsetEnd: number;
    learningResource: string;
    assignment: string;
  }>;
}> {
  const ai = getGeminiClient();
  const gaps = params.gapItems.filter((g) => g.gapScore > 0);
  const totalBudgetHours = Math.max(12, Math.round((params.durationDays / 7) * params.hoursPerWeek));

  const prompt = `
Create a structured, practical ${params.durationDays}-day learning roadmap for "${params.role.name}".
Weekly budget: ${params.hoursPerWeek} hours/week (~${totalBudgetHours} total hours across ${params.durationDays} days).
Preferred learning style: ${params.learningStyle}. Resource budget: ${params.budgetPreference}.

Existing Skills: ${params.existingSkills.map((s) => `${s.name} (Lvl ${s.proficiency})`).join(', ') || 'Starting fresh'}
Prioritized Skill Gaps:
${gaps.slice(0, 12).map((g) => `- ${g.skillName} (Priority: ${g.priority}, Current ${g.currentProficiency}->${g.targetProficiency}, Est ${g.estimatedHours}h)`).join('\n') || '- Focus on role core mastery & portfolio depth'}

Structure the roadmap into exactly 5 phases:
1: Foundation
2: Core Skills
3: Advanced Skills
4: Projects & Portfolio
5: Interview & Job Preparation

Generate 12 to 18 concrete, non-generic tasks distributed across phases 1..5 with dayOffsetStart and dayOffsetEnd between 0 and ${params.durationDays}.
Every task MUST have a concrete practical assignment/deliverable and a real official doc name or clear search label in learningResource. Never invent URLs.
`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction:
          'You are SkillGraph AI Curriculum Planner. Output strict JSON matching responseSchema with realistic hours and actionable deliverables.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            phases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  phaseIndex: { type: Type.INTEGER },
                  name: { type: Type.STRING },
                  goal: { type: Type.STRING },
                  weekRange: { type: Type.STRING },
                },
              },
            },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  phaseIndex: { type: Type.INTEGER },
                  phaseName: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  skillName: { type: Type.STRING },
                  priority: { type: Type.STRING },
                  estimatedHours: { type: Type.NUMBER },
                  dayOffsetStart: { type: Type.INTEGER },
                  dayOffsetEnd: { type: Type.INTEGER },
                  learningResource: { type: Type.STRING },
                  assignment: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    })
  );

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    title?: string;
    phases?: RoadmapPhase[];
    tasks?: Array<{
      phaseIndex: number;
      phaseName: string;
      title: string;
      description: string;
      skillName: string;
      priority: string;
      estimatedHours: number;
      dayOffsetStart: number;
      dayOffsetEnd: number;
      learningResource: string;
      assignment: string;
    }>;
  };

  const normalizedPhases: RoadmapPhase[] = [1, 2, 3, 4, 5].map((idx) => {
    const found = (parsed.phases || []).find((p) => Number(p.phaseIndex) === idx);
    return {
      phaseIndex: idx,
      name: (found?.name || CANONICAL_PHASES[idx - 1]).slice(0, 80),
      goal: (found?.goal || `Master Phase ${idx} milestones for ${params.role.name}`).slice(0, 200),
      weekRange: (found?.weekRange || `Phase ${idx}`).slice(0, 40),
    };
  });

  const normalizedTasks = (parsed.tasks || []).slice(0, 25).map((t, index) => {
    const phaseIndex = Math.min(5, Math.max(1, Math.round(Number(t.phaseIndex) || 1)));
    const startOffset = Math.min(
      Math.max(0, Math.round(Number(t.dayOffsetStart) || index * Math.floor(params.durationDays / 15))),
      Math.max(0, params.durationDays - 1)
    );
    const endOffset = Math.min(
      params.durationDays,
      Math.max(startOffset + 1, Math.round(Number(t.dayOffsetEnd) || startOffset + 3))
    );

    return {
      phaseIndex,
      phaseName: normalizedPhases[phaseIndex - 1].name,
      title: (t.title || `Skill Milestone ${index + 1}`).trim().slice(0, 160),
      description: (t.description || 'Complete focused study and build practical exercises.').trim().slice(0, 1200),
      skillName: (t.skillName || gaps[0]?.skillName || 'Core Engineering').trim().slice(0, 80),
      priority: (t.priority === 'high' || t.priority === 'low' ? t.priority : 'medium') as 'high' | 'medium' | 'low',
      estimatedHours: Math.min(80, Math.max(1, Math.round(Number(t.estimatedHours) || 3))),
      dayOffsetStart: startOffset,
      dayOffsetEnd: endOffset,
      learningResource: (t.learningResource || 'Official Documentation & Guided Exercises').trim().slice(0, 300),
      assignment: (t.assignment || 'Build and commit a verifiable code module or technical write-up.').trim().slice(0, 400),
    };
  });

  return {
    title: (parsed.title || `${params.durationDays}-Day ${params.role.name} Roadmap`).slice(0, 160),
    phases: normalizedPhases,
    tasks: normalizedTasks,
  };
}

export async function generateProjectRecommendationsAI(params: {
  role: CareerRole;
  missingSkills: string[];
  skillsToImprove?: string[];
  existingSkills: string[];
  existingProjects?: string[];
  roadmapFocus?: string;
}): Promise<ProjectTemplate[]> {
  const ai = getGeminiClient();

  const prompt = `
Recommend 3 practical, distinct, non-trivial portfolio projects (exactly 1 Beginner, 1 Intermediate, 1 Advanced) for someone targeting "${params.role.name}".
Missing Skills (Priority): ${params.missingSkills.join(', ') || 'Core role skills'}
Skills Needing Improvement: ${(params.skillsToImprove || []).join(', ') || 'None specified'}
Existing Skills: ${params.existingSkills.join(', ') || 'Fundamentals'}
Existing Projects (DO NOT duplicate or repeat these): ${(params.existingProjects || []).join(', ') || 'None logged yet'}
Active Roadmap Focus: ${params.roadmapFocus || 'General career readiness'}

Avoid generic toy apps (calculators, basic to-do lists, weather widgets). Make each project realistic, production-styled, and clearly explain its portfolioValue and reasoning for why this candidate needs it now.
`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction:
          'Return JSON array of 3 realistic engineering project blueprints (Beginner, Intermediate, Advanced) matching responseSchema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              estimatedHours: { type: Type.NUMBER },
              problemStatement: { type: Type.STRING },
              objective: { type: Type.STRING },
              skillsCovered: { type: Type.ARRAY, items: { type: Type.STRING } },
              techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
              features: { type: Type.ARRAY, items: { type: Type.STRING } },
              milestones: { type: Type.ARRAY, items: { type: Type.STRING } },
              deliverables: { type: Type.ARRAY, items: { type: Type.STRING } },
              portfolioValue: { type: Type.STRING },
              reasoning: { type: Type.STRING },
              githubTips: { type: Type.STRING },
              advancedExtensions: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
        },
      },
    })
  );

  const items = JSON.parse((response.text ?? '[]').trim()) as Array<Partial<ProjectTemplate>>;
  return items.map((item, idx) => ({
    id: `ai-proj-${Date.now()}-${idx}`,
    title: item.title || 'Custom Engineering Project',
    difficulty:
      item.difficulty === 'Beginner' || item.difficulty === 'Advanced'
        ? item.difficulty
        : 'Intermediate',
    estimatedHours: Math.max(4, Number(item.estimatedHours) || 20),
    problemStatement: item.problemStatement || '',
    objective: item.objective || '',
    skillsCovered: item.skillsCovered || [],
    techStack: item.techStack || [],
    features: item.features || [],
    milestones: item.milestones || [],
    deliverables: item.deliverables || [],
    portfolioValue: item.portfolioValue || item.githubTips || '',
    reasoning: item.reasoning || `Directly targets your missing skills for ${params.role.name}.`,
    githubTips: item.githubTips || '',
    advancedExtensions: item.advancedExtensions || [],
    roleIds: [params.role.id],
  }));
}

export async function evaluatePortfolioProjectAI(params: {
  project: UserProject;
  targetRoleName: string;
}): Promise<PortfolioAIReview> {
  const ai = getGeminiClient();

  const prompt = `
Evaluate this portfolio project for a candidate targeting "${params.targetRoleName}":
- Title: ${params.project.title}
- Status: ${params.project.status}
- Role: ${params.project.userRole || 'Sole Developer'}
- Tech Stack: ${(params.project.techStack || []).join(', ')}
- Skills Claimed: ${(params.project.skillsDemonstrated || []).join(', ')}
- GitHub URL Provided: ${params.project.githubUrl ? 'Yes' : 'No'}
- Live Demo URL Provided: ${params.project.liveUrl ? 'Yes' : 'No'}
- Description: ${params.project.description}
- Achievements: ${params.project.achievements || 'None listed'}

Provide an honest, constructive engineering review with a relevanceScore (0-100), complexity assessment, documentation feedback, repo presentation tips, missing features, and actionable improvements.
`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: 'You are a principal engineering hiring reviewer. Return strict JSON matching responseSchema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            relevanceScore: { type: Type.INTEGER },
            complexityAssessment: { type: Type.STRING },
            skillDemonstration: { type: Type.STRING },
            documentationFeedback: { type: Type.STRING },
            repoPresentation: { type: Type.STRING },
            missingFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
            actionableImprovements: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    })
  );

  const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<PortfolioAIReview>;
  return {
    relevanceScore: Math.min(100, Math.max(0, Number(parsed.relevanceScore) || 70)),
    complexityAssessment: parsed.complexityAssessment || '',
    skillDemonstration: parsed.skillDemonstration || '',
    documentationFeedback: parsed.documentationFeedback || '',
    repoPresentation: parsed.repoPresentation || '',
    missingFeatures: Array.isArray(parsed.missingFeatures) ? parsed.missingFeatures : [],
    actionableImprovements: Array.isArray(parsed.actionableImprovements) ? parsed.actionableImprovements : [],
    reviewedAt: new Date().toISOString(),
  };
}

export async function runCareerCoachChatAI(params: {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: {
    displayName: string;
    targetRoleName: string;
    skills: Array<{ name: string; proficiency: number; currentlyLearning?: boolean }>;
    topGaps: Array<{ skillName: string; priority: string; current: number; target: number }>;
    activeRoadmapTitle?: string;
    pendingTasks?: string[];
    projects?: string[];
  };
}): Promise<string> {
  const ai = getGeminiClient();

  const systemInstruction = `
You are SkillGraph AI Career Coach, a senior software architect and technical mentor.
Personalize every answer using the candidate's verified context below:
- Candidate: ${params.context.displayName}
- Target Role: ${params.context.targetRoleName || 'Not selected yet'}
- Current Skills: ${params.context.skills.map((s) => `${s.name} (${s.proficiency}/5${s.currentlyLearning ? ', learning' : ''})`).join(', ') || 'None logged'}
- Key Skill Gaps: ${params.context.topGaps.map((g) => `${g.skillName} [${g.priority}: ${g.current}/${g.target}]`).join(', ') || 'Run analysis to identify'}
- Active Roadmap: ${params.context.activeRoadmapTitle || 'None generated yet'}
- Pending Roadmap Tasks: ${(params.context.pendingTasks || []).slice(0, 6).join('; ') || 'None'}
- Portfolio Projects: ${(params.context.projects || []).join('; ') || 'None'}

Guidelines:
- Give specific, structured, actionable engineering & career advice referencing their actual skills and gaps.
- Never invent unverified external URLs or guarantee job placement.
- Keep responses clear, well-organized, and practical.
`.trim();

  const formattedHistory = params.history
    .slice(-10)
    .map((m) => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
    .join('\n\n');

  const fullPrompt = formattedHistory
    ? `Conversation so far:\n${formattedHistory}\n\nUser: ${params.message}`
    : params.message;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: fullPrompt,
      config: { systemInstruction },
    })
  );

  return (response.text || 'I could not generate a response right now. Please try again.').trim();
}
