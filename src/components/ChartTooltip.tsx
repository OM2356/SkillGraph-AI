interface TooltipPayloadEntry {
  name?: string;
  value?: string | number;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayloadEntry[];
}

export function ChartTooltip({ active, label, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-lg text-xs">
      {label !== undefined && (
        <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{label}</div>
      )}
      <div className="space-y-0.5">
        {payload.map((entry, idx) => (
          <div key={`${entry.name || idx}`} className="flex items-center justify-between gap-4 font-mono tabular-nums">
            <span className="text-slate-600 dark:text-slate-300">{entry.name}:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
