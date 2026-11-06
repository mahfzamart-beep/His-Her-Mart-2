"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { ArrowLeft, PackageSearch, Search, Truck } from "lucide-react";

type TrackedItem = { product_name: string; quantity: number; unit_price: number; line_total: number };
type TrackedOrder = { found: boolean; order_number: string; created_at: string; order_status: string; payment_status: string; payment_method: string; subtotal: number; delivery_charge: number; total: number; free_shipping_applied: boolean; items: TrackedItem[] };
const money = (n: number) => new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(Number(n || 0));
const statusLabel: Record<string, string> = { pending: "Awaiting store confirmation", confirmed: "Confirmed", processing: "Preparing your order", shipped: "On the way", delivered: "Delivered", cancelled: "Cancelled", returned: "Returned" };

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setOrder(null);
    if (!supabase) { setError("Order tracking is temporarily unavailable."); return; }
    setBusy(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("track-guest-order", {
        body: { order_number: orderNumber.trim().toUpperCase(), customer_phone: phone.trim() }
      });
      if (invokeError) throw invokeError;
      if (!data?.order?.found) throw new Error("We could not find an order matching those details. Check the order number and phone number.");
      setOrder(data.order as TrackedOrder);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not verify those details. Please try again.");
    } finally { setBusy(false); }
  }

  return <main className="tracking-shell">
    <header className="tracking-top">
      <Link href="/" className="tracking-back"><ArrowLeft size={16} /> Back to store</Link>
      <Link href="/" className="tracking-brand">H<span>&</span>H <small>HIS & HER MART</small></Link>
    </header>
    <section className="tracking-card">
      <div className="tracking-icon"><PackageSearch size={25} /></div>
      <p className="eyebrow">HIS & HER MART</p>
      <h1>Track your <em>order.</em></h1>
      <p className="tracking-intro">Enter the order number from your confirmation and the mobile number used at checkout.</p>
      <form onSubmit={submit} className="tracking-form">
        <label>Order number<input required value={orderNumber} onChange={e => setOrderNumber(e.target.value.toUpperCase())} placeholder="HHM-261106-A1B2C3" /></label>
        <label>Checkout mobile number<input required type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" /></label>
        {error && <p className="tracking-error" role="alert">{error}</p>}
        <button className="primary-btn" disabled={busy}>{busy ? "CHECKING…" : "TRACK ORDER"} <Search size={15} /></button>
      </form>
      {order && <section className="tracked-result" aria-live="polite">
        <div className="tracked-result-head"><div><small>ORDER NUMBER</small><b>{order.order_number}</b></div><span className={"order-status status-" + order.order_status}>{statusLabel[order.order_status] || order.order_status}</span></div>
        <p className="tracked-date">Placed {new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.created_at))}</p>
        <div className="tracking-progress"><Truck size={19} /><div><b>{statusLabel[order.order_status] || order.order_status}</b><small>Payment: {order.payment_method?.replaceAll("_", " ").toUpperCase()} · {order.payment_status}</small></div></div>
        <h2>Items in this order</h2>
        {order.items?.map((item, index) => <div className="tracked-item" key={index}><div><b>{item.product_name}</b><small>Qty {item.quantity} × {money(Number(item.unit_price))}</small></div><strong>{money(Number(item.line_total))}</strong></div>)}
        <div className="tracked-total"><div><span>Subtotal</span><b>{money(Number(order.subtotal))}</b></div><div><span>Delivery</span><b>{order.free_shipping_applied ? "FREE" : Number(order.delivery_charge) > 0 ? money(Number(order.delivery_charge)) : "To be confirmed"}</b></div><div className="tracked-grand"><span>{!order.free_shipping_applied && Number(order.delivery_charge) === 0 ? "Product subtotal · delivery pending" : "Total"}</span><b>{money(Number(order.total))}</b></div></div>
        <p className="tracking-privacy">For your privacy, this page does not show your delivery address or email address.</p>
      </section>}
    </section>
    <footer className="tracking-footer">Need help? Contact the store through its official support channel.</footer>
  </main>;
}
