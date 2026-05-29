export default function AdminLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="h-8 w-40 rounded bg-[--color-surface] mb-6" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-[--radius-md] border border-[--color-border] p-5 space-y-2">
              <div className="h-3 w-20 bg-[--color-surface] rounded" />
              <div className="h-7 w-28 bg-[--color-surface] rounded" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 rounded bg-[--color-surface]" />
          ))}
        </div>
      </div>
    </div>
  );
}
