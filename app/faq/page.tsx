import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Dessert Ordering Help",
  description: "Answers about the Miss Can Cake menu, six-piece boxes, Sylhet delivery, ordering and customer support.",
  alternates: { canonical: "https://cloud-desserts-two.vercel.app/faq" },
  openGraph: {
    title: "Help & FAQs | Miss Can Cake",
    description: "Helpful answers about ordering desserts in Sylhet.",
    url: "https://cloud-desserts-two.vercel.app/faq",
    siteName: "Miss Can Cake",
    locale: "en_BD",
    type: "website",
  },
};

const faqs = [
  { category: "The menu", question: "What is the difference between Cooked and Frozen Desserts?", answer: "Cooked Desserts are prepared and ready to enjoy when delivered. Frozen Desserts are uncooked frozen packs; keep them frozen and cook thoroughly before eating." },
  { category: "Box size", question: "How many desserts are in one box?", answer: "Every Miss Can Cake box contains 6 pieces. The product card shows the price for one box." },
  { category: "Ordering", question: "How do I place an order?", answer: "Choose a dessert favourite, tap Add to Box to continue browsing or Buy Now to go straight to delivery details. Enter your name, mobile number, full address and an active delivery area, then review the total before placing the order." },
  { category: "Payment", question: "Which payment method is available?", answer: "Cash on Delivery is available. Pay the confirmed order total when your delivery arrives. Do not send advance payments to personal numbers." },
  { category: "Delivery", question: "Where does Miss Can Cake deliver?", answer: "We currently deliver only in selected areas of Sylhet City. The active service areas and their delivery charges are shown on the website and at checkout." },
  { category: "Delivery", question: "How much is delivery?", answer: "Delivery charges depend on the active Sylhet area you choose. The exact fee is shown before you place your order." },
  { category: "Order care", question: "What should I do if something is wrong with my order?", answer: "Please check your food boxes while the delivery person is present. If anything is missing, incorrect or damaged, contact Miss Can Cake support promptly and share your order number. Clear photos can help our team understand the issue." },
  { category: "Order tracking", question: "How do I track my order?", answer: "Open Track Order and enter the order number from your confirmation together with the same phone number used at checkout. You can see the latest order and payment status.", link: "/track-order", linkLabel: "Track an order" },
  { category: "Customer support", question: "How can I contact Miss Can Cake?", answer: "Message our team on WhatsApp at +8801969419302. Include your order number and a short description of the issue.", link: "https://wa.me/8801969419302", linkLabel: "Chat with Miss Can Cake" },
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
        <p>Clear answers about our dessert menu, six-piece boxes, Sylhet delivery and order care.</p>
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
        <Link className="primary-btn" href="/">Explore the dessert menu <ArrowRight size={16} /></Link>
      </footer>
    </main>
  );
}
