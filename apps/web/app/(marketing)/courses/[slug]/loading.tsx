import { Skeleton } from "@/components/ui/skeleton";

export default function CourseDetailLoading() {
  return (
    <div className="min-h-screen">
      <div className="mesh-panel px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <Skeleton className="h-4 w-32 mb-4 bg-white/20" />
          <Skeleton className="h-8 w-2/3 mb-3 bg-white/20" />
          <Skeleton className="h-4 w-full max-w-lg bg-white/10" />
          <Skeleton className="h-4 w-3/4 max-w-lg mt-2 bg-white/10" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 flex gap-8">
        <div className="flex-1 space-y-4">
          <Skeleton className="h-40 w-full rounded-[--radius-md]" />
          <Skeleton className="h-6 w-40 mt-8" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="hidden lg:block w-80">
          <Skeleton className="aspect-video w-full rounded-t-[--radius-md]" />
          <div className="space-y-3 rounded-b-[--radius-md] border border-t-0 border-[--color-border] p-5">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
