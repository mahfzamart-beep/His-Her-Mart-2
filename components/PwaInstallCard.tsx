"use client";

import { useEffect, useState } from "react";
import { Download, CheckCircle2, Smartphone, Share, MoreVertical } from "lucide-react";

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};
declare global {
  interface Window {
    __cloudMomosInstallPrompt?: DeferredInstallPrompt;
    __cloudMomosPwaInstalled?: boolean;
  }
}

export default function PwaInstallCard() {
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const refresh = () => {
      setCanPrompt(Boolean(window.__cloudMomosInstallPrompt));
      setInstalled(Boolean(window.__cloudMomosPwaInstalled) ||
        window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    };
    refresh();
    window.addEventListener("miss-can-cake-install-available", refresh);
    window.addEventListener("miss-can-cake-app-installed", refresh);
    window.addEventListener("appinstalled", refresh);
    return () => {
      window.removeEventListener("miss-can-cake-install-available", refresh);
      window.removeEventListener("miss-can-cake-app-installed", refresh);
      window.removeEventListener("appinstalled", refresh);
    };
  }, []);

  async function installApp() {
    const promptEvent = window.__cloudMomosInstallPrompt;
    if (!promptEvent) {
      setShowHelp(true);
      setMessage("Your browser does not offer the one-tap install prompt here. Follow the steps below.");
      return;
    }
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      window.__cloudMomosInstallPrompt = undefined;
      setCanPrompt(false);
      if (choice.outcome === "accepted") {
        setMessage("Installation accepted. Miss Can Cake will appear with your apps.");
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
      <div className="pwa-install-icon"><img src="/miss-can-cake-app-icon.svg?v=2" alt="" /></div>
      <p className="eyebrow">MISS CAN CAKE · MADE WITH CARE</p>
      <h2>Your dessert favourite,<br/><em>one tap away.</em></h2>
      <p className="pwa-install-intro">Install Miss Can Cake for one-tap access to Miss Tiramisu, Sylhet delivery updates and order tracking.</p>
      {installed ? (
        <div className="pwa-installed-state"><CheckCircle2 size={18} /> Miss Can Cake is installed on this device.</div>
      ) : (
        <button className="primary-btn pwa-install-button" type="button" onClick={installApp}>
          <Download size={17} /> {canPrompt ? "Install Miss Can Cake" : "How to install the app"}
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
      <p className="pwa-install-note">This is the official Miss Can Cake installable web app, not an APK or a Play Store download. It opens the same dessert menu, checkout and order tracking as the website.</p>
      <p className="pwa-install-note"><strong>Already installed an earlier version?</strong> Remove the previous Miss Can Cake home-screen shortcut, then install again to refresh the new Miss Can Cake dessert icon.</p>
    </section>
  );
}
