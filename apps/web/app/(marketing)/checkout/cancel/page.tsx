import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  searchParams: Promise<{ course?: string }>;
}

export default async function CheckoutCancelPage({ searchParams }: Props) {
  const { course } = await searchParams;
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <XCircle className="h-16 w-16 text-[--color-error]" />
      <h1 className="mt-4 text-2xl font-bold text-[--color-text-primary]">Payment cancelled</h1>
      <p className="mt-2 text-[--color-text-muted]">No charge was made. You can try again any time.</p>
      <Link href={course ? `/courses/${course}` : "/courses"} className="mt-6">
        <Button variant="outline">Back to course</Button>
      </Link>
    </div>
  );
}
