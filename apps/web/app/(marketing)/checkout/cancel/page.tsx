import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  searchParams: Promise<{ course?: string }>;
}

export default async function CheckoutCancelPage({ searchParams }: Props) {
  const { course } = await searchParams;
  return (
    <div className="premium-shell flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="premium-card flex max-w-xl flex-col items-center rounded-[--radius-xl] px-8 py-12">
      <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[--color-error]/10 shadow-[var(--shadow-lg)]">
        <XCircle className="h-12 w-12 text-[--color-error]" />
      </span>
      <h1 className="relative mt-5 text-3xl font-black tracking-tight text-[--color-text-primary]">Payment cancelled</h1>
      <p className="mt-2 text-[--color-text-muted]">No charge was made. You can try again any time.</p>
      <Link href={course ? `/courses/${course}` : "/courses"} className="mt-6">
        <Button variant="outline">Back to course</Button>
      </Link>
      </div>
    </div>
  );
}
