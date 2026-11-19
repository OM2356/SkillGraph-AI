export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3"
        >
          <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-12 w-full rounded bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function ReportSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="h-6 w-1/3 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-slate-100 dark:bg-slate-800/70 animate-pulse" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
        <div className="h-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
      </div>
    </div>
  );
}
