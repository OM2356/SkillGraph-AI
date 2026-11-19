import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { getAllCareerRoles } from '../shared/catalogData';
import type {
  AppNotification,
  CareerRole,
  ChatConversation,
  ProgressRecord,
  Roadmap,
  SavedResource,
  SkillGapAnalysis,
  UserProfile,
  UserProject,
  UserSkill,
} from '../shared/types';
import {
  ensureUserProfile,
  subscribeBookmarks,
  subscribeConversations,
  subscribeCustomCareers,
  subscribeNotifications,
  subscribeProgressRecords,
  subscribeUserAnalyses,
  subscribeUserProfile,
  subscribeUserProjects,
  subscribeUserRoadmaps,
  subscribeUserSkills,
} from '../services/firestoreService';

interface AppContextValue {
  user: User | null;
  authReady: boolean;
  profile: UserProfile | null;
  profileLoading: boolean;
  isAdmin: boolean;
  skills: UserSkill[];
  projects: UserProject[];
  analyses: SkillGapAnalysis[];
  roadmaps: Roadmap[];
  bookmarks: SavedResource[];
  progressRecords: ProgressRecord[];
  conversations: ChatConversation[];
  notifications: AppNotification[];
  careerRoles: CareerRole[];
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [analyses, setAnalyses] = useState<SkillGapAnalysis[]>([]);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [bookmarks, setBookmarks] = useState<SavedResource[]>([]);
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [customCareers, setCustomCareers] = useState<CareerRole[]>([]);

  useEffect(() => {
    const unsubCareers = subscribeCustomCareers((roles) => setCustomCareers(roles));
    return () => unsubCareers();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);

      if (!nextUser) {
        setProfile(null);
        setSkills([]);
        setProjects([]);
        setAnalyses([]);
        setRoadmaps([]);
        setBookmarks([]);
        setProgressRecords([]);
        setConversations([]);
        setNotifications([]);
        return;
      }

      setProfileLoading(true);
      try {
        await ensureUserProfile({
          uid: nextUser.uid,
          email: nextUser.email,
          displayName: nextUser.displayName,
          photoURL: nextUser.photoURL,
        });
      } finally {
        setProfileLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    const uid = user.uid;

    const unsubs = [
      subscribeUserProfile(uid, setProfile),
      subscribeUserSkills(uid, setSkills),
      subscribeUserProjects(uid, setProjects),
      subscribeUserAnalyses(uid, setAnalyses),
      subscribeUserRoadmaps(uid, setRoadmaps),
      subscribeBookmarks(uid, setBookmarks),
      subscribeProgressRecords(uid, setProgressRecords),
      subscribeConversations(uid, setConversations),
      subscribeNotifications(uid, setNotifications),
    ];

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [authReady, user]);

  const careerRoles = useMemo(() => getAllCareerRoles(customCareers), [customCareers]);
  const isAdmin = Boolean(
    profile?.role === 'admin' || user?.email === 'omkarsathe3103@gmail.com'
  );

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        authReady,
        profile,
        profileLoading,
        isAdmin,
        skills,
        projects,
        analyses,
        roadmaps,
        bookmarks,
        progressRecords,
        conversations,
        notifications,
        careerRoles,
        signInWithGoogle,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
