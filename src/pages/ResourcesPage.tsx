import { useMemo, useState } from 'react';
import { Bookmark, ExternalLink, Search } from 'lucide-react';
import { useApp } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { removeBookmark, saveBookmark } from '../services/firestoreService';
import { LEARNING_RESOURCES } from '../shared/catalogData';

export function ResourcesPage() {
  const { user, profile, bookmarks } = useApp();
  const { notify } = useToast();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [freeOnly, setFreeOnly] = useState(
    profile?.budgetPreference === 'free_only' || profile?.budgetPreference === 'free_preferred'
  );
  const [savedOnly, setSavedOnly] = useState(false);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(LEARNING_RESOURCES.map((r) => r.category)))],
    []
  );

  const bookmarkedIds = useMemo(() => new Set(bookmarks.map((b) => b.resourceId)), [bookmarks]);

  const filtered = useMemo(() => {
    return LEARNING_RESOURCES.filter((res) => {
      if (freeOnly && !res.isFree) return false;
      if (category !== 'All' && res.category !== category) return false;
      if (savedOnly && !bookmarkedIds.has(res.id)) return false;
      if (search.trim()) {
        const hay = `${res.title} ${res.skill} ${res.description}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [freeOnly, category, savedOnly, bookmarkedIds, search]);

  const toggleBookmark = async (item: (typeof LEARNING_RESOURCES)[number]) => {
    if (!user) return;
    const existing = bookmarks.find((b) => b.resourceId === item.id);
    try {
      if (existing) {
        await removeBookmark(user.uid, existing.id);
        notify('Removed bookmark.', 'info');
      } else {
        await saveBookmark(user.uid, {
          resourceId: item.id,
          title: item.title,
          skill: item.skill,
          category: item.category,
          provider: item.provider,
          url: item.url,
          isSearchSuggestion: item.isSearchSuggestion,
          isFree: item.isFree,
          difficulty: item.difficulty,
        });
        notify('Resource bookmarked.', 'success');
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Bookmark update failed.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by skill or topic..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={(e) => setFreeOnly(e.target.checked)}
              className="rounded border-slate-300"
            />
            Free resources only
          </label>
          <button
            onClick={() => setSavedOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-lg border font-medium ${
              savedOnly
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            Bookmarked ({bookmarks.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((item) => {
          const isSaved = bookmarkedIds.has(item.id);
          return (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {item.skill} · {item.category}
                  </div>
                  <button
                    onClick={() => toggleBookmark(item)}
                    aria-label={isSaved ? 'Remove bookmark' : 'Bookmark resource'}
                    className={`p-1.5 rounded-md ${
                      isSaved ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  {item.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono">
                  {item.isFree ? 'Free' : 'Paid'} · {item.difficulty}
                </span>

                {item.isSearchSuggestion || !item.url ? (
                  <span className="text-amber-700 dark:text-amber-400 font-medium">
                    Search Suggestion
                  </span>
                ) : (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Verified Docs <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
