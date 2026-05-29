export default function StudentLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="h-8 w-48 rounded bg-[--color-surface] mb-6" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-[--radius-md] border border-[--color-border] overflow-hidden">
              <div className="aspect-video bg-[--color-surface]" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-[--color-surface] rounded w-3/4" />
                <div className="h-3 bg-[--color-surface] rounded w-1/2" />
                <div className="h-2 bg-[--color-surface] rounded-full w-full mt-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
