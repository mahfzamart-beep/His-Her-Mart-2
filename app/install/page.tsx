import type { Metadata } from "next";
import Link from "next/link";
import PwaInstallCard from "../../components/PwaInstallCard";

export const metadata: Metadata = {
  title: "Install the App",
  description: "Install Cloud Momos on your phone for an app-like shopping experience.",
  alternates: { canonical: "https://cloudmomos.vercel.app/install" },
  robots: { index: false, follow: true }
};

export default function InstallPage() {
  return (
    <main className="pwa-install-page">
      <header className="pwa-install-header">
        <Link href="/" aria-label="Back to Cloud Momos"><img src="/app-icon-v3.svg" alt="Cloud Momos" /></Link>
        <Link href="/" className="pwa-back-link">Back to store</Link>
      </header>
      <PwaInstallCard />
      <footer className="pwa-install-footer">© 2026 Cloud Momos · <Link href="/faq">Help & FAQs</Link></footer>
    </main>
  );
}
