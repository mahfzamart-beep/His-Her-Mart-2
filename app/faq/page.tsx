import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Help & FAQs",
  description: "Helpful answers about ordering, Cash on Delivery, delivery charges, order tracking, cart and wishlist at His & Hers Mart.",
  alternates: { canonical: "https://his-and-her-mart.vercel.app/faq" },
  openGraph: {
    title: "Help & FAQs | His & Hers Mart",
    description: "Helpful answers for shopping at His & Hers Mart, Bangladesh.",
    url: "https://his-and-her-mart.vercel.app/faq",
    siteName: "His & Hers Mart",
    locale: "en_BD",
    type: "website",
  },
};

const faqs = [
  {
    category: "Ordering",
    question: "How do I place an order?",
    answer: "Choose a product, add it to your bag, and continue to checkout. Enter your name, Bangladesh mobile number and delivery address, review the order details, then submit your order. Product price and available stock are checked again when the order is placed.",
  },
  {
    category: "Payment",
    question: "Which payment method is available right now?",
    answer: "Cash on Delivery (COD) is the currently available payment method. bKash and Nagad checkout are not active yet. Please do not send advance payments to personal numbers or outside the website.",
  },
  {
    category: "Delivery",
    question: "How does selected-product free shipping work?",
    answer: "Products that qualify are marked in the store. An order containing at least 3 quantity units of eligible products unlocks free shipping. The offer applies only to marked products; it does not automatically cover every product in the catalogue.",
  },
  {
    category: "Delivery",
    question: "How much is the delivery charge?",
    answer: "Delivery is ৳80 for Inside Dhaka and ৳150 for Outside Dhaka. Select the correct delivery area at checkout. Orders with at least 3 quantity units from selected free-shipping products still qualify for that offer.",
  },
  {
    category: "Exchange policy",
    question: "What should I do if I find a defect in the product?",
    answer: "Please check the product while the delivery person is still present, before they leave. If you find a product defect at that time, contact us and we will send a replacement at our expense. If you request an exchange after the delivery person has left, a new delivery charge will apply. Please inspect the parcel and product carefully at your doorstep.",
  },
  {
    category: "Customer support",
    question: "How can I contact His & Hers Mart?",
    answer: "Message our customer support team on WhatsApp at +8801969419302.",
    link: "https://wa.me/8801969419302",
    linkLabel: "Chat on WhatsApp",
  },
  {
    category: "Tracking",
    question: "How can I track my order?",
    answer: "Open the Track Order page and enter the order number and the same Bangladesh mobile number used at checkout. The page displays the current order and payment status without showing your full delivery address.",
    link: "/track-order",
    linkLabel: "Track an order",
  },
  {
    category: "Saved items",
    question: "Will my cart and wishlist be available on another phone?",
    answer: "Your cart and wishlist are saved in the browser on the device you are using. They do not currently sync between different phones, browsers or customer accounts. Clearing browser data can remove saved items.",
  },
];

export default function FaqPage() {
  return (
    <main className="faq-shell">
      <header className="faq-top">
        <Link href="/" className="faq-back"><ArrowLeft size={16} /> Back to store</Link>
        <Link href="/track-order" className="faq-track">Track order <ArrowRight size={15} /></Link>
      </header>
      <section className="faq-intro">
        <div className="faq-mark"><HelpCircle size={22} /></div>
        <p className="eyebrow">HIS & HERS MART · CUSTOMER HELP</p>
        <h1>A little help.<br /><em>Before you shop.</em></h1>
        <p>Clear answers about ordering, payment, delivery, tracking and saved items.</p>
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
        <h2>Find something <em>lovely.</em></h2>
        <Link className="primary-btn" href="/">Explore the collection <ArrowRight size={16} /></Link>
      </footer>
    </main>
  );
}
