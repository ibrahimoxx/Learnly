import Link from "next/link";
import { CreditCard, Lock, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountSubnav } from "@/components/shared/account-subnav";

export default function PaymentMethodsPage() {
  return (
    <div className="premium-shell min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <span className="inline-flex rounded-full bg-[--color-primary-subtle] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[--brand-800]">
          Account settings
        </span>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[--color-text-primary]">Payment methods</h1>
        <p className="mt-2 text-[--color-text-secondary]">
          How Skillforge handles your payment details.
        </p>

        <div className="mt-8">
          <AccountSubnav />
        </div>

        <div className="premium-card mt-8 flex flex-col items-center gap-3 rounded-[--radius-lg] py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[image:var(--gradient-brand)] shadow-[var(--shadow-brand)]">
            <CreditCard className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-[--color-text-primary]">No saved cards on Skillforge</h2>
          <p className="max-w-md text-[--color-text-secondary]">
            Skillforge never stores your card details. Every purchase is processed securely by Stripe at checkout —
            you&apos;ll enter your payment details there each time.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link href="/user/edit-profile/purchase-history">
              <Button>
                <Receipt className="h-4 w-4" />
                View purchase history
              </Button>
            </Link>
            <Link href="/courses">
              <Button variant="secondary">Browse courses</Button>
            </Link>
          </div>
        </div>

        <div className="premium-card mt-6 flex items-start gap-3 rounded-[--radius-lg] p-6">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[--color-text-muted]" />
          <p className="text-sm text-[--color-text-secondary]">
            Payments are encrypted and handled entirely by Stripe. Skillforge staff never see or store your full card
            number, CVC, or billing address.
          </p>
        </div>
      </div>
    </div>
  );
}
