import Link from "next/link";
import { ShieldAlert, Mail } from "lucide-react";

export const metadata = {
  title: "Account suspended",
};

export default function AccountSuspendedPage() {
  return (
    <div className="min-h-screen bg-white">
      <div
        className="px-4 py-16 text-white sm:px-6"
        style={{ background: "linear-gradient(135deg,#1f1147,#3b1764,#1a1330)" }}
      >
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            <ShieldAlert className="h-8 w-8 text-red-300" />
          </div>
          <h1 className="mt-5 text-3xl font-black">Your account has been suspended</h1>
          <p className="mt-3 text-sm text-white/70">
            You no longer have access to Learnly while your account is suspended. If you believe this is a
            mistake, contact our support team for review.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-12 text-center sm:px-6">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="mailto:learnly@support.com"
            className="flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-black text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
          >
            <Mail className="h-4 w-4" />
            Contact support
          </a>
          <Link href="/" className="text-sm text-[--color-text-muted] hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
