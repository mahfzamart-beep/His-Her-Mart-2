import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Truck } from "lucide-react";

export const metadata: Metadata = {
  title: "Sylhet Delivery Information",
  description: "Cloud Momos delivery areas, local delivery charges and order information for Sylhet City.",
  alternates: { canonical: "https://cloudmomos.vercel.app/shipping" },
};

export default function ShippingPage() {
  return (
    <main className="policy-shell">
      <header className="policy-top">
        <Link href="/" className="tracking-back"><ArrowLeft size={16}/> Back to menu</Link>
        <Link href="/" className="tracking-brand">Cloud<span>Momos</span><small>MADE WITH LOVE IN SYLHET</small></Link>
      </header>
      <article className="policy-card">
        <div className="tracking-icon"><Truck size={24}/></div>
        <p className="eyebrow">LOCAL DELIVERY · SYLHET CITY</p>
        <h1>Delivery, <em>made simple.</em></h1>
        <p className="policy-lead">Freshly cooked and frozen momos delivered to selected areas of Sylhet City.</p>
        <section className="policy-section">
          <h2>Where we deliver</h2>
          <p>We currently serve only the delivery areas enabled by Cloud Momos. Choose your area at checkout to see whether delivery is available to your address.</p>
        </section>
        <section className="policy-section">
          <h2>Delivery charges</h2>
          <p>Each active area has its own delivery charge, managed by Cloud Momos. Your selected area's exact fee is shown at checkout before you place the order.</p>
        </section>
        <section className="policy-section">
          <h2>Payment</h2>
          <p>Cash on Delivery is available. Please pay the confirmed order total when your momo order arrives. Do not send advance payments to personal numbers.</p>
        </section>
        <section className="policy-section">
          <h2>Order updates</h2>
          <p>Use the order number from your confirmation and the same mobile number used at checkout to check your order status.</p>
          <Link className="policy-link" href="/track-order">Track your order <ArrowRight size={15}/></Link>
        </section>
        <p className="policy-updated">Need help? Contact Cloud Momos on <a href="https://wa.me/8801969419302" target="_blank" rel="noreferrer">WhatsApp +8801969419302</a>.</p>
        <Link href="/faq" className="policy-secondary">Read momo FAQs</Link>
      </article>
    </main>
  );
}
