import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Order Care & Food Pack Checks",
  description: "How to check a Cloud Momos order and contact the team about damaged, incorrect or missing items.",
  alternates: { canonical: "https://cloudmomos.vercel.app/returns" },
};

export default function ReturnsPage() {
  return (
    <main className="policy-shell">
      <header className="policy-top">
        <Link href="/" className="tracking-back"><ArrowLeft size={16}/> Back to menu</Link>
        <Link href="/" className="tracking-brand">Cloud<span>Momos</span><small>MADE WITH LOVE IN SYLHET</small></Link>
      </header>
      <article className="policy-card">
        <div className="tracking-icon"><ShieldCheck size={24}/></div>
        <p className="eyebrow">CUSTOMER CARE</p>
        <h1>Your order,<br/><em>checked with care.</em></h1>
        <p className="policy-lead">Please check your momo order when it arrives and let us know promptly if something is not right.</p>
        <section className="policy-section">
          <h2>Check the order at delivery</h2>
          <p>While the delivery person is present, check that you have received the correct food packs and the expected number of boxes. Tell the delivery person and contact Cloud Momos support straight away if something is damaged, incorrect or missing.</p>
        </section>
        <section className="policy-section">
          <h2>Report a problem</h2>
          <p>If something is missing, incorrect or damaged, contact Cloud Momos promptly with your order number. Clear photos of the food pack can help our team review the issue if available.</p>
        </section>
        <section className="policy-section">
          <h2>Need assistance?</h2>
          <p>Share your order number, explain the issue and include clear photos where helpful. Our team will review your report and guide you through the next step.</p>
          <a className="policy-link" href="https://wa.me/8801969419302" target="_blank" rel="noreferrer">Contact Cloud Momos on WhatsApp <ArrowRight size={15}/></a>
        </section>
        <p className="policy-updated">Food-order concerns are reviewed individually. This page does not promise an unconditional return or refund and does not affect rights under applicable consumer-protection law.</p>
        <Link href="/faq" className="policy-secondary">Read customer FAQs</Link>
      </article>
    </main>
  );
}
