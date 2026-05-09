export default function OrgLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="h-8 w-64 animate-pulse rounded bg-[--color-border]" />
      <div className="mt-4 h-4 w-96 animate-pulse rounded bg-[--color-border]" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-56 animate-pulse rounded-[--radius-md] bg-[--color-border]" />
        ))}
      </div>
    </div>
  );
}
