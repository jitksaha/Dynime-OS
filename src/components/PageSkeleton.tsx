/**
 * Full-page skeleton screen that mirrors a typical dashboard/page layout.
 * Replaces all full-page spinners and preloaders.
 */
export function PageSkeleton() {
  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 animate-in fade-in duration-0">
      {/* Header area */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <div className="skeleton-shimmer h-7 w-48 rounded-lg" />
          <div className="skeleton-shimmer h-4 w-72 rounded-md" />
        </div>
        <div className="flex gap-3">
          <div className="skeleton-shimmer h-10 w-28 rounded-lg" />
          <div className="skeleton-shimmer h-10 w-10 rounded-lg" />
        </div>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="skeleton-shimmer h-4 w-20 rounded-md" />
              <div className="skeleton-shimmer h-8 w-8 rounded-lg" />
            </div>
            <div className="skeleton-shimmer h-8 w-24 rounded-md" />
            <div className="skeleton-shimmer h-3 w-32 rounded-md" />
          </div>
        ))}
      </div>

      {/* Content area — table-like rows */}
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-border">
          <div className="skeleton-shimmer h-4 w-10 rounded" />
          <div className="skeleton-shimmer h-4 w-32 rounded flex-1" />
          <div className="skeleton-shimmer h-4 w-24 rounded hidden sm:block" />
          <div className="skeleton-shimmer h-4 w-20 rounded hidden md:block" />
          <div className="skeleton-shimmer h-4 w-16 rounded" />
        </div>
        {/* Table rows */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0"
          >
            <div className="skeleton-shimmer h-4 w-10 rounded" />
            <div className="flex items-center gap-3 flex-1">
              <div className="skeleton-shimmer h-9 w-9 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="skeleton-shimmer h-4 rounded" style={{ width: `${60 + (i * 7) % 30}%` }} />
                <div className="skeleton-shimmer h-3 w-24 rounded" />
              </div>
            </div>
            <div className="skeleton-shimmer h-6 w-16 rounded-full hidden sm:block" />
            <div className="skeleton-shimmer h-4 w-20 rounded hidden md:block" />
            <div className="skeleton-shimmer h-8 w-8 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact skeleton for auth/protected route checks.
 * Mimics the same layout so there's zero layout shift.
 */
export function AuthSkeleton() {
  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
      <div className="w-full max-w-sm px-6 space-y-5">
        {/* Logo placeholder */}
        <div className="flex justify-center">
          <div className="skeleton-shimmer h-14 w-14 rounded-2xl" />
        </div>
        {/* Form skeleton */}
        <div className="space-y-3">
          <div className="skeleton-shimmer h-4 w-3/5 mx-auto rounded-md" />
          <div className="skeleton-shimmer h-10 w-full rounded-lg" />
          <div className="skeleton-shimmer h-10 w-full rounded-lg" />
          <div className="skeleton-shimmer h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
