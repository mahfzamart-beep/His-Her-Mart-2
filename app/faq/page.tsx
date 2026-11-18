import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Momo Ordering Help",
  description: "Answers about Cloud Momos menu choices, six-piece boxes, Sylhet delivery, food-pack checks and order tracking.",
  alternates: { canonical: "https://cloudmomos.vercel.app/faq" },
  openGraph: {
    title: "Help & FAQs | Cloud Momos",
    description: "Helpful answers about ordering momos in Sylhet.",
    url: "https://cloudmomos.vercel.app/faq",
    siteName: "Cloud Momos",
    locale: "en_BD",
    type: "website",
  },
};

const faqs = [
  { category: "The menu", question: "What is the difference between Cooked and Frozen Momos?", answer: "Cooked Momos are prepared and ready to enjoy when delivered. Frozen Momos are uncooked frozen packs; keep them frozen and cook thoroughly before eating." },
  { category: "Box size", question: "How many momos are in one box?", answer: "Every Cloud Momos box contains 6 pieces. The product card shows the price for one box." },
  { category: "Ordering", question: "How do I place an order?", answer: "Choose a momo favourite, tap Add to Box to continue browsing or Buy Now to go straight to delivery details. Enter your name, mobile number, full address and an active delivery area, then review the total before placing the order." },
  { category: "Payment", question: "Which payment method is available?", answer: "Cash on Delivery is available. Pay the confirmed order total when your delivery arrives. Do not send advance payments to personal numbers." },
  { category: "Delivery", question: "Where does Cloud Momos deliver?", answer: "We currently deliver only in selected areas of Sylhet City. The active service areas and their delivery charges are shown on the website and at checkout." },
  { category: "Delivery", question: "How much is delivery?", answer: "Delivery charges depend on the active Sylhet area you choose. The exact fee is shown before you place your order." },
  { category: "Order care", question: "Should I record a video when opening my food pack?", answer: "Yes, it helps us review a report about a damaged, incorrect or missing item. Use your phone camera to start one continuous video before opening the sealed pack. Show the order label, opening and items inside. The website does not record or upload video itself; share the clip with our support team on WhatsApp if there is an issue." },
  { category: "Order tracking", question: "How do I track my order?", answer: "Open Track Order and enter the order number from your confirmation together with the same phone number used at checkout. You can see the latest order and payment status.", link: "/track-order", linkLabel: "Track an order" },
  { category: "Customer support", question: "How can I contact Cloud Momos?", answer: "Message our team on WhatsApp at +8801969419302. Include your order number and a short description of the issue.", link: "https://wa.me/8801969419302", linkLabel: "Chat with Cloud Momos" },
];

export default function FaqPage() {
  return (
    <main className="faq-shell">
      <header className="faq-top">
        <Link href="/" className="faq-back"><ArrowLeft size={16} /> Back to menu</Link>
        <Link href="/track-order" className="faq-track">Track order <ArrowRight size={15} /></Link>
      </header>
      <section className="faq-intro">
        <div className="faq-mark"><HelpCircle size={22} /></div>
        <p className="eyebrow">CLOUD MOMOS · CUSTOMER CARE</p>
        <h1>Good to know.<br /><em>Before the first bite.</em></h1>
        <p>Clear answers about our momo menu, six-piece boxes, Sylhet delivery and order care.</p>
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
        <h2>Little clouds.<br/><em>Big comfort.</em></h2>
        <Link className="primary-btn" href="/">Explore the momo menu <ArrowRight size={16} /></Link>
      </footer>
    </main>
  );
}
