import { useEffect, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppBootSkeleton } from './components/Skeleton';
import { AppProvider, useApp } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { AppShell, type AppRoute } from './layouts/AppShell';
import { AdminPage } from './pages/AdminPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CareerExplorerPage } from './pages/CareerExplorerPage';
import { CoachPage } from './pages/CoachPage';
import { DashboardPage } from './pages/DashboardPage';
import { LandingPage } from './pages/LandingPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { SettingsPage } from './pages/SettingsPage';
import { SharedPortfolioView } from './pages/SharedPortfolioView';
import { SkillsPage } from './pages/SkillsPage';

function MainRouter() {
  const { user, authReady, profile, profileLoading, signInWithGoogle } = useApp();
  const { notify } = useToast();

  const [route, setRoute] = useState<AppRoute>('dashboard');
  const [signingIn, setSigningIn] = useState(false);
  const [dark, setDark] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('sg_theme') === 'dark';
  });

  const [sharedSlug, setSharedSlug] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('portfolio');
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('sg_theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Redirect brand new users who haven't completed onboarding to onboarding on initial login
  useEffect(() => {
    if (user && profile && profile.onboardingCompleted === false && route === 'dashboard') {
      setRoute('onboarding');
    }
  }, [user, profile]);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
      notify('Signed in with Google.', 'success');
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Google Sign-In was cancelled or blocked.',
        'error'
      );
    } finally {
      setSigningIn(false);
    }
  };

  if (sharedSlug) {
    return (
      <SharedPortfolioView
        slug={sharedSlug}
        onExit={() => {
          setSharedSlug(null);
          window.history.replaceState({}, '', '/');
        }}
      />
    );
  }

  if (!authReady || (user && profileLoading && !profile)) {
    return <AppBootSkeleton />;
  }

  if (!user) {
    return (
      <LandingPage
        onSignIn={handleSignIn}
        signingIn={signingIn}
        dark={dark}
        onToggleDark={() => setDark((d) => !d)}
      />
    );
  }

  return (
    <AppShell
      currentRoute={route}
      onNavigate={setRoute}
      dark={dark}
      onToggleDark={() => setDark((d) => !d)}
    >
      {route === 'dashboard' && <DashboardPage onNavigate={setRoute} />}
      {route === 'onboarding' && <OnboardingPage onNavigate={setRoute} />}
      {route === 'profile' && <ProfilePage />}
      {route === 'skills' && <SkillsPage />}
      {route === 'careers' && <CareerExplorerPage />}
      {route === 'analysis' && <AnalysisPage onNavigate={setRoute} />}
      {route === 'roadmap' && <RoadmapPage />}
      {route === 'projects' && <ProjectsPage onNavigate={setRoute} />}
      {route === 'resources' && <ResourcesPage />}
      {route === 'portfolio' && <PortfolioPage />}
      {route === 'coach' && <CoachPage />}
      {route === 'analytics' && <AnalyticsPage />}
      {route === 'notifications' && <NotificationsPage />}
      {route === 'settings' && <SettingsPage dark={dark} onToggleDark={() => setDark((d) => !d)} />}
      {route === 'admin' && <AdminPage />}
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppProvider>
          <MainRouter />
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
