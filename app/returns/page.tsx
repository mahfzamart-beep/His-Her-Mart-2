import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Product checks & exchanges",
  description: "How to inspect your His & Her Mart parcel and report a product defect.",
  alternates: { canonical: "https://his-and-her-mart.vercel.app/returns" },
};

export default function ReturnsPage() {
  return (
    <main className="policy-shell">
      <header className="policy-top">
        <Link href="/" className="tracking-back"><ArrowLeft size={16}/> Back to store</Link>
        <Link href="/" className="tracking-brand">H<span>&</span>H <small>HIS & HER MART</small></Link>
      </header>
      <article className="policy-card">
        <div className="tracking-icon"><ShieldCheck size={24}/></div>
        <p className="eyebrow">CUSTOMER CARE</p>
        <h1>Product checks <em>& exchanges.</em></h1>
        <p className="policy-lead">Please inspect your parcel carefully when it arrives.</p>
        <section className="policy-section">
          <h2>Inspect before the courier leaves</h2>
          <p>Please check the parcel and product while the delivery person is still present. If you find a product defect at that time, contact our team so we can arrange a replacement at our expense.</p>
        </section>
        <section className="policy-section">
          <h2>Exchange requests after delivery</h2>
          <p>If you request an exchange after the delivery person has left, a new delivery charge will apply. Please contact our team before sending any item back so that we can guide you through the next steps.</p>
        </section>
        <section className="policy-section">
          <h2>Need assistance?</h2>
          <p>Share your order number and explain the issue to our customer support team.</p>
          <a className="policy-link" href="https://wa.me/8801969419302" target="_blank" rel="noreferrer">Contact support on WhatsApp <ArrowRight size={15}/></a>
        </section>
        <p className="policy-updated">This page summarises the current product-inspection and exchange information shared by His & Her Mart. It does not promise an unconditional return or refund.</p>
        <Link href="/faq" className="policy-secondary">Read customer FAQs</Link>
      </article>
    </main>
  );
}
