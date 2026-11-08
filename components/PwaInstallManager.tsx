"use client";

import { useEffect } from "react";

type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };
type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

declare global {
  interface Window {
    __hhmInstallPrompt?: DeferredInstallPrompt;
    __hhmPwaInstalled?: boolean;
  }
}

export default function PwaInstallManager() {
  useEffect(() => {
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      window.__hhmInstallPrompt = event as DeferredInstallPrompt;
      window.dispatchEvent(new Event("hhm-install-available"));
    };
    const onInstalled = () => {
      window.__hhmPwaInstalled = true;
      window.__hhmInstallPrompt = undefined;
      window.dispatchEvent(new Event("hhm-app-installed"));
    };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
        .then((registration) => registration.update().catch(() => undefined))
        .catch((error) => {
          console.warn("His & Hers app worker registration failed:", error);
        });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}
