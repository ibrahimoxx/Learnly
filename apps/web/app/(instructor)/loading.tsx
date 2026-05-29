export default function InstructorLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-40 rounded bg-[--color-surface]" />
          <div className="h-9 w-32 rounded bg-[--color-surface]" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-[--radius-md] border border-[--color-border] p-4">
              <div className="h-16 w-24 rounded bg-[--color-surface] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[--color-surface] rounded w-2/3" />
                <div className="h-3 bg-[--color-surface] rounded w-1/3" />
              </div>
              <div className="h-7 w-20 rounded bg-[--color-surface]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
