import type { Metadata } from "next";
import Link from "next/link";
import PwaInstallCard from "../../components/PwaInstallCard";

export const metadata: Metadata = {
  title: "Install the App",
  description: "Install His & Hers Mart on your phone for an app-like shopping experience.",
  alternates: { canonical: "https://his-and-her-mart.vercel.app/install" },
  robots: { index: false, follow: true }
};

export default function InstallPage() {
  return (
    <main className="pwa-install-page">
      <header className="pwa-install-header">
        <Link href="/" aria-label="Back to His & Hers Mart"><img src="/brand/his-and-hers-logo.png" alt="His & Hers — Shop Smart. Live Better." /></Link>
        <Link href="/" className="pwa-back-link">Back to store</Link>
      </header>
      <PwaInstallCard />
      <footer className="pwa-install-footer">© 2026 His & Hers Mart · <Link href="/faq">Help & FAQs</Link></footer>
    </main>
  );
}
