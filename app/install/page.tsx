import type { Metadata } from "next";
import Link from "next/link";
import PwaInstallCard from "../../components/PwaInstallCard";

export const metadata: Metadata = {
  title: "Install the App",
  description: "Install Miss Can Cake on your phone for one-tap access to the dessert menu and order tracking.",
  robots: { index: false, follow: true }
};

export default function InstallPage() {
  return (
    <main className="pwa-install-page">
      <header className="pwa-install-header">
        <Link href="/" aria-label="Back to Miss Can Cake"><img src="/miss-can-cake-app-icon.svg?v=2" alt="Miss Can Cake" /></Link>
        <Link href="/" className="pwa-back-link">Back to store</Link>
      </header>
      <PwaInstallCard />
      <footer className="pwa-install-footer">© 2026 Miss Can Cake · <Link href="/faq">Help & FAQs</Link></footer>
    </main>
  );
}
