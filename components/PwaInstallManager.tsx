"use client";

import { useEffect } from "react";

type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };
type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

declare global {
  interface Window {
    __cloudMomosInstallPrompt?: DeferredInstallPrompt;
    __cloudMomosPwaInstalled?: boolean;
  }
}

export default function PwaInstallManager() {
  useEffect(() => {
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      window.__cloudMomosInstallPrompt = event as DeferredInstallPrompt;
      window.dispatchEvent(new Event("cloud-momos-install-available"));
    };
    const onInstalled = () => {
      window.__cloudMomosPwaInstalled = true;
      window.__cloudMomosInstallPrompt = undefined;
      window.dispatchEvent(new Event("cloud-momos-app-installed"));
    };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
        .then((registration) => registration.update().catch(() => undefined))
        .catch((error) => {
          console.warn("Cloud Momos app worker registration failed:", error);
        });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}
