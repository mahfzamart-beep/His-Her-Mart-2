import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MessageCircle, PackageSearch, HelpCircle, Clock3 } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact customer support",
  description: "Contact His & Hers Mart customer support for product, delivery and order questions in Bangladesh.",
  alternates: { canonical: "https://his-and-her-mart.vercel.app/contact" },
  openGraph: {
    title: "Contact customer support | His & Hers Mart",
    description: "We're one message away. Contact His & Hers Mart for shopping and order support.",
    url: "https://his-and-her-mart.vercel.app/contact",
    siteName: "His & Hers Mart",
    locale: "en_BD",
    type: "website",
  },
};

export default function ContactPage() {
  return (
    <main className="policy-shell">
      <header className="policy-top">
        <Link href="/" className="tracking-back"><ArrowLeft size={16}/> Back to store</Link>
        <Link href="/" className="tracking-brand">H<span>&</span>H <small>HIS & HERS MART</small></Link>
      </header>
      <article className="policy-card">
        <div className="tracking-icon"><MessageCircle size={24}/></div>
        <p className="eyebrow">WE'RE HERE TO HELP</p>
        <h1>Talk to <em>our team.</em></h1>
        <p className="policy-lead">Questions about a product, delivery or an existing order? Send our customer support team a WhatsApp message.</p>

        <section className="policy-section">
          <h2>Customer support on WhatsApp</h2>
          <p>Message us at <strong>+880 1969-419302</strong>. For an existing order, include your order number so our team can assist you more quickly.</p>
          <a className="policy-link" href="https://wa.me/8801969419302" target="_blank" rel="noreferrer">Start a WhatsApp chat <ArrowRight size={15}/></a>
        </section>

        <section className="policy-section">
          <h2>What can we help with?</h2>
          <p><PackageSearch size={15} /> Product availability, variants and product details</p>
          <p><Clock3 size={15} /> Delivery information and order updates</p>
          <p><HelpCircle size={15} /> Checkout, payment and exchange questions</p>
        </section>

        <section className="policy-section">
          <h2>Useful customer links</h2>
          <Link className="policy-link" href="/track-order">Track your order <ArrowRight size={15}/></Link>
          <Link className="policy-link" href="/shipping">Shipping information <ArrowRight size={15}/></Link>
          <Link className="policy-link" href="/returns">Product checks & exchanges <ArrowRight size={15}/></Link>
          <Link className="policy-link" href="/faq">Frequently asked questions <ArrowRight size={15}/></Link>
        </section>
        <p className="policy-updated">Current online checkout supports Cash on Delivery. We do not request advance payment through personal mobile-wallet numbers.</p>
      </article>
    </main>
  );
}
