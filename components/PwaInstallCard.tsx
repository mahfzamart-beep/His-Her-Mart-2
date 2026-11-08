"use client";

import { useEffect, useState } from "react";
import { Download, CheckCircle2, Smartphone, Share, MoreVertical } from "lucide-react";

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};
declare global {
  interface Window {
    __hhmInstallPrompt?: DeferredInstallPrompt;
    __hhmPwaInstalled?: boolean;
  }
}

export default function PwaInstallCard() {
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const refresh = () => {
      setCanPrompt(Boolean(window.__hhmInstallPrompt));
      setInstalled(Boolean(window.__hhmPwaInstalled) ||
        window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    };
    refresh();
    window.addEventListener("hhm-install-available", refresh);
    window.addEventListener("hhm-app-installed", refresh);
    window.addEventListener("appinstalled", refresh);
    return () => {
      window.removeEventListener("hhm-install-available", refresh);
      window.removeEventListener("hhm-app-installed", refresh);
      window.removeEventListener("appinstalled", refresh);
    };
  }, []);

  async function installApp() {
    const promptEvent = window.__hhmInstallPrompt;
    if (!promptEvent) {
      setShowHelp(true);
      setMessage("Your browser does not offer the one-tap install prompt here. Follow the steps below.");
      return;
    }
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      window.__hhmInstallPrompt = undefined;
      setCanPrompt(false);
      if (choice.outcome === "accepted") {
        setMessage("Installation accepted. His & Hers Mart will appear with your apps.");
        setInstalled(true);
      } else {
        setMessage("Installation was cancelled. You can try again from your browser menu.");
      }
    } catch {
      setShowHelp(true);
      setMessage("The browser could not open the install prompt. Use the browser menu instructions below.");
    }
  }

  return (
    <section className="pwa-install-card">
      <div className="pwa-install-icon"><img src="/icon.svg" alt="" /></div>
      <p className="eyebrow">SHOP SMART. LIVE BETTER.</p>
      <h2>Take the store <em>with you.</em></h2>
      <p className="pwa-install-intro">Add His & Hers Mart to your phone’s home screen for a clean, app-like shopping experience. Your existing website account and order services remain on the same secure store.</p>
      {installed ? (
        <div className="pwa-installed-state"><CheckCircle2 size={18} /> His & Hers Mart is installed on this device.</div>
      ) : (
        <button className="primary-btn pwa-install-button" type="button" onClick={installApp}>
          <Download size={17} /> {canPrompt ? "Install His & Hers Mart" : "How to install the app"}
        </button>
      )}
      {message && <p className="pwa-install-message" role="status">{message}</p>}
      <button className="pwa-help-toggle" type="button" onClick={() => setShowHelp(value => !value)}>
        {showHelp ? "Hide installation steps" : "Show manual installation steps"}
      </button>
      {showHelp && (
        <div className="pwa-install-instructions">
          <article><Smartphone size={19} /><div><b>Android · Chrome</b><p>Open this website in Chrome, tap the three-dot menu, then choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p></div><MoreVertical size={17} /></article>
          <article><Share size={19} /><div><b>iPhone · Safari</b><p>Open this website in Safari, tap the Share icon, choose <strong>Add to Home Screen</strong>, then tap Add.</p></div></article>
        </div>
      )}
      <p className="pwa-install-note">This is the official installable web app (PWA), not an APK or a Play Store download. It uses the same live website and does not create a separate account.</p>
    </section>
  );
}
