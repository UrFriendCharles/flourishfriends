interface Props {
  current: number; // 1-based
  total: number;
  label?: string;
}

export function ProgressBar({ current, total, label }: Props) {
  const pct = Math.min(100, (current / total) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
        <span>{label ?? `Question ${current} of ${total}`}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
