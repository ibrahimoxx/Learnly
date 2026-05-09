"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
] as const;

export function LanguageSwitcher() {
  const router = useRouter();
  const currentLocale = useLocale();

  function switchLocale(locale: string) {
    document.cookie = `locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <Globe className="h-4 w-4 text-[--color-text-muted]" />
      {LOCALES.map((l) => (
        <Button
          key={l.code}
          variant="ghost"
          size="sm"
          className={
            currentLocale === l.code
              ? "h-7 px-2 text-xs font-semibold text-[--color-primary]"
              : "h-7 px-2 text-xs font-normal text-[--color-text-muted] hover:text-[--color-text-primary]"
          }
          onClick={() => switchLocale(l.code)}
        >
          {l.label}
        </Button>
      ))}
    </div>
  );
}
