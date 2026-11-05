"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { ArrowLeft, Boxes, CheckCircle2, ClipboardList, LogOut, PackageCheck, RefreshCw, Search, ShieldAlert, Truck } from "lucide-react";

type OrderItem = { id: string; product_name: string; product_sku: string | null; unit_price: number; quantity: number; line_total: number };
type Order = {
  id: string; order_number: string; customer_name: string; customer_phone: string;
  customer_email: string | null; shipping_address: Record<string, string>;
  subtotal: number; delivery_charge: number; total: number; payment_method: string;
  payment_status: string; order_status: string; customer_note: string | null;
  admin_note: string | null; created_at: string; order_items: OrderItem[];
};
const statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];
const money = (value: number) => new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(Number(value || 0));
const date = (value: string) => new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<any>(null);
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const verifyAndLoad = useCallback(async (userId: string) => {
    if (!supabase) { setError("Supabase is not configured."); setChecking(false); return; }
    setChecking(true);
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (profileError || profile?.role !== "admin") {
      setAuthorized(false);
      setError("This account does not have administrator access. Ask the store owner to grant the admin role.");
      setChecking(false);
      return;
    }
    setAuthorized(true);
    const { data, error: orderError } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(200);
    if (orderError) setError(orderError.message);
    else setOrders((data || []) as Order[]);
    setChecking(false);
  }, []);

  useEffect(() => {
    if (!supabase) { setChecking(false); return; }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) void verifyAndLoad(data.session.user.id);
      else setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setAuthorized(false);
      if (nextSession?.user) void verifyAndLoad(nextSession.user.id);
      else { setOrders([]); setChecking(false); }
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [verifyAndLoad]);

  const refresh = async () => {
    if (session?.user) await verifyAndLoad(session.user.id);
  };
  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError("");
    if (!supabase) { setError("Supabase is not configured."); setBusy(false); return; }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message);
    setBusy(false);
  };
  const signOut = async () => { await supabase?.auth.signOut(); setSession(null); setAuthorized(false); setOrders([]); };

  const updateOrder = async (order: Order, nextStatus: string) => {
    if (!supabase || !authorized) return;
    setBusy(true); setError("");
    const { error } = await supabase.from("orders").update({
      order_status: nextStatus,
      admin_note: adminNote.trim() || order.admin_note,
      updated_at: new Date().toISOString(),
    }).eq("id", order.id);
    if (error) setError(error.message);
    else {
      setOrders(current => current.map(item => item.id === order.id ? { ...item, order_status: nextStatus, admin_note: adminNote.trim() || item.admin_note } : item));
      setSelected(current => current?.id === order.id ? { ...current, order_status: nextStatus, admin_note: adminNote.trim() || current.admin_note } : current);
    }
    setBusy(false);
  };

  const visibleOrders = useMemo(() => orders.filter(order => {
    const matchesStatus = filter === "all" || order.order_status === filter;
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [order.order_number, order.customer_name, order.customer_phone].some(value => value?.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  }), [orders, filter, search]);

  const counts = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.order_status === "pending").length,
    processing: orders.filter(o => ["confirmed", "processing"].includes(o.order_status)).length,
    shipped: orders.filter(o => o.order_status === "shipped").length,
  }), [orders]);

  if (checking) return <main className="admin-shell"><div className="admin-loading"><RefreshCw className="spin" /> Checking secure admin access…</div></main>;

  if (!session || !authorized) return <main className="admin-shell admin-login-shell">
    <a className="admin-back" href="/"><ArrowLeft size={15} /> Back to store</a>
    <section className="admin-login-card">
      <div className="admin-brand-mark">H<span>&</span>H</div>
      <p className="eyebrow">HIS & HER MART</p>
      <h1>Admin sign in</h1>
      <p className="admin-muted">Secure access for authorised store administrators only.</p>
      {session && !authorized && <div className="admin-alert"><ShieldAlert size={17} /> {error || "This account is not an administrator."}</div>}
      {!session && <form onSubmit={signIn} className="admin-login-form">
        <label>Email address<input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" /></label>
        <label>Password<input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your admin password" /></label>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <button className="primary-btn" disabled={busy}>{busy ? "SIGNING IN…" : "SIGN IN SECURELY"}</button>
      </form>}
      {session && <button className="admin-secondary-btn" onClick={signOut}>Sign out</button>}
      <small>Admin role is verified from the protected database profile. A customer account alone cannot access orders.</small>
    </section>
  </main>;

  return <main className="admin-shell">
    <header className="admin-topbar">
      <a className="admin-brand" href="/"><span>H<span>&</span>H</span><b>HIS & HER MART</b><small>ADMIN</small></a>
      <div className="admin-top-actions"><span>{session.user.email}</span><button onClick={refresh} aria-label="Refresh orders"><RefreshCw size={16}/></button><button onClick={signOut}><LogOut size={16}/> Sign out</button></div>
    </header>
    <div className="admin-content">
      <div className="admin-heading"><div><p className="eyebrow">STORE MANAGEMENT</p><h1>Order dashboard</h1><p>Review incoming orders and update their fulfilment status.</p></div><button className="admin-refresh" onClick={refresh}><RefreshCw size={15}/> Refresh</button></div>
      {error && <div className="admin-alert"><ShieldAlert size={17}/>{error}</div>}
      <section className="admin-stats">
        <article><ClipboardList/><span>Total orders</span><strong>{counts.total}</strong></article>
        <article><Boxes/><span>Awaiting review</span><strong>{counts.pending}</strong></article>
        <article><PackageCheck/><span>Confirmed / Processing</span><strong>{counts.processing}</strong></article>
        <article><Truck/><span>Shipped</span><strong>{counts.shipped}</strong></article>
      </section>
      <section className="admin-orders-card">
        <div className="admin-orders-toolbar"><div><h2>Customer orders</h2><p>Latest 200 orders</p></div><div className="admin-search"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order, name or phone"/></div></div>
        <div className="admin-filters">{["all",...statuses].map(status => <button key={status} className={filter===status?"active":""} onClick={()=>setFilter(status)}>{status==="all"?"All":status}</button>)}</div>
        {visibleOrders.length===0 ? <div className="admin-empty"><ClipboardList size={28}/><b>No orders found</b><span>New customer orders will appear here.</span></div> :
          <div className="admin-table-wrap"><table className="admin-orders-table"><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>
            {visibleOrders.map(order=><tr key={order.id}><td><b>{order.order_number}</b><small>{order.payment_method?.toUpperCase()}</small></td><td>{order.customer_name}<small>{order.customer_phone}</small></td><td>{date(order.created_at)}</td><td>{money(order.total)}</td><td><span className={"order-status status-"+order.order_status}>{order.order_status}</span></td><td><button className="view-order-btn" onClick={()=>{setSelected(order);setAdminNote(order.admin_note||"");}}>View</button></td></tr>)}
          </tbody></table></div>}
      </section>
    </div>
    {selected && <div className="admin-modal-backdrop" onClick={()=>setSelected(null)}><section className="admin-order-modal" onClick={e=>e.stopPropagation()}>
      <div className="admin-modal-head"><div><p className="eyebrow">ORDER DETAILS</p><h2>{selected.order_number}</h2><small>{date(selected.created_at)}</small></div><button onClick={()=>setSelected(null)}>×</button></div>
      <div className="admin-customer-info"><b>{selected.customer_name}</b><span>{selected.customer_phone}</span>{selected.customer_email&&<span>{selected.customer_email}</span>}<p>{selected.shipping_address?.address_line}, {selected.shipping_address?.area}, {selected.shipping_address?.district}</p></div>
      <h3>Items</h3><div className="admin-line-items">{(selected.order_items||[]).map(item=><div key={item.id}><span>{item.product_name} × {item.quantity}</span><b>{money(item.line_total)}</b></div>)}</div>
      <div className="admin-modal-total"><span>Product subtotal</span><b>{money(selected.subtotal)}</b></div>
      <div className="admin-modal-total"><span>Delivery charge</span><b>{selected.delivery_charge?money(selected.delivery_charge):"Not set"}</b></div>
      <div className="admin-modal-total grand"><span>Total</span><b>{money(selected.total)}</b></div>
      <label className="admin-note-field">Internal admin note<textarea rows={2} value={adminNote} onChange={e=>setAdminNote(e.target.value)} placeholder="Private note for store staff"/></label>
      <label className="admin-note-field">Update order status<select value={selected.order_status} onChange={e=>void updateOrder(selected,e.target.value)} disabled={busy}>{statuses.map(status=><option key={status} value={status}>{status.toUpperCase()}</option>)}</select></label>
      <p className="admin-private-hint">Status changes are saved to the protected order record. The customer-facing store confirmation is not sent automatically yet.</p>
    </section></div>}
  </main>;
}
