import React, { useState } from 'react';
import {
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Compass,
  FolderGit2,
  Layers,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Shield,
  Sun,
  Target,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';
import { useApp } from '../contexts/AuthContext';

export type AppRoute =
  | 'dashboard'
  | 'onboarding'
  | 'profile'
  | 'skills'
  | 'careers'
  | 'analysis'
  | 'roadmap'
  | 'projects'
  | 'resources'
  | 'portfolio'
  | 'coach'
  | 'analytics'
  | 'notifications'
  | 'settings'
  | 'admin';

interface AppShellProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  dark: boolean;
  onToggleDark: () => void;
  children: React.ReactNode;
}

const ROUTE_TITLES: Record<AppRoute, string> = {
  dashboard: 'Dashboard',
  onboarding: 'Guided Onboarding',
  profile: 'My Profile',
  skills: 'Skills Inventory',
  careers: 'Career Explorer',
  analysis: 'Skill Gap Analysis & Report',
  roadmap: 'Learning Roadmap',
  projects: 'Project Recommendations',
  resources: 'Learning Resources',
  portfolio: 'Portfolio & AI Review',
  coach: 'AI Career Coach',
  analytics: 'Progress Analytics',
  notifications: 'Notifications',
  settings: 'Settings',
  admin: 'Admin Console',
};

export function AppShell({
  currentRoute,
  onNavigate,
  dark,
  onToggleDark,
  children,
}: AppShellProps) {
  const { profile, user, isAdmin, notifications, logout } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const navGroups: Array<{
    label: string;
    items: Array<{ route: AppRoute; label: string; icon: React.ComponentType<{ className?: string }> }>;
  }> = [
    {
      label: 'Workspace',
      items: [
        { route: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { route: 'analysis', label: 'Gap Analysis', icon: Target },
        { route: 'roadmap', label: 'Roadmap', icon: Map },
        { route: 'analytics', label: 'Progress', icon: BarChart3 },
      ],
    },
    {
      label: 'Capabilities',
      items: [
        { route: 'skills', label: 'My Skills', icon: Layers },
        { route: 'careers', label: 'Career Explorer', icon: Compass },
        { route: 'projects', label: 'Projects', icon: Wrench },
        { route: 'portfolio', label: 'Portfolio', icon: FolderGit2 },
        { route: 'resources', label: 'Resources', icon: BookOpen },
      ],
    },
    {
      label: 'Advisory',
      items: [
        { route: 'coach', label: 'AI Career Coach', icon: MessageSquare },
        { route: 'profile', label: 'My Profile', icon: Briefcase },
        { route: 'onboarding', label: 'Setup Wizard', icon: UserCheck },
      ],
    },
  ];

  const handleNav = (route: AppRoute) => {
    onNavigate(route);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => handleNav('dashboard')}
          className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap"
        >
          SkillGraph AI
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = currentRoute === item.route;
                return (
                  <button
                    key={item.route}
                    onClick={() => handleNav(item.route)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {isAdmin && (
          <div>
            <div className="px-3 mb-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              Administration
            </div>
            <button
              onClick={() => handleNav('admin')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                currentRoute === 'admin'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>Admin Console</span>
            </button>
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
        <button
          onClick={() => handleNav('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentRoute === 'settings'
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 h-full">{sidebarContent}</div>
          <div
            className="flex-1 bg-slate-950/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {profile?.targetRoleName || 'Career Workspace'}
              </div>
              <h1 className="font-display text-base sm:text-lg font-semibold text-slate-900 dark:text-white truncate">
                {ROUTE_TITLES[currentRoute]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={onToggleDark}
              aria-label="Toggle theme"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => handleNav('notifications')}
              aria-label="Notifications"
              className="relative p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-mono tabular-nums flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleNav('profile')}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={profile?.displayName || 'Profile'}
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center">
                  {(profile?.displayName || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden sm:inline text-xs font-medium text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
                {profile?.displayName || user?.displayName || 'Account'}
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
