'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bookmark, ExternalLink, Search } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { CardsSkeleton } from '@/components/Skeleton';
import { useAppToast } from '@/components/Providers';
import { LEARNING_RESOURCES } from '@/shared/catalogData';
import type { LearningResourceItem, SavedResource } from '@/shared/types';

export default function ResourcesPage() {
  const { notify } = useAppToast();
  const [resources, setResources] = useState<LearningResourceItem[]>(LEARNING_RESOURCES);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [onlySaved, setOnlySaved] = useState(false);

  useEffect(() => {
    fetch('/api/resources')
      .then((r) => r.json())
      .then((json) => {
        if (json.resources?.length) setResources(json.resources);
        const ids = new Set<string>((json.saved || []).map((s: SavedResource) => s.resourceId));
        setSavedIds(ids);
      })
      .finally(() => setLoading(false));
  }, []);

  async function toggleBookmark(resItem: LearningResourceItem) {
    const res = await fetch('/api/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceId: resItem.id,
        title: resItem.title,
        skill: resItem.skill,
        category: resItem.category,
        provider: resItem.provider,
        url: resItem.url,
        isSearchSuggestion: resItem.isSearchSuggestion,
        isFree: resItem.isFree,
        difficulty: resItem.difficulty,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (json.bookmarked) next.add(resItem.id);
        else next.delete(resItem.id);
        return next;
      });
      notify(json.bookmarked ? 'Resource bookmarked.' : 'Removed bookmark.', 'info');
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter((r) => {
      if (onlySaved && !savedIds.has(r.id)) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.skill.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    });
  }, [resources, query, onlySaved, savedIds]);

  return (
    <AppShell
      title="Learning Resources"
      subtitle="Verified official documentation, free books, and curated practice topics."
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by skill, topic, or provider..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <input
              type="checkbox"
              checked={onlySaved}
              onChange={(e) => setOnlySaved(e.target.checked)}
            />
            Bookmarked Only ({savedIds.size})
          </label>
        </div>

        {loading ? (
          <CardsSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((item) => {
              const saved = savedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                        {item.skill} · {item.difficulty}
                      </span>
                      <button
                        onClick={() => toggleBookmark(item)}
                        aria-label={`Bookmark ${item.title}`}
                        className={`p-1 ${saved ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-700'}`}
                      >
                        <Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {item.provider} · {item.estimatedDuration}
                    </span>
                    {!item.isSearchSuggestion && item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
                      >
                        Open <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400">Search topic</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
