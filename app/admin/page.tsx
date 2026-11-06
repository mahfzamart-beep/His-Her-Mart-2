"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { ArrowLeft, Boxes, CheckCircle2, ClipboardList, LogOut, PackageCheck, RefreshCw, Search, ShieldAlert, Truck } from "lucide-react";

type OrderItem = { id: string; product_id: string | null; product_name: string; product_sku: string | null; unit_price: number; quantity: number; line_total: number };
type Order = {
  id: string; order_number: string; customer_name: string; customer_phone: string;
  customer_email: string | null; shipping_address: Record<string, string>;
  subtotal: number; delivery_charge: number; total: number; payment_method: string;
  payment_status: string; order_status: string; customer_note: string | null;
  admin_note: string | null; created_at: string; order_items: OrderItem[];
  free_shipping_applied: boolean; free_shipping_eligible_quantity: number;
};
type StoreProduct = { id: string; name: string; slug: string; sku: string | null; description: string | null; price: number; compare_at_price: number | null; stock_quantity: number; image_url: string | null; is_active: boolean; is_featured: boolean; free_shipping_eligible: boolean; fulfillment_source: string; supplier_product_code: string | null; supplier_product_url: string | null; category_id: string | null; category: { name: string }[] };
type StoreCategory = { id: string; name: string };
type ProductFormState = { id: string | null; name: string; sku: string; description: string; price: string; compare_at_price: string; stock_quantity: string; image_url: string; category_id: string; is_active: boolean; is_featured: boolean; fulfillment_source: string; supplier_product_code: string; supplier_product_url: string };
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
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [productEditorOpen, setProductEditorOpen] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>({ id: null, name: "", sku: "", description: "", price: "", compare_at_price: "", stock_quantity: "0", image_url: "", category_id: "", is_active: true, is_featured: false });
  const [productBusy, setProductBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [deliveryCharge, setDeliveryCharge] = useState("0");

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
    const { data: productData, error: productError } = await supabase.from("products").select("id,name,slug,sku,description,price,compare_at_price,stock_quantity,image_url,is_active,is_featured,free_shipping_eligible,fulfillment_source,supplier_product_code,supplier_product_url,category_id,category:categories(name)").order("name", { ascending: true });
    if (productError) setError(productError.message);
    else setProducts((productData || []) as StoreProduct[]);
    const { data: categoryData, error: categoryError } = await supabase.from("categories").select("id,name").eq("is_active", true).order("sort_order", { ascending: true });
    if (categoryError) setError(categoryError.message);
    else setCategories(categoryData || []);
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

  const openNewProduct = () => {
    setError("");
    setProductForm({ id: null, name: "", sku: "", description: "", price: "", compare_at_price: "", stock_quantity: "0", image_url: "", category_id: categories[0]?.id || "", is_active: true, is_featured: false, fulfillment_source: "own_stock", supplier_product_code: "", supplier_product_url: "" });
    setProductEditorOpen(true);
  };

  const openEditProduct = (product: StoreProduct) => {
    setError("");
    setProductForm({ id: product.id, name: product.name, sku: product.sku || "", description: product.description || "", price: String(product.price), compare_at_price: product.compare_at_price == null ? "" : String(product.compare_at_price), stock_quantity: String(product.stock_quantity), image_url: product.image_url || "", category_id: product.category_id || "", is_active: product.is_active, is_featured: product.is_featured, fulfillment_source: product.fulfillment_source || "own_stock", supplier_product_code: product.supplier_product_code || "", supplier_product_url: product.supplier_product_url || "" });
    setProductEditorOpen(true);
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !authorized) return;
    const name = productForm.name.trim();
    const price = Number(productForm.price);
    const stock = Number(productForm.stock_quantity);
    const compareAt = productForm.compare_at_price.trim() ? Number(productForm.compare_at_price) : null;
    if (name.length < 2 || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 || (compareAt !== null && (!Number.isFinite(compareAt) || compareAt < price))) {
      setError("Check the product name, price, stock quantity and compare-at price.");
      return;
    }
    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const slug = `${slugBase || "product"}-${(productForm.id || crypto.randomUUID()).slice(0, 6)}`;
    const payload = { name, slug, sku: productForm.sku.trim() || null, description: productForm.description.trim() || null, price, compare_at_price: compareAt, stock_quantity: stock, image_url: productForm.image_url.trim() || null, category_id: productForm.category_id || null, is_active: productForm.is_active, is_featured: productForm.is_featured, fulfillment_source: productForm.fulfillment_source, supplier_product_code: productForm.supplier_product_code.trim() || null, supplier_product_url: productForm.supplier_product_url.trim() || null, updated_at: new Date().toISOString() };
    setProductBusy(productForm.id || "new");
    setError("");
    const result = productForm.id
      ? await supabase.from("products").update(payload).eq("id", productForm.id)
      : await supabase.from("products").insert(payload);
    if (result.error) setError(result.error.message);
    else {
      setProductEditorOpen(false);
      await refresh();
    }
    setProductBusy(null);
  };

  const toggleFreeShipping = async (product: StoreProduct, eligible: boolean) => {
    if (!supabase || !authorized) return;
    setProductBusy(product.id); setError("");
    const { error } = await supabase.from("products").update({ free_shipping_eligible: eligible, updated_at: new Date().toISOString() }).eq("id", product.id);
    if (error) setError(error.message);
    else setProducts(current => current.map(item => item.id === product.id ? { ...item, free_shipping_eligible: eligible } : item));
    setProductBusy(null);
  };

  const saveDeliveryCharge = async (order: Order) => {
    if (!supabase || !authorized || order.free_shipping_applied) return;
    const amount = Number(deliveryCharge);
    if (!Number.isFinite(amount) || amount < 0 || amount > 100000) { setError("Enter a valid delivery charge between ৳0 and ৳100,000."); return; }
    setBusy(true); setError("");
    const total = Number(order.subtotal) + amount;
    const { error } = await supabase.from("orders").update({ delivery_charge: amount, total, updated_at: new Date().toISOString() }).eq("id", order.id);
    if (error) setError(error.message);
    else {
      setOrders(current => current.map(item => item.id === order.id ? { ...item, delivery_charge: amount, total } : item));
      setSelected(current => current?.id === order.id ? { ...current, delivery_charge: amount, total } : current);
    }
    setBusy(false);
  };

  const saveAdminNote = async (order: Order) => {
    if (!supabase || !authorized) return;
    setBusy(true); setError("");
    const note = adminNote.trim() || null;
    const { error } = await supabase.from("orders").update({ admin_note: note, updated_at: new Date().toISOString() }).eq("id", order.id);
    if (error) setError(error.message);
    else {
      setOrders(current => current.map(item => item.id === order.id ? { ...item, admin_note: note } : item));
      setSelected(current => current?.id === order.id ? { ...current, admin_note: note } : current);
    }
    setBusy(false);
  };

  const updateOrder = async (order: Order, nextStatus: string) => {
    if (!supabase || !authorized) return;
    setBusy(true); setError("");
    const note = adminNote.trim() || null;
    const { error } = await supabase.from("orders").update({
      order_status: nextStatus,
      admin_note: note,
      updated_at: new Date().toISOString(),
    }).eq("id", order.id);
    if (error) setError(error.message);
    else {
      setOrders(current => current.map(item => item.id === order.id ? { ...item, order_status: nextStatus, admin_note: note } : item));
      setSelected(current => current?.id === order.id ? { ...current, order_status: nextStatus, admin_note: note } : current);
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
            {visibleOrders.map(order=><tr key={order.id}><td><b>{order.order_number}</b><small>{order.payment_method?.toUpperCase()}</small></td><td>{order.customer_name}<small>{order.customer_phone}</small></td><td>{date(order.created_at)}</td><td>{money(order.total)}</td><td><span className={"order-status status-"+order.order_status}>{order.order_status}</span></td><td><button className="view-order-btn" onClick={()=>{setSelected(order);setAdminNote(order.admin_note||"");setDeliveryCharge(String(order.delivery_charge||0));}}>View</button></td></tr>)}
          </tbody></table></div>}
      </section>
      <section className="admin-orders-card admin-products-card">
        <div className="admin-orders-toolbar"><div><h2>Product management</h2><p>Add products, update prices and stock, or hide products without deleting order history.</p></div><button className="admin-product-add" onClick={openNewProduct}>+ Add product</button></div>
        <div className="admin-product-list">{products.map(product => <article key={product.id} className="admin-product-row"><div className="admin-product-row-copy"><b>{product.name}</b><small>{product.category?.[0]?.name || "Uncategorised"} · SKU: {product.sku || "—"} · Stock: {product.stock_quantity} · {money(Number(product.price))}</small><span className="admin-product-source">{product.fulfillment_source === "shopbase_bd" ? "Supplier: ShopBase BD" : product.fulfillment_source === "dropshippingbd" ? "Supplier: DropshippingBD" : "Own stock"}{product.supplier_product_code ? ` · Code: ${product.supplier_product_code}` : ""}</span><span className={product.is_active ? "admin-product-live" : "admin-product-inactive"}>{product.is_active ? "Published" : "Hidden"}{product.is_featured ? " · Featured" : ""}</span></div><button className="admin-product-edit" onClick={()=>openEditProduct(product)}>Edit</button></article>)}</div>
      </section>
      <section className="admin-orders-card admin-products-card">
        <div className="admin-orders-toolbar"><div><h2>Free shipping selection</h2><p>Choose exactly which products are included in the 3-item free delivery offer.</p></div></div>
        <div className="admin-free-shipping-info"><b>Offer rule: 3 or more eligible item units = FREE SHIPPING</b><span>Products are OFF by default. Turn on only the products you want to include in this offer. Different eligible products can be combined in one order.</span></div>
        {products.length === 0 ? <div className="admin-empty"><Boxes size={28}/><b>No products found</b><span>Products connected to the store will appear here.</span></div> : <div className="admin-free-shipping-grid">{products.map(product => <article key={product.id} className="admin-free-shipping-product"><div className="admin-free-shipping-product-copy"><b>{product.name}</b><small>{product.category?.[0]?.name || "Uncategorised"} · Stock: {product.stock_quantity} · {money(Number(product.price))}</small><span className={product.is_active ? "admin-product-live" : "admin-product-inactive"}>{product.is_active ? "Published" : "Hidden"}</span></div><label className="admin-toggle"><input type="checkbox" checked={product.free_shipping_eligible} disabled={productBusy === product.id || !product.is_active} onChange={event => void toggleFreeShipping(product, event.target.checked)}/><span>{productBusy === product.id ? "Saving…" : product.free_shipping_eligible ? "Included" : "Not included"}</span></label></article>)}</div>}
      </section>
    </div>
    {productEditorOpen && <div className="admin-modal-backdrop" onClick={()=>setProductEditorOpen(false)}><section className="admin-order-modal admin-product-editor" onClick={e=>e.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">CATALOGUE MANAGEMENT</p><h2>{productForm.id ? "Edit product" : "Add product"}</h2><small>Changes are saved to the live product catalogue.</small></div><button onClick={()=>setProductEditorOpen(false)}>×</button></div><form onSubmit={saveProduct} className="admin-product-form">
      <label>Product name<input required minLength={2} maxLength={140} value={productForm.name} onChange={e=>setProductForm(current=>({...current,name:e.target.value}))} placeholder="e.g. Classic Linen Shirt"/></label>
      <label>Category<select value={productForm.category_id} onChange={e=>setProductForm(current=>({...current,category_id:e.target.value}))}><option value="">Choose category</option>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <div className="admin-product-form-grid">
        <label>Price (BDT)<input required type="number" min="0" step="0.01" value={productForm.price} onChange={e=>setProductForm(current=>({...current,price:e.target.value}))}/></label>
        <label>Compare-at price (BDT)<input type="number" min="0" step="0.01" value={productForm.compare_at_price} onChange={e=>setProductForm(current=>({...current,compare_at_price:e.target.value}))}/></label>
        <label>Stock quantity<input required type="number" min="0" step="1" value={productForm.stock_quantity} onChange={e=>setProductForm(current=>({...current,stock_quantity:e.target.value}))}/></label>
        <label>SKU (optional)<input maxLength={80} value={productForm.sku} onChange={e=>setProductForm(current=>({...current,sku:e.target.value}))} placeholder="Product code"/></label>
      </div>
      <label>Product image URL<input type="url" value={productForm.image_url} onChange={e=>setProductForm(current=>({...current,image_url:e.target.value}))} placeholder="https://…"/></label>
      <label>Fulfilment source<select value={productForm.fulfillment_source} onChange={e=>setProductForm(current=>({...current,fulfillment_source:e.target.value}))}><option value="own_stock">Own stock</option><option value="shopbase_bd">ShopBase BD</option><option value="dropshippingbd">DropshippingBD</option></select></label>
      <div className="admin-product-form-grid"><label>Supplier product code<input maxLength={100} value={productForm.supplier_product_code} onChange={e=>setProductForm(current=>({...current,supplier_product_code:e.target.value}))} placeholder="Supplier item/SKU code"/></label><label>Supplier product URL<input type="url" value={productForm.supplier_product_url} onChange={e=>setProductForm(current=>({...current,supplier_product_url:e.target.value}))} placeholder="https://supplier-product-page…"/></label></div>
      <label>Description<textarea rows={3} maxLength={5000} value={productForm.description} onChange={e=>setProductForm(current=>({...current,description:e.target.value}))} placeholder="Product details and features"/></label>
      <div className="admin-product-flags"><label><input type="checkbox" checked={productForm.is_active} onChange={e=>setProductForm(current=>({...current,is_active:e.target.checked}))}/> Publish product</label><label><input type="checkbox" checked={productForm.is_featured} onChange={e=>setProductForm(current=>({...current,is_featured:e.target.checked}))}/> Featured product</label></div>
      {error&&<p className="admin-error" role="alert">{error}</p>}
      <div className="admin-product-form-actions"><button type="button" className="admin-secondary-btn" onClick={()=>setProductEditorOpen(false)}>Cancel</button><button type="submit" className="admin-product-add" disabled={!!productBusy}>{productBusy ? "Saving…" : productForm.id ? "Save changes" : "Create product"}</button></div>
    </form></section></div>}
    {selected && <div className="admin-modal-backdrop" onClick={()=>setSelected(null)}><section className="admin-order-modal" onClick={e=>e.stopPropagation()}>
      <div className="admin-modal-head"><div><p className="eyebrow">ORDER DETAILS</p><h2>{selected.order_number}</h2><small>{date(selected.created_at)}</small></div><button onClick={()=>setSelected(null)}>×</button></div>
      <div className="admin-customer-info"><b>{selected.customer_name}</b><span>{selected.customer_phone}</span>{selected.customer_email&&<span>{selected.customer_email}</span>}<p>{selected.shipping_address?.address_line}, {selected.shipping_address?.area}, {selected.shipping_address?.district}</p></div>
      <h3>Items</h3><div className="admin-line-items">{(selected.order_items||[]).map(item=><div key={item.id}><span>{item.product_name} × {item.quantity}{products.find(product=>product.id===item.product_id)?.fulfillment_source === "shopbase_bd" ? <small className="admin-item-supplier">Fulfil via ShopBase BD{products.find(product=>product.id===item.product_id)?.supplier_product_code ? ` · ${products.find(product=>product.id===item.product_id)?.supplier_product_code}` : ""}</small> : products.find(product=>product.id===item.product_id)?.fulfillment_source === "dropshippingbd" ? <small className="admin-item-supplier">Fulfil via DropshippingBD{products.find(product=>product.id===item.product_id)?.supplier_product_code ? ` · ${products.find(product=>product.id===item.product_id)?.supplier_product_code}` : ""}</small> : null}</span><b>{money(item.line_total)}</b></div>)}</div>
      <div className="admin-modal-total"><span>Product subtotal</span><b>{money(selected.subtotal)}</b></div>
      <div className="admin-modal-total"><span>Delivery charge</span><b>{selected.free_shipping_applied ? "FREE" : selected.delivery_charge ? money(selected.delivery_charge) : "Awaiting confirmation"}</b></div>
      <div className="admin-modal-total"><span>Free shipping</span><b>{selected.free_shipping_applied ? `Applied (${selected.free_shipping_eligible_quantity} eligible items)` : "Not applied"}</b></div>
      <div className="admin-modal-total grand"><span>Total</span><b>{money(selected.total)}</b></div>
      <label className="admin-note-field">Delivery charge (BDT)<input type="number" min="0" max="100000" step="1" value={deliveryCharge} onChange={e=>setDeliveryCharge(e.target.value)} disabled={selected.free_shipping_applied}/></label>
      <button className="admin-save-note" onClick={()=>void saveDeliveryCharge(selected)} disabled={busy || selected.free_shipping_applied}>{selected.free_shipping_applied ? "Free shipping — no delivery fee" : "Save delivery charge and update total"}</button>
      <label className="admin-note-field">Internal admin note<textarea rows={2} value={adminNote} onChange={e=>setAdminNote(e.target.value)} placeholder="Private note for store staff"/></label><button className="admin-save-note" onClick={()=>void saveAdminNote(selected)} disabled={busy}>Save internal note</button>
      <label className="admin-note-field">Update order status<select value={selected.order_status} onChange={e=>void updateOrder(selected,e.target.value)} disabled={busy}>{statuses.map(status=><option key={status} value={status}>{status.toUpperCase()}</option>)}</select></label>
      <p className="admin-private-hint">Status changes are saved to the protected order record. The customer-facing store confirmation is not sent automatically yet.</p>
    </section></div>}
  </main>;
}
