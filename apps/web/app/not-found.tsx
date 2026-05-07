import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-6xl font-bold text-[--color-border]">404</p>
      <h1 className="text-xl font-bold text-[--color-text-primary]">Page not found</h1>
      <p className="text-sm text-[--color-text-muted]">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/"><Button>Back to home</Button></Link>
    </div>
  );
}
