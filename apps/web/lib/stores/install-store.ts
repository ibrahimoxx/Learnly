import { create } from "zustand";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  setDeferredPrompt: (event: BeforeInstallPromptEvent | null) => void;
  setInstalled: (installed: boolean) => void;
}

export const useInstallStore = create<InstallState>()((set) => ({
  deferredPrompt: null,
  isInstalled: false,
  setDeferredPrompt: (event) => set({ deferredPrompt: event }),
  setInstalled: (installed) => set({ isInstalled: installed }),
}));
