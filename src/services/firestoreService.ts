import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  FIELD_LIMITS,
  type AppNotification,
  type CareerRole,
  type ChatConversation,
  type ChatMessage,
  type ProgressRecord,
  type Roadmap,
  type RoadmapTask,
  type SavedResource,
  type SkillGapAnalysis,
  type UserProfile,
  type UserProject,
  type UserSkill,
} from '../shared/types';

function clampStr(val: string | undefined, max: number): string {
  return (val ?? '').trim().slice(0, max);
}

export function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 120);
}

// --- User Profile ---

export async function ensureUserProfile(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }

    const isAdminEmail = user.email === 'omkarsathe3103@gmail.com';
    const initialProfile: UserProfile = {
      uid: user.uid,
      email: clampStr(user.email || '', 254),
      displayName: clampStr(user.displayName || user.email?.split('@')[0] || 'Student', FIELD_LIMITS.displayNameMax),
      photoURL: clampStr(user.photoURL || '', 500),
      role: isAdminEmail ? 'admin' : 'user',
      onboardingCompleted: false,
      targetRoleId: 'sde',
      targetRoleName: 'Software Development Engineer',
      careerDomain: 'Core Software Engineering',
      hoursPerWeek: 12,
      learningStyle: 'Hands-on projects',
      budgetPreference: 'free_preferred',
      preferredLanguage: 'English',
      learningPace: 'steady',
      streakDays: 0,
      totalHoursStudied: 0,
      portfolioPublic: false,
      portfolioSlug: `dev-${user.uid.slice(0, 10)}`.replace(/[^a-zA-Z0-9_\-]/g, ''),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(ref, initialProfile);
    return initialProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const clean: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.displayName !== undefined) clean.displayName = clampStr(updates.displayName, FIELD_LIMITS.displayNameMax);
    if (updates.photoURL !== undefined) clean.photoURL = clampStr(updates.photoURL, 500);
    if (updates.onboardingCompleted !== undefined) clean.onboardingCompleted = Boolean(updates.onboardingCompleted);
    if (updates.college !== undefined) clean.college = clampStr(updates.college, FIELD_LIMITS.collegeMax);
    if (updates.degree !== undefined) clean.degree = clampStr(updates.degree, FIELD_LIMITS.degreeMax);
    if (updates.currentYear !== undefined) clean.currentYear = clampStr(updates.currentYear, 40);
    if (updates.graduationYear !== undefined) clean.graduationYear = clampStr(updates.graduationYear, 10);
    if (updates.country !== undefined) clean.country = clampStr(updates.country, 80);
    if (updates.targetRoleId !== undefined) clean.targetRoleId = clampStr(updates.targetRoleId, 80);
    if (updates.targetRoleName !== undefined) clean.targetRoleName = clampStr(updates.targetRoleName, 120);
    if (updates.careerDomain !== undefined) clean.careerDomain = clampStr(updates.careerDomain, 80);
    if (updates.targetCompanies !== undefined) {
      clean.targetCompanies = updates.targetCompanies.map((c) => clampStr(c, 60)).filter(Boolean).slice(0, 10);
    }
    if (updates.desiredIndustry !== undefined) clean.desiredIndustry = clampStr(updates.desiredIndustry, 80);
    if (updates.jobGoal !== undefined) clean.jobGoal = clampStr(updates.jobGoal, 80);
    if (updates.hoursPerWeek !== undefined) clean.hoursPerWeek = Math.min(100, Math.max(0, Number(updates.hoursPerWeek)));
    if (updates.learningStyle !== undefined) clean.learningStyle = clampStr(updates.learningStyle, 60);
    if (updates.budgetPreference !== undefined) clean.budgetPreference = updates.budgetPreference;
    if (updates.preferredLanguage !== undefined) clean.preferredLanguage = clampStr(updates.preferredLanguage, 40);
    if (updates.learningPace !== undefined) clean.learningPace = updates.learningPace;
    if (updates.streakDays !== undefined) clean.streakDays = Math.max(0, Number(updates.streakDays));
    if (updates.totalHoursStudied !== undefined) clean.totalHoursStudied = Math.max(0, Number(updates.totalHoursStudied));
    if (updates.portfolioPublic !== undefined) clean.portfolioPublic = Boolean(updates.portfolioPublic);
    if (updates.portfolioSlug !== undefined) clean.portfolioSlug = clampStr(updates.portfolioSlug, 80);

    await updateDoc(doc(db, 'users', uid), clean);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeUserProfile(
  uid: string,
  cb: (profile: UserProfile | null) => void
): Unsubscribe {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      cb(snap.exists() ? (snap.data() as UserProfile) : null);
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

// --- Skills CRUD ---

export function subscribeUserSkills(uid: string, cb: (skills: UserSkill[]) => void): Unsubscribe {
  const path = `users/${uid}/skills`;
  const q = query(collection(db, 'users', uid, 'skills'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => d.data() as UserSkill);
      rows.sort((a, b) => b.proficiency - a.proficiency || a.name.localeCompare(b.name));
      cb(rows);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export async function upsertUserSkill(
  uid: string,
  skill: Omit<UserSkill, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const id = skill.id || makeSafeId('skill');
  const path = `users/${uid}/skills/${id}`;
  try {
    const ref = doc(db, 'users', uid, 'skills', id);
    const snap = await getDoc(ref);
    const payload = {
      id,
      userId: uid,
      name: clampStr(skill.name, FIELD_LIMITS.skillNameMax),
      category: clampStr(skill.category, 40),
      proficiency: Math.min(5, Math.max(1, Math.round(skill.proficiency))) as UserSkill['proficiency'],
      experienceMonths: Math.min(600, Math.max(0, Math.round(skill.experienceMonths ?? 0))),
      lastPracticed: clampStr(skill.lastPracticed || new Date().toISOString().slice(0, 10), 32),
      confidence: Math.min(5, Math.max(1, Math.round(skill.confidence ?? skill.proficiency))) as UserSkill['confidence'],
      evidence: clampStr(skill.evidence || '', FIELD_LIMITS.evidenceMax),
      linkedProjectId: clampStr(skill.linkedProjectId || '', 80),
      currentlyLearning: Boolean(skill.currentlyLearning),
      updatedAt: serverTimestamp(),
    };

    if (snap.exists()) {
      await updateDoc(ref, {
        name: payload.name,
        category: payload.category,
        proficiency: payload.proficiency,
        experienceMonths: payload.experienceMonths,
        lastPracticed: payload.lastPracticed,
        confidence: payload.confidence,
        evidence: payload.evidence,
        linkedProjectId: payload.linkedProjectId,
        currentlyLearning: payload.currentlyLearning,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
    }
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteUserSkill(uid: string, skillId: string): Promise<void> {
  const path = `users/${uid}/skills/${skillId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'skills', skillId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- Projects CRUD ---

export function subscribeUserProjects(uid: string, cb: (projects: UserProject[]) => void): Unsubscribe {
  const path = `users/${uid}/projects`;
  const q = query(collection(db, 'users', uid, 'projects'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => d.data() as UserProject));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export async function upsertUserProject(
  uid: string,
  project: Omit<UserProject, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const id = project.id || makeSafeId('proj');
  const path = `users/${uid}/projects/${id}`;
  try {
    const ref = doc(db, 'users', uid, 'projects', id);
    const snap = await getDoc(ref);
    const base = {
      title: clampStr(project.title, FIELD_LIMITS.projectTitleMax),
      description: clampStr(project.description, FIELD_LIMITS.projectDescMax),
      techStack: (project.techStack || []).map((t) => clampStr(t, 60)).filter(Boolean).slice(0, 20),
      skillsDemonstrated: (project.skillsDemonstrated || []).map((t) => clampStr(t, 60)).filter(Boolean).slice(0, 20),
      githubUrl: clampStr(project.githubUrl || '', FIELD_LIMITS.urlMax),
      liveUrl: clampStr(project.liveUrl || '', FIELD_LIMITS.urlMax),
      status: project.status || 'in_progress',
      userRole: clampStr(project.userRole || 'Developer', 100),
      achievements: clampStr(project.achievements || '', 1000),
      updatedAt: serverTimestamp(),
    };

    if (snap.exists()) {
      const updatePayload: Record<string, unknown> = { ...base };
      if (project.aiReview) updatePayload.aiReview = project.aiReview;
      await updateDoc(ref, updatePayload);
    } else {
      const createPayload: Record<string, unknown> = {
        ...base,
        id,
        userId: uid,
        createdAt: serverTimestamp(),
      };
      if (project.aiReview) createPayload.aiReview = project.aiReview;
      await setDoc(ref, createPayload);
    }
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteUserProject(uid: string, projectId: string): Promise<void> {
  const path = `users/${uid}/projects/${projectId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'projects', projectId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- Skill Gap Analyses ---

export function subscribeUserAnalyses(
  uid: string,
  cb: (analyses: SkillGapAnalysis[]) => void
): Unsubscribe {
  const path = `users/${uid}/analyses`;
  const q = query(
    collection(db, 'users', uid, 'analyses'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as SkillGapAnalysis)),
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export async function saveSkillGapAnalysis(
  uid: string,
  analysis: Omit<SkillGapAnalysis, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const id = makeSafeId('analysis');
  const path = `users/${uid}/analyses/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'analyses', id), {
      ...analysis,
      id,
      userId: uid,
      targetRoleName: clampStr(analysis.targetRoleName, 120),
      methodology: clampStr(analysis.methodology, 600),
      gapItems: (analysis.gapItems || []).slice(0, 40),
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteSkillGapAnalysis(uid: string, analysisId: string): Promise<void> {
  const path = `users/${uid}/analyses/${analysisId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'analyses', analysisId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- Roadmaps & Tasks ---

export function subscribeUserRoadmaps(uid: string, cb: (roadmaps: Roadmap[]) => void): Unsubscribe {
  const path = `users/${uid}/roadmaps`;
  const q = query(
    collection(db, 'users', uid, 'roadmaps'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as Roadmap)),
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeRoadmapTasks(
  uid: string,
  roadmapId: string,
  cb: (tasks: RoadmapTask[]) => void
): Unsubscribe {
  const path = `users/${uid}/roadmaps/${roadmapId}/tasks`;
  const q = query(
    collection(db, 'users', uid, 'roadmaps', roadmapId, 'tasks'),
    where('userId', '==', uid),
    orderBy('orderIndex', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as RoadmapTask)),
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export async function createRoadmapWithTasks(
  uid: string,
  roadmap: Omit<Roadmap, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  tasks: Array<Omit<RoadmapTask, 'id' | 'userId' | 'roadmapId' | 'createdAt' | 'updatedAt'>>
): Promise<string> {
  const roadmapId = makeSafeId('roadmap');
  const path = `users/${uid}/roadmaps/${roadmapId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'roadmaps', roadmapId), {
      id: roadmapId,
      userId: uid,
      title: clampStr(roadmap.title, FIELD_LIMITS.roadmapTitleMax),
      targetRoleId: clampStr(roadmap.targetRoleId, 80),
      targetRoleName: clampStr(roadmap.targetRoleName, 120),
      durationDays: Math.min(365, Math.max(7, Math.round(roadmap.durationDays))),
      hoursPerWeek: Math.min(100, Math.max(1, Number(roadmap.hoursPerWeek || 10))),
      status: roadmap.status || 'active',
      phases: (roadmap.phases || []).slice(0, 8),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const batch = writeBatch(db);
    tasks.forEach((t, idx) => {
      const taskId = makeSafeId(`task_${idx}`);
      const tRef = doc(db, 'users', uid, 'roadmaps', roadmapId, 'tasks', taskId);
      batch.set(tRef, {
        id: taskId,
        userId: uid,
        roadmapId,
        phaseIndex: Math.min(5, Math.max(1, Math.round(t.phaseIndex))),
        phaseName: clampStr(t.phaseName, 80),
        title: clampStr(t.title, FIELD_LIMITS.taskTitleMax),
        description: clampStr(t.description || '', FIELD_LIMITS.taskDescMax),
        skillName: clampStr(t.skillName, 80),
        priority: t.priority,
        estimatedHours: Math.max(0, Number(t.estimatedHours || 2)),
        startDate: clampStr(t.startDate || '', 32),
        dueDate: clampStr(t.dueDate || '', 32),
        learningResource: clampStr(t.learningResource || '', 300),
        assignment: clampStr(t.assignment || '', 400),
        status: t.status || 'not_started',
        orderIndex: idx,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
    return roadmapId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateRoadmap(
  uid: string,
  roadmapId: string,
  updates: Partial<Pick<Roadmap, 'title' | 'status' | 'phases'>>
): Promise<void> {
  const path = `users/${uid}/roadmaps/${roadmapId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'roadmaps', roadmapId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteRoadmap(uid: string, roadmapId: string): Promise<void> {
  const path = `users/${uid}/roadmaps/${roadmapId}`;
  try {
    const tasksSnap = await getDocs(
      query(collection(db, 'users', uid, 'roadmaps', roadmapId, 'tasks'), where('userId', '==', uid))
    );
    const batch = writeBatch(db);
    tasksSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'users', uid, 'roadmaps', roadmapId));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function addRoadmapTask(
  uid: string,
  roadmapId: string,
  task: Omit<RoadmapTask, 'id' | 'userId' | 'roadmapId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const taskId = makeSafeId('task');
  const path = `users/${uid}/roadmaps/${roadmapId}/tasks/${taskId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'roadmaps', roadmapId, 'tasks', taskId), {
      id: taskId,
      userId: uid,
      roadmapId,
      phaseIndex: Math.min(5, Math.max(1, Math.round(task.phaseIndex))),
      phaseName: clampStr(task.phaseName, 80),
      title: clampStr(task.title, FIELD_LIMITS.taskTitleMax),
      description: clampStr(task.description || '', FIELD_LIMITS.taskDescMax),
      skillName: clampStr(task.skillName, 80),
      priority: task.priority,
      estimatedHours: Math.max(0, Number(task.estimatedHours || 2)),
      startDate: clampStr(task.startDate || '', 32),
      dueDate: clampStr(task.dueDate || '', 32),
      learningResource: clampStr(task.learningResource || '', 300),
      assignment: clampStr(task.assignment || '', 400),
      status: task.status || 'not_started',
      orderIndex: Math.max(0, Math.round(task.orderIndex)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return taskId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateRoadmapTask(
  uid: string,
  roadmapId: string,
  taskId: string,
  updates: Partial<RoadmapTask>
): Promise<void> {
  const path = `users/${uid}/roadmaps/${roadmapId}/tasks/${taskId}`;
  try {
    const clean: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.phaseIndex !== undefined) clean.phaseIndex = updates.phaseIndex;
    if (updates.phaseName !== undefined) clean.phaseName = clampStr(updates.phaseName, 80);
    if (updates.title !== undefined) clean.title = clampStr(updates.title, FIELD_LIMITS.taskTitleMax);
    if (updates.description !== undefined) clean.description = clampStr(updates.description, FIELD_LIMITS.taskDescMax);
    if (updates.skillName !== undefined) clean.skillName = clampStr(updates.skillName, 80);
    if (updates.priority !== undefined) clean.priority = updates.priority;
    if (updates.estimatedHours !== undefined) clean.estimatedHours = updates.estimatedHours;
    if (updates.startDate !== undefined) clean.startDate = clampStr(updates.startDate, 32);
    if (updates.dueDate !== undefined) clean.dueDate = clampStr(updates.dueDate, 32);
    if (updates.learningResource !== undefined) clean.learningResource = clampStr(updates.learningResource, 300);
    if (updates.assignment !== undefined) clean.assignment = clampStr(updates.assignment, 400);
    if (updates.status !== undefined) clean.status = updates.status;
    if (updates.orderIndex !== undefined) clean.orderIndex = updates.orderIndex;

    await updateDoc(doc(db, 'users', uid, 'roadmaps', roadmapId, 'tasks', taskId), clean);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteRoadmapTask(uid: string, roadmapId: string, taskId: string): Promise<void> {
  const path = `users/${uid}/roadmaps/${roadmapId}/tasks/${taskId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'roadmaps', roadmapId, 'tasks', taskId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- Bookmarks & Progress ---

export function subscribeBookmarks(uid: string, cb: (items: SavedResource[]) => void): Unsubscribe {
  const path = `users/${uid}/bookmarks`;
  const q = query(collection(db, 'users', uid, 'bookmarks'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as SavedResource)),
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export async function saveBookmark(
  uid: string,
  item: Omit<SavedResource, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const id = `bm_${item.resourceId}`.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 120);
  const path = `users/${uid}/bookmarks/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'bookmarks', id), {
      ...item,
      id,
      userId: uid,
      title: clampStr(item.title, 160),
      skill: clampStr(item.skill, 80),
      category: clampStr(item.category, 60),
      provider: clampStr(item.provider || '', 100),
      url: clampStr(item.url || '', 400),
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function removeBookmark(uid: string, bookmarkId: string): Promise<void> {
  const path = `users/${uid}/bookmarks/${bookmarkId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'bookmarks', bookmarkId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeProgressRecords(
  uid: string,
  cb: (items: ProgressRecord[]) => void
): Unsubscribe {
  const path = `users/${uid}/progress`;
  const q = query(
    collection(db, 'users', uid, 'progress'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as ProgressRecord)),
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export async function addProgressRecord(
  uid: string,
  record: Omit<ProgressRecord, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const id = makeSafeId('prog');
  const path = `users/${uid}/progress/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'progress', id), {
      id,
      userId: uid,
      date: clampStr(record.date, 32),
      hoursStudied: Math.min(24, Math.max(0, Number(record.hoursStudied))),
      tasksCompleted: Math.min(100, Math.max(0, Math.round(record.tasksCompleted))),
      skillsImproved: Math.min(100, Math.max(0, Math.round(record.skillsImproved ?? 0))),
      readinessScore: Math.min(100, Math.max(0, Number(record.readinessScore ?? 0))),
      note: clampStr(record.note || '', 300),
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

// --- Coach Conversations & Messages ---

export function subscribeConversations(
  uid: string,
  cb: (convs: ChatConversation[]) => void
): Unsubscribe {
  const path = `users/${uid}/conversations`;
  const q = query(
    collection(db, 'users', uid, 'conversations'),
    where('userId', '==', uid),
    orderBy('updatedAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as ChatConversation)),
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeConversationMessages(
  uid: string,
  convId: string,
  cb: (msgs: ChatMessage[]) => void
): Unsubscribe {
  const path = `users/${uid}/conversations/${convId}/messages`;
  const q = query(
    collection(db, 'users', uid, 'conversations', convId, 'messages'),
    where('userId', '==', uid),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as ChatMessage)),
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export async function createConversation(
  uid: string,
  title: string,
  targetRoleName: string
): Promise<string> {
  const id = makeSafeId('conv');
  const path = `users/${uid}/conversations/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'conversations', id), {
      id,
      userId: uid,
      title: clampStr(title, 140),
      targetRoleName: clampStr(targetRoleName, 120),
      messageCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function appendChatMessage(
  uid: string,
  convId: string,
  role: 'user' | 'assistant',
  content: string,
  nextCount: number
): Promise<void> {
  const msgId = makeSafeId('msg');
  const path = `users/${uid}/conversations/${convId}/messages/${msgId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'conversations', convId, 'messages', msgId), {
      id: msgId,
      userId: uid,
      conversationId: convId,
      role,
      content: clampStr(content, FIELD_LIMITS.chatMessageMax),
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'users', uid, 'conversations', convId), {
      messageCount: nextCount,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteConversation(uid: string, convId: string): Promise<void> {
  const path = `users/${uid}/conversations/${convId}`;
  try {
    const msgsSnap = await getDocs(
      query(collection(db, 'users', uid, 'conversations', convId, 'messages'), where('userId', '==', uid))
    );
    const batch = writeBatch(db);
    msgsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'users', uid, 'conversations', convId));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- Notifications ---

export function subscribeNotifications(
  uid: string,
  cb: (items: AppNotification[]) => void
): Unsubscribe {
  const path = `users/${uid}/notifications`;
  const q = query(
    collection(db, 'users', uid, 'notifications'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as AppNotification)),
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export async function createNotification(
  uid: string,
  title: string,
  message: string,
  type: AppNotification['type']
): Promise<void> {
  const id = makeSafeId('notif');
  const path = `users/${uid}/notifications/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'notifications', id), {
      id,
      userId: uid,
      title: clampStr(title, 140),
      message: clampStr(message, 500),
      type,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function markNotificationRead(uid: string, notifId: string): Promise<void> {
  const path = `users/${uid}/notifications/${notifId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'notifications', notifId), { read: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// --- Shared Portfolio & Custom Career Roles ---

export async function publishSharedPortfolio(params: {
  slug: string;
  userId: string;
  ownerName: string;
  targetRoleName: string;
  college: string;
  degree: string;
  isPublic: boolean;
  skills: UserSkill[];
  projects: UserProject[];
}): Promise<void> {
  const safeSlug = params.slug.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 80);
  const path = `sharedPortfolios/${safeSlug}`;
  try {
    const ref = doc(db, 'sharedPortfolios', safeSlug);
    const snap = await getDoc(ref);
    const payload = {
      slug: safeSlug,
      userId: params.userId,
      ownerName: clampStr(params.ownerName, 120),
      targetRoleName: clampStr(params.targetRoleName, 120),
      college: clampStr(params.college, 160),
      degree: clampStr(params.degree, 120),
      isPublic: params.isPublic,
      skills: params.skills.slice(0, 50).map((s) => ({
        name: s.name,
        category: s.category,
        proficiency: s.proficiency,
      })),
      projects: params.projects.slice(0, 30).map((p) => ({
        title: p.title,
        description: p.description,
        techStack: p.techStack || [],
        githubUrl: p.githubUrl || '',
        liveUrl: p.liveUrl || '',
        status: p.status,
      })),
      updatedAt: serverTimestamp(),
    };
    if (snap.exists()) {
      await updateDoc(ref, {
        ownerName: payload.ownerName,
        targetRoleName: payload.targetRoleName,
        college: payload.college,
        degree: payload.degree,
        isPublic: payload.isPublic,
        skills: payload.skills,
        projects: payload.projects,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, payload);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getSharedPortfolio(slug: string): Promise<Record<string, unknown> | null> {
  const safeSlug = slug.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 80);
  const path = `sharedPortfolios/${safeSlug}`;
  try {
    const snap = await getDoc(doc(db, 'sharedPortfolios', safeSlug));
    return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export function subscribeCustomCareers(cb: (roles: CareerRole[]) => void): Unsubscribe {
  const path = 'careers';
  const q = query(collection(db, 'careers'), where('isPublished', '==', true));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as CareerRole), isCustom: true }))),
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

// --- Admin Queries ---

export async function fetchAllUsersForAdmin(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => d.data() as UserProfile);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function upsertCustomCareerRole(
  adminUid: string,
  adminEmail: string,
  role: Omit<CareerRole, 'isCustom'>
): Promise<void> {
  const path = `careers/${role.id}`;
  try {
    const ref = doc(db, 'careers', role.id);
    const snap = await getDoc(ref);
    const payload = {
      id: role.id,
      name: clampStr(role.name, 120),
      domain: clampStr(role.domain, 80),
      seniorityLevel: clampStr(role.seniorityLevel, 60),
      description: clampStr(role.description, 1200),
      isPublished: role.isPublished,
      requiredSkills: role.requiredSkills.slice(0, 30),
      importantSkills: role.importantSkills.slice(0, 30),
      optionalSkills: role.optionalSkills.slice(0, 30),
      exampleResponsibilities: role.exampleResponsibilities.slice(0, 15),
      careerProgression: role.careerProgression.slice(0, 10),
      updatedAt: serverTimestamp(),
    };
    if (snap.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
    }

    const actId = makeSafeId('act');
    await setDoc(doc(db, 'adminActivity', actId), {
      id: actId,
      adminUid,
      adminEmail,
      action: snap.exists() ? 'UPDATE_CAREER_ROLE' : 'CREATE_CAREER_ROLE',
      targetId: role.id,
      details: `Saved career role ${role.name}`,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchAdminActivity(): Promise<Array<Record<string, unknown>>> {
  const path = 'adminActivity';
  try {
    const snap = await getDocs(query(collection(db, 'adminActivity'), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => d.data() as Record<string, unknown>);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}
