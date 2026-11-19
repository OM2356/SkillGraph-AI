import { Bell, Check } from 'lucide-react';
import { useApp } from '../contexts/AuthContext';
import { markNotificationRead } from '../services/firestoreService';

export function NotificationsPage() {
  const { user, notifications } = useApp();

  return (
    <div className="max-w-3xl space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-1">Notifications</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Updates on completed gap analyses, roadmaps, and milestones.
        </p>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center">
          <Bell className="w-6 h-6 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-500">You have no notifications yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-5 flex items-start justify-between gap-4 ${
                n.read ? 'opacity-70' : 'bg-indigo-50/30 dark:bg-indigo-950/20'
              }`}
            >
              <div>
                <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mb-0.5">
                  {n.type.toUpperCase()}
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{n.title}</div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{n.message}</p>
              </div>
              {!n.read && user && (
                <button
                  onClick={() => markNotificationRead(user.uid, n.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 shrink-0"
                >
                  <Check className="w-3 h-3" /> Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
