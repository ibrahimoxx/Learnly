import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OrgNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <Building2 className="h-12 w-12 text-[--color-border]" />
      <h1 className="mt-4 text-2xl font-bold text-[--color-text-primary]">Organization not found</h1>
      <p className="mt-2 text-sm text-[--color-text-muted]">
        This organization doesn&apos;t exist or has been deactivated.
      </p>
      <Link href="/" className="mt-6">
        <Button variant="outline">Go home</Button>
      </Link>
    </div>
  );
}
