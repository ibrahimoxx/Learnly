"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, X } from "lucide-react";
import { useInstallStore, type BeforeInstallPromptEvent } from "@/lib/stores/install-store";

const DISMISSED_KEY = "pwa-install-dismissed";

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const deferredPrompt = useInstallStore((state) => state.deferredPrompt);
  const setDeferredPrompt = useInstallStore((state) => state.setDeferredPrompt);
  const setInstalled = useInstallStore((state) => state.setInstalled);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    function installedHandler() {
      setInstalled(true);
      setDeferredPrompt(null);
      setVisible(false);
    }

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, [setDeferredPrompt, setInstalled]);

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
      setDeferredPrompt(null);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
    setDeferredPrompt(null);
  }

  if (!visible) return null;

  return (
    <div
      role="banner"
      className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-[--color-border] bg-white px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,.14)] sm:bottom-6"
    >
      <div className="flex items-center gap-3">
        <Image
          src="/brand/learnly-logo-generated.png"
          alt="Learnly"
          width={40}
          height={40}
          className="h-10 w-10 rounded-xl"
          unoptimized
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[--color-text-primary] leading-tight">
            Install Learnly
          </p>
          <p className="text-xs text-[--color-text-muted] mt-0.5">
            Add to your home screen for quick access
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={install}
            className="flex items-center gap-1.5 rounded-lg bg-[--color-primary] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[--color-primary-hover] transition-colors"
          >
            <Download className="h-3 w-3" />
            Install
          </button>
          <button
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="rounded-lg p-1.5 text-[--color-text-muted] hover:bg-[--color-surface] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
