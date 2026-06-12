import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccessPage() {
  return (
    <div className="premium-shell flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="premium-card flex max-w-xl flex-col items-center rounded-[--radius-xl] px-8 py-12">
      <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[--color-primary-subtle] animate-scale-in shadow-[var(--shadow-brand)]"><CheckCircle className="h-12 w-12 text-[--color-success]" /></span>
      <h1 className="relative mt-5 text-3xl font-black tracking-tight text-[--color-text-primary]">Payment successful!</h1>
      <p className="mt-2 text-[--color-text-muted]">
        You&apos;re now enrolled. Head to your dashboard to start learning.
      </p>
      <Link href="/dashboard" className="mt-6">
        <Button>Go to My Learning</Button>
      </Link>
      </div>
    </div>
  );
}
