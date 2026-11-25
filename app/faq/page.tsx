import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Dessert Ordering Help",
  description: "Answers about Miss Tiramisu, 120ml cups, Sylhet delivery, ordering and customer support.",
  alternates: { canonical: "https://cloud-momos-two.vercel.app/faq" },
  openGraph: {
    title: "Help & FAQs | Miss Can Cake",
    description: "Helpful answers about ordering desserts in Sylhet.",
    url: "https://cloud-momos-two.vercel.app/faq",
    siteName: "Miss Can Cake",
    locale: "en_BD",
    type: "website",
  },
};

const faqs = [
  { category: "The dessert", question: "What is Miss Tiramisu?", answer: "Miss Tiramisu is our first chilled dessert, made with four small Dry Cake pieces, coffee cream and cocoa." },
  { category: "Cup size", question: "How much is in one cup?", answer: "Each 120ml cup contains four small Dry Cake pieces. The product card shows the price for one cup." },
  { category: "Ordering", question: "How do I place an order?", answer: "Choose Miss Tiramisu, tap Add to Cup or Buy Now, then enter your name, mobile number, full address and an active delivery area. Review the total before placing the order." },
  { category: "Storage", question: "How should I store my dessert?", answer: "Keep Miss Tiramisu refrigerated and enjoy chilled. Do not leave it at room temperature for extended periods." },
  { category: "Payment", question: "Which payment method is available?", answer: "Cash on Delivery is available. Pay the confirmed order total when your delivery arrives." },
  { category: "Delivery", question: "Where does Miss Can Cake deliver?", answer: "We currently deliver only in selected areas of Sylhet City. Active service areas and delivery charges are shown on the website and at checkout." },
  { category: "Customer support", question: "How can I contact Miss Can Cake?", answer: "Message our team on WhatsApp at +8801969419302. Include your order number and a short description of the issue.", link: "https://wa.me/8801969419302", linkLabel: "Chat with Miss Can Cake" }
];;

export default function FaqPage() {
  return (
    <main className="faq-shell">
      <header className="faq-top">
        <Link href="/" className="faq-back"><ArrowLeft size={16} /> Back to menu</Link>
        <Link href="/track-order" className="faq-track">Track order <ArrowRight size={15} /></Link>
      </header>
      <section className="faq-intro">
        <div className="faq-mark"><HelpCircle size={22} /></div>
        <p className="eyebrow">MISS CAN CAKE · CUSTOMER CARE</p>
        <h1>Good to know.<br /><em>Before the first bite.</em></h1>
        <p>Clear answers about our dessert menu, 120ml cups, Sylhet delivery and order care.</p>
      </section>
      <section className="faq-list" aria-label="Frequently asked questions">
        {faqs.map((item, index) => (
          <details className="faq-item" key={item.question} open={index === 0}>
            <summary>
              <span className="faq-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="faq-question"><small>{item.category}</small><b>{item.question}</b></span>
              <span className="faq-toggle" aria-hidden="true">+</span>
            </summary>
            <div className="faq-answer">
              <p>{item.answer}</p>
              {"link" in item && item.link && (
                <Link href={item.link}>{item.linkLabel} <ArrowRight size={14} /></Link>
              )}
            </div>
          </details>
        ))}
      </section>
      <footer className="faq-footer">
        <p className="eyebrow">CUSTOMER SUPPORT · WHATSAPP +8801969419302</p>
        <h2>A little cup.<br/><em>Big happiness.</em></h2>
        <Link className="primary-btn" href="/">Explore Miss Tiramisu <ArrowRight size={16} /></Link>
      </footer>
    </main>
  );
}
