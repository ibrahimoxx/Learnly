import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccessPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <CheckCircle className="h-16 w-16 text-[--color-success]" />
      <h1 className="mt-4 text-2xl font-bold text-[--color-text-primary]">Payment successful!</h1>
      <p className="mt-2 text-[--color-text-muted]">
        You&apos;re now enrolled. Head to your dashboard to start learning.
      </p>
      <Link href="/dashboard" className="mt-6">
        <Button>Go to My Learning</Button>
      </Link>
    </div>
  );
}
