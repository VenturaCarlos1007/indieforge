export function EmptyState({ icon: Icon, title, subtitle, iconColor = '#a855f7', iconBg }) {
  const bg = iconBg || `${iconColor}12`;
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 float-icon"
        style={{ background: bg, border: `1px solid ${iconColor}22` }}>
        <Icon size={28} style={{ color: iconColor }} />
      </div>
      <p className="text-sm font-semibold text-surface-200 mb-1.5">{title}</p>
      {subtitle && <p className="text-xs text-surface-500 max-w-[200px] leading-relaxed">{subtitle}</p>}
    </div>
  );
}

export function SkeletonLine({ className = '' }) {
  return <div className={`skeleton h-4 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="glass p-5 space-y-3">
      <div className="skeleton h-5 w-2/3 rounded" />
      <div className="skeleton h-4 w-full rounded" />
      <div className="skeleton h-4 w-4/5 rounded" />
      <div className="flex gap-2 mt-2">
        <div className="skeleton h-6 w-6 rounded-full" />
        <div className="skeleton h-6 w-6 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="stat-card">
      <div className="skeleton h-4 w-20 rounded" />
      <div className="skeleton h-8 w-16 rounded" />
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="skeleton h-7 w-56 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass p-5 rounded-2xl flex items-start gap-4">
            <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="skeleton h-3 w-24 rounded" />
              <div className="skeleton h-5 w-32 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-6 rounded-2xl lg:col-span-2 space-y-4">
          <div className="skeleton h-4 w-48 rounded" />
          <div className="skeleton h-[250px] w-full rounded-xl" />
        </div>
        <div className="glass p-6 rounded-2xl space-y-4">
          <div className="skeleton h-4 w-40 rounded" />
          <div className="skeleton h-[250px] w-full rounded-xl" />
        </div>
        <div className="glass p-6 rounded-2xl space-y-4">
          <div className="skeleton h-4 w-36 rounded" />
          <div className="skeleton h-[250px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonMembers({ count = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
          <div className="skeleton w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-32 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
          <div className="skeleton h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ count = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="skeleton h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-1/3 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
