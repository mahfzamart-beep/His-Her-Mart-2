import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Truck } from "lucide-react";

export const metadata: Metadata = {
  title: "Shipping information",
  description: "Delivery charges and shipping information for His & Hers Mart orders in Bangladesh.",
  alternates: { canonical: "https://his-and-her-mart.vercel.app/shipping" },
};

export default function ShippingPage() {
  return (
    <main className="policy-shell">
      <header className="policy-top">
        <Link href="/" className="tracking-back"><ArrowLeft size={16}/> Back to store</Link>
        <Link href="/" className="tracking-brand">H<span>&</span>H <small>HIS & HERS MART</small></Link>
      </header>
      <article className="policy-card">
        <div className="tracking-icon"><Truck size={24}/></div>
        <p className="eyebrow">CUSTOMER INFORMATION</p>
        <h1>Shipping <em>information.</em></h1>
        <p className="policy-lead">Clear delivery charges before you place your order.</p>
        <section className="policy-section">
          <h2>Delivery charges</h2>
          <div className="policy-rate"><span>Inside Dhaka</span><b>৳80</b></div>
          <div className="policy-rate"><span>Outside Dhaka</span><b>৳150</b></div>
          <p>The correct delivery charge is shown at checkout after you select your delivery area.</p>
        </section>
        <section className="policy-section">
          <h2>Selected-product free shipping</h2>
          <p>Some products are specifically marked as eligible for free shipping. An order containing at least 3 quantity units of eligible products unlocks the offer. The offer does not automatically apply to every product in the store.</p>
        </section>
        <section className="policy-section">
          <h2>Payment</h2>
          <p>Cash on Delivery is currently available. Pay the order amount when your parcel arrives. Online bKash and Nagad payments are not active at this time; please do not send advance payments outside the website.</p>
        </section>
        <section className="policy-section">
          <h2>Order updates</h2>
          <p>Use the order number from your confirmation and the same mobile number used at checkout to check your order status.</p>
          <Link className="policy-link" href="/track-order">Track your order <ArrowRight size={15}/></Link>
        </section>
        <p className="policy-updated">Questions? Contact customer support on <a href="https://wa.me/8801969419302" target="_blank" rel="noreferrer">WhatsApp +8801969419302</a>.</p>
        <Link href="/faq" className="policy-secondary">Read customer FAQs</Link>
      </article>
    </main>
  );
}
