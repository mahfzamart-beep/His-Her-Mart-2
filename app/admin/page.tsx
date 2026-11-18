"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { ArrowLeft, Boxes, CheckCircle2, ClipboardList, LogOut, PackageCheck, RefreshCw, Search, ShieldAlert, Trash2, Truck } from "lucide-react";
import AdminProductImport from "../../components/AdminProductImport";
import AdminControlCenter from "../../components/AdminControlCenter";
import CloudMomosAdmin from "../../components/CloudMomosAdmin";

type OrderItem = { id: string; product_id: string | null; product_name: string; product_sku: string | null; unit_price: number; quantity: number; line_total: number; fulfillment_source: string; supplier_product_code: string | null; supplier_product_url: string | null };
type Order = {
  id: string; order_number: string; customer_name: string; customer_phone: string;
  customer_email: string | null; shipping_address: Record<string, string>;
  subtotal: number; delivery_charge: number; total: number; payment_method: string;
  payment_status: string; order_status: string; customer_note: string | null;
  admin_note: string | null; created_at: string; order_items: OrderItem[];
  free_shipping_applied: boolean; free_shipping_eligible_quantity: number;
};
type StoreProduct = { id: string; name: string; slug: string; sku: string | null; description: string | null; price: number; compare_at_price: number | null; stock_quantity: number; image_url: string | null; images: string[] | null; is_active: boolean; is_featured: boolean; free_shipping_eligible: boolean; fulfillment_source: string; supplier_product_code: string | null; supplier_product_url: string | null; category_id: string | null; category: { name: string }[] };
type StoreCategory = { id: string; name: string; slug: string; description: string | null; image_url: string | null; sort_order: number; is_active: boolean };
type CategoryFormState = { id: string | null; name: string; description: string; image_url: string; sort_order: string; is_active: boolean };
type ProductFormState = { id: string | null; name: string; sku: string; description: string; price: string; compare_at_price: string; stock_quantity: string; image_url: string; images: string[]; category_id: string; is_active: boolean; is_featured: boolean };
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
  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({ id: null, name: "", description: "", image_url: "", sort_order: "0", is_active: true });
  const [productEditorOpen, setProductEditorOpen] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>({ id: null, name: "", sku: "", description: "", price: "", compare_at_price: "", stock_quantity: "0", image_url: "", images: [], category_id: "", is_active: true, is_featured: false });
  const [productBusy, setProductBusy] = useState<string | null>(null);
  const [productNotice, setProductNotice] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
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
    const { data: productData, error: productError } = await supabase.from("products").select("id,name,slug,sku,description,price,compare_at_price,stock_quantity,image_url,images,is_active,is_featured,free_shipping_eligible,fulfillment_source,supplier_product_code,supplier_product_url,category_id,category:categories(name)").order("name", { ascending: true });
    if (productError) setError(productError.message);
    else setProducts((productData || []) as StoreProduct[]);
    const { data: categoryData, error: categoryError } = await supabase.from("categories").select("id,name,slug,description,image_url,sort_order,is_active").order("sort_order", { ascending: true });
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

  const openNewCategory = () => {
    setError("");
    setCategoryForm({ id: null, name: "", description: "", image_url: "", sort_order: String(categories.length), is_active: true });
    setCategoryEditorOpen(true);
  };

  const openEditCategory = (category: StoreCategory) => {
    setError("");
    setCategoryForm({ id: category.id, name: category.name, description: category.description || "", image_url: category.image_url || "", sort_order: String(category.sort_order), is_active: category.is_active });
    setCategoryEditorOpen(true);
  };

  const saveCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !authorized) return;
    const name = categoryForm.name.trim();
    const sortOrder = Number(categoryForm.sort_order);
    if (name.length < 2 || name.length > 80 || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) {
      setError("Enter a valid category name and a whole-number sort order.");
      return;
    }
    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const slug = `${slugBase || "category"}-${(categoryForm.id || crypto.randomUUID()).slice(0, 6)}`;
    setBusy(true); setError("");
    const payload = { name, slug, description: categoryForm.description.trim() || null, image_url: categoryForm.image_url.trim() || null, sort_order: sortOrder, is_active: categoryForm.is_active };
    const result = categoryForm.id
      ? await supabase.from("categories").update(payload).eq("id", categoryForm.id)
      : await supabase.from("categories").insert(payload);
    if (result.error) setError(result.error.message);
    else { setCategoryEditorOpen(false); await refresh(); }
    setBusy(false);
  };

  const openNewProduct = () => {
    setError("");
    setProductForm({ id: null, name: "", sku: "", description: "", price: "", compare_at_price: "", stock_quantity: "0", image_url: "", images: [], category_id: categories[0]?.id || "", is_active: true, is_featured: false });
    setProductEditorOpen(true);
  };

  const openEditProduct = (product: StoreProduct) => {
    setError("");
    setProductForm({ id: product.id, name: product.name, sku: product.sku || "", description: product.description || "", price: String(product.price), compare_at_price: product.compare_at_price == null ? "" : String(product.compare_at_price), stock_quantity: String(product.stock_quantity), image_url: product.image_url || "", images: Array.from(new Set([...(Array.isArray(product.images) ? product.images : []), ...(product.image_url ? [product.image_url] : [])])).slice(0, 12), category_id: product.category_id || "", is_active: product.is_active, is_featured: product.is_featured });
    setProductEditorOpen(true);
  };

  const uploadProductImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length || !supabase || !authorized) return;
    const remaining = Math.max(0, 12 - productForm.images.length);
    if (!remaining) { setError("A product can have up to 12 images."); return; }
    if (files.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) { setError("Use JPG, PNG or WebP images only."); return; }
    if (files.some(file => file.size > 5 * 1024 * 1024)) { setError("Each product image must be 5 MB or smaller."); return; }
    if (files.length > remaining) { setError(`You can add only ${remaining} more image(s). The limit is 12 per product.`); return; }
    setImageUploading(true); setError("");
    const uploadedUrls: string[] = [];
    for (const file of files) {
      const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const path = "products/" + crypto.randomUUID() + "." + ext;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });
      if (uploadError) { setError(uploadError.message); break; }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      uploadedUrls.push(data.publicUrl);
    }
    if (uploadedUrls.length) {
      setProductForm(current => {
        const images = Array.from(new Set([...current.images, ...uploadedUrls])).slice(0, 12);
        return { ...current, images, image_url: current.image_url || images[0] || "" };
      });
    }
    setImageUploading(false);
  };

  const removeProductImage = (url: string) => {
    setProductForm(current => {
      const images = current.images.filter(image => image !== url);
      return { ...current, images, image_url: current.image_url === url ? (images[0] || "") : current.image_url };
    });
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !authorized) return;
    const name = productForm.name.trim();
    const price = Number(productForm.price);
    const stock = Number(productForm.stock_quantity);
    const compareAt = productForm.compare_at_price.trim() ? Number(productForm.compare_at_price) : null;
    const imageUrls = Array.from(new Set([productForm.image_url.trim(), ...productForm.images].filter(Boolean))).slice(0, 12);
    if (name.length < 2 || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 || (compareAt !== null && (!Number.isFinite(compareAt) || compareAt < price))) {
      setError("Check the product name, price, stock quantity and compare-at price.");
      return;
    }
    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const slug = `${slugBase || "product"}-${(productForm.id || crypto.randomUUID()).slice(0, 6)}`;
    const payload = { name, slug, sku: productForm.sku.trim() || null, description: productForm.description.trim() || null, price, compare_at_price: compareAt, stock_quantity: stock, image_url: imageUrls[0] || null, images: imageUrls, size_type: "none", size_options: [], color_options: [], category_id: productForm.category_id || null, is_active: productForm.is_active, is_featured: productForm.is_featured, fulfillment_source: "own_stock", supplier_product_code: null, supplier_product_url: null, updated_at: new Date().toISOString() };
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

  const deleteProduct = async (product: StoreProduct) => {
    if (!supabase || !authorized || productBusy) return;
    setProductBusy(product.id);
    setError("");
    setProductNotice("");

    const { count, error: historyError } = await supabase
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", product.id);

    if (historyError) {
      setError("Could not verify this product's order history. Nothing was deleted. " + historyError.message);
      setProductBusy(null);
      return;
    }

    const historyWarning = (count || 0) > 0
      ? `\n\nThis product is linked to ${count} saved order item(s). Their saved product name, SKU, price and quantity will remain in order history.`
      : "";
    const confirmed = window.confirm(
      `Permanently remove "${product.name}" from the Cloud Momos menu?${historyWarning}\\n\\nThis menu item will no longer be available to customers. This action cannot be undone.`
    );

    if (!confirmed) {
      setProductBusy(null);
      return;
    }

    const { data, error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id)
      .select("id");

    if (deleteError) {
      setError("Product could not be deleted. " + deleteError.message);
    } else if (!data || data.length === 0) {
      setError("No product was deleted. Please refresh and confirm that your admin account still has permission.");
    } else {
      setProducts(current => current.filter(item => item.id !== product.id));
      if (productForm.id === product.id) setProductEditorOpen(false);
      setProductNotice(`"${product.name}" was deleted from the catalogue.`);
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

  const exportVisibleOrders = () => {
    if (!authorized || visibleOrders.length === 0) return;
    const headers = [
      "Order Number", "Created At", "Customer Name", "Phone", "Email",
      "District", "Area", "Address", "Items", "Subtotal (BDT)",
      "Delivery Charge (BDT)", "Total (BDT)", "Payment Method",
      "Payment Status", "Order Status"
    ];
    const rows = visibleOrders.map(order => [
      order.order_number,
      order.created_at,
      order.customer_name,
      order.customer_phone,
      order.customer_email || "",
      order.shipping_address?.district || "",
      order.shipping_address?.area || "",
      order.shipping_address?.address_line || "",
      (order.order_items || []).map(item => `${item.product_name} x${item.quantity}`).join("; "),
      Number(order.subtotal || 0).toFixed(2),
      Number(order.delivery_charge || 0).toFixed(2),
      Number(order.total || 0).toFixed(2),
      order.payment_method,
      order.payment_status,
      order.order_status,
    ]);
    const cell = (value: unknown) => {
      let text = value == null ? "" : String(value).replace(/[\\r\\n]+/g, " ");
      if (/^\\s*[=+@-]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const csv = [headers, ...rows].map(row => row.map(cell).join(",")).join("\\r\\n");
    const blob = new Blob(["\\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cloud-momos-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const counts = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.order_status === "pending").length,
    processing: orders.filter(o => ["confirmed", "processing"].includes(o.order_status)).length,
    shipped: orders.filter(o => o.order_status === "shipped").length,
  }), [orders]);

  const changeProductCategory = (categoryId: string) => {
    setProductForm(current => ({ ...current, category_id: categoryId }));
  };

  if (checking) return <main className="admin-shell"><div className="admin-loading"><RefreshCw className="spin" /> Checking secure admin access…</div></main>;

  if (!session || !authorized) return <main className="admin-shell admin-login-shell">
    <a className="admin-back" href="/"><ArrowLeft size={15} /> Back to menu</a>
    <section className="admin-login-card">
      <img className="admin-brand-mark" src="/app-icon-v3.svg" alt="Cloud Momos" />
      <p className="eyebrow">CLOUD MOMOS · OWNER ACCESS</p>
      <h1>Admin sign in</h1>
      <p className="admin-muted">Secure access for authorised store administrators only.</p>
      {session && !authorized && <div className="admin-alert"><ShieldAlert size={17} /> {error || "This account is not an administrator."}</div>}
      {!session && <p className="admin-forgot-link"><Link href="/admin/reset-password">Forgot password?</Link></p>}
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
      <a className="admin-brand" href="/"><img className="admin-brand-icon" src="/app-icon-v3.svg" alt="" /><b>CLOUD MOMOS</b><small>KITCHEN</small></a>
      <div className="admin-top-actions"><span>{session.user.email}</span><button onClick={refresh} aria-label="Refresh orders"><RefreshCw size={16}/></button><button onClick={signOut}><LogOut size={16}/> Sign out</button></div>
    </header>
    <nav className="admin-quick-nav" aria-label="Admin section shortcuts">
      <a href="#business-operations">Overview</a>
      <a href="#delivery-and-ads">Delivery & Ads</a>
      <a href="#orders">Orders</a>
      <a href="#products">Products</a>
      <a href="#categories">Categories</a>
          </nav>
    <div className="admin-content">
      <AdminControlCenter actorId={session.user.id} />
      <CloudMomosAdmin />
      <div className="admin-heading"><div><p className="eyebrow">CLOUD MOMOS · KITCHEN OPERATIONS</p><h1>Kitchen & order dashboard</h1><p>Manage momo orders, kitchen stock, menu items and customer deliveries.</p></div><button className="admin-refresh" onClick={refresh}><RefreshCw size={15}/> Refresh</button></div>
      {error && <div className="admin-alert"><ShieldAlert size={17}/>{error}</div>}
      <section className="admin-stats">
        <article><ClipboardList/><span>Total orders</span><strong>{counts.total}</strong></article>
        <article><Boxes/><span>Awaiting review</span><strong>{counts.pending}</strong></article>
        <article><PackageCheck/><span>Confirmed / Processing</span><strong>{counts.processing}</strong></article>
        <article><Truck/><span>Shipped</span><strong>{counts.shipped}</strong></article>
      </section>
      <section className="admin-orders-card" id="orders">
        <div className="admin-orders-toolbar"><div><h2>Customer orders</h2><p>Latest 200 orders · Export respects your current filters</p></div><div className="admin-order-tools"><button type="button" className="admin-export-btn" onClick={exportVisibleOrders} disabled={visibleOrders.length===0}>Export CSV ({visibleOrders.length})</button><div className="admin-search"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order, name or phone"/></div></div></div>
        <div className="admin-filters">{["all",...statuses].map(status => <button key={status} className={filter===status?"active":""} onClick={()=>setFilter(status)}>{status==="all"?"All":status}</button>)}</div>
        {visibleOrders.length===0 ? <div className="admin-empty"><ClipboardList size={28}/><b>No orders found</b><span>New customer orders will appear here.</span></div> :
          <div className="admin-table-wrap"><table className="admin-orders-table"><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>
            {visibleOrders.map(order=><tr key={order.id}><td><b>{order.order_number}</b><small>{order.payment_method?.toUpperCase()}</small></td><td>{order.customer_name}<small>{order.customer_phone}</small></td><td>{date(order.created_at)}</td><td>{money(order.total)}</td><td><span className={"order-status status-"+order.order_status}>{order.order_status}</span></td><td><button className="view-order-btn" onClick={()=>{setSelected(order);setAdminNote(order.admin_note||"");setDeliveryCharge(String(order.delivery_charge||0));}}>View</button></td></tr>)}
          </tbody></table></div>}
      </section>
      <section className="admin-orders-card admin-products-card" id="products">
        <div className="admin-orders-toolbar"><div><h2>Momo menu management</h2><p>Add momo menu items, update box prices and kitchen stock, or hide items without deleting order history.</p></div><button className="admin-product-add" onClick={openNewProduct}>+ Add menu item</button></div>
        {productNotice && <p className="admin-product-success" role="status">{productNotice}</p>}
        <div className="admin-product-list">{products.map(product => <article key={product.id} className="admin-product-row"><div className="admin-product-row-copy"><b>{product.name}</b><small>{product.category?.[0]?.name || "Uncategorised"} · SKU: {product.sku || "—"} · Boxes in stock: {product.stock_quantity} · {money(Number(product.price))}</small><span className={product.is_active ? "admin-product-live" : "admin-product-inactive"}>{product.is_active ? "Published" : "Hidden"}{product.is_featured ? " · Featured" : ""}</span></div><div className="admin-product-row-actions"><button className="admin-product-edit" disabled={!!productBusy} onClick={()=>openEditProduct(product)}>Edit</button><button className="admin-product-delete" disabled={!!productBusy} onClick={()=>void deleteProduct(product)} title={`Delete ${product.name}`}><Trash2 size={13}/>{productBusy === product.id ? "Deleting…" : "Delete"}</button></div></article>)}</div>
        <AdminProductImport categories={categories} onImported={refresh} />
      </section>
      <section className="admin-orders-card admin-products-card" id="categories">
        <div className="admin-orders-toolbar"><div><h2>Menu category management</h2><p>Create categories and control their storefront visibility and display order.</p></div><button className="admin-product-add" onClick={openNewCategory}>+ Add menu category</button></div>
        <div className="admin-product-list">{categories.map(category=><article key={category.id} className="admin-product-row"><div className="admin-product-row-copy"><b>{category.name}</b><small>Menu display order: {category.sort_order}</small><span className={category.is_active ? "admin-product-live" : "admin-product-inactive"}>{category.is_active ? "Visible on storefront" : "Hidden from storefront"}</span></div><button className="admin-product-edit" onClick={()=>openEditCategory(category)}>Edit</button></article>)}</div>
      </section>
    {categoryEditorOpen && <div className="admin-modal-backdrop" onClick={()=>setCategoryEditorOpen(false)}><section className="admin-order-modal admin-product-editor" onClick={e=>e.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">MOMO MENU CATEGORIES</p><h2>{categoryForm.id ? "Edit category" : "Add category"}</h2><small>Hidden categories stay attached to existing products.</small></div><button onClick={()=>setCategoryEditorOpen(false)}>×</button></div><form onSubmit={saveCategory} className="admin-product-form"><label>Category name<input required minLength={2} maxLength={80} value={categoryForm.name} onChange={e=>setCategoryForm(current=>({...current,name:e.target.value}))} placeholder="e.g. Chicken Momos"/></label><label>Description<textarea rows={3} maxLength={1000} value={categoryForm.description} onChange={e=>setCategoryForm(current=>({...current,description:e.target.value}))} placeholder="Short category description"/></label><label>Category image URL<input type="url" value={categoryForm.image_url} onChange={e=>setCategoryForm(current=>({...current,image_url:e.target.value}))} placeholder="https://…"/></label><div className="admin-product-form-grid"><label>Display order<input type="number" min="0" max="10000" step="1" value={categoryForm.sort_order} onChange={e=>setCategoryForm(current=>({...current,sort_order:e.target.value}))}/></label><label className="admin-category-visible"><span>Visible on storefront</span><input type="checkbox" checked={categoryForm.is_active} onChange={e=>setCategoryForm(current=>({...current,is_active:e.target.checked}))}/></label></div>{error&&<p className="admin-error" role="alert">{error}</p>}<div className="admin-product-form-actions"><button type="button" className="admin-secondary-btn" onClick={()=>setCategoryEditorOpen(false)}>Cancel</button><button type="submit" className="admin-product-add" disabled={busy}>{busy ? "Saving…" : categoryForm.id ? "Save category" : "Create category"}</button></div></form></section></div>}
    {productEditorOpen && <div className="admin-modal-backdrop" onClick={()=>setProductEditorOpen(false)}><section className="admin-order-modal admin-product-editor" onClick={e=>e.stopPropagation()}><div className="admin-modal-head"><div><p className="eyebrow">CLOUD MOMOS · MENU MANAGEMENT</p><h2>{productForm.id ? "Edit menu item" : "Add menu item"}</h2><small>Changes are saved to the live momo menu.</small></div><button onClick={()=>setProductEditorOpen(false)}>×</button></div><form onSubmit={saveProduct} className="admin-product-form">
      <label>Product name<input required minLength={2} maxLength={140} value={productForm.name} onChange={e=>setProductForm(current=>({...current,name:e.target.value}))} placeholder="e.g. Chicken Cheese Momos"/></label>
      <label>Menu category<select value={productForm.category_id} onChange={e=>changeProductCategory(e.target.value)}><option value="">Choose a menu category</option>{categories.filter(category=>category.is_active).map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <div className="admin-product-form-grid">
        <label>Price (BDT)<input required type="number" min="0" step="0.01" value={productForm.price} onChange={e=>setProductForm(current=>({...current,price:e.target.value}))}/></label>
        <label>Compare-at price (BDT)<input type="number" min="0" step="0.01" value={productForm.compare_at_price} onChange={e=>setProductForm(current=>({...current,compare_at_price:e.target.value}))}/></label>
        <label>Kitchen stock (boxes)<input required type="number" min="0" step="1" value={productForm.stock_quantity} onChange={e=>setProductForm(current=>({...current,stock_quantity:e.target.value}))}/></label>
        <label>SKU (optional)<input maxLength={80} value={productForm.sku} onChange={e=>setProductForm(current=>({...current,sku:e.target.value}))} placeholder="Product code"/></label>
      </div>
      <label>Primary product image URL<input type="url" value={productForm.image_url} onChange={e=>setProductForm(current=>({...current,image_url:e.target.value}))} placeholder="https://…"/></label>
      <label className="admin-image-upload">Upload product images<input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={imageUploading || productForm.images.length >= 12} onChange={uploadProductImages}/><small>{imageUploading ? "Uploading images…" : `JPG, PNG or WebP · maximum 5 MB each · up to 12 images total. ${productForm.images.length}/12 added.`}</small></label>
      {productForm.images.length > 0 && <div className="admin-image-gallery" aria-label="Product image previews">{productForm.images.map((url,index)=><div className="admin-image-preview" key={url}><img src={url} alt={`Product image ${index+1}`}/><span>{index===0 ? "Primary" : `Image ${index+1}`}</span><button type="button" onClick={()=>removeProductImage(url)} aria-label={`Remove image ${index+1}`}>×</button></div>)}</div>}
      <div className="admin-food-product-note"><b>Food menu item</b><small>Customers order by box quantity. Each box contains 6 pieces.</small></div>
      <label>Description<textarea rows={3} maxLength={5000} value={productForm.description} onChange={e=>setProductForm(current=>({...current,description:e.target.value}))} placeholder="Ingredients, filling and preparation details"/></label>
      <div className="admin-product-flags"><label><input type="checkbox" checked={productForm.is_active} onChange={e=>setProductForm(current=>({...current,is_active:e.target.checked}))}/> Publish product</label><label><input type="checkbox" checked={productForm.is_featured} onChange={e=>setProductForm(current=>({...current,is_featured:e.target.checked}))}/> Featured product</label></div>
      {error&&<p className="admin-error" role="alert">{error}</p>}
      <div className="admin-product-form-actions"><button type="button" className="admin-secondary-btn" onClick={()=>setProductEditorOpen(false)}>Cancel</button><button type="submit" className="admin-product-add" disabled={!!productBusy}>{productBusy ? "Saving…" : productForm.id ? "Save changes" : "Create product"}</button></div>
    </form></section></div>}
    {selected && <div className="admin-modal-backdrop" onClick={()=>setSelected(null)}><section className="admin-order-modal" onClick={e=>e.stopPropagation()}>
      <div className="admin-modal-head"><div><p className="eyebrow">MOMO ORDER DETAILS</p><h2>{selected.order_number}</h2><small>{date(selected.created_at)}</small></div><button onClick={()=>setSelected(null)}>×</button></div>
      <div className="admin-customer-info"><b>{selected.customer_name}</b><span>{selected.customer_phone}</span>{selected.customer_email&&<span>{selected.customer_email}</span>}<p>{selected.shipping_address?.address_line}, {selected.shipping_address?.area}, {selected.shipping_address?.district}</p></div>
      <h3>Menu items</h3><div className="admin-line-items">{(selected.order_items||[]).map(item=><div key={item.id}><span>{item.product_name} × {item.quantity}</span><b>{money(item.line_total)}</b></div>)}</div>
      <div className="admin-modal-total"><span>Momo subtotal</span><b>{money(selected.subtotal)}</b></div>
      <div className="admin-modal-total"><span>Delivery charge</span><b>{selected.free_shipping_applied ? "FREE" : selected.delivery_charge ? money(selected.delivery_charge) : "Awaiting confirmation"}</b></div>
      
      <div className="admin-modal-total grand"><span>Total</span><b>{money(selected.total)}</b></div>
      <label className="admin-note-field">Delivery charge (BDT)<input type="number" min="0" max="100000" step="1" value={deliveryCharge} onChange={e=>setDeliveryCharge(e.target.value)} disabled={selected.free_shipping_applied}/></label>
      <button className="admin-save-note" onClick={()=>void saveDeliveryCharge(selected)} disabled={busy || selected.free_shipping_applied}>{selected.free_shipping_applied ? "Free shipping — no delivery fee" : "Save delivery charge and update total"}</button>
      <label className="admin-note-field">Internal admin note<textarea rows={2} value={adminNote} onChange={e=>setAdminNote(e.target.value)} placeholder="Private note for store staff"/></label><button className="admin-save-note" onClick={()=>void saveAdminNote(selected)} disabled={busy}>Save internal note</button>
      <label className="admin-note-field">Update order status<select value={selected.order_status} onChange={e=>void updateOrder(selected,e.target.value)} disabled={busy}>{statuses.map(status=><option key={status} value={status}>{status.toUpperCase()}</option>)}</select></label>
      <p className="admin-private-hint">Status changes are saved to the protected order record. The customer-facing store confirmation is not sent automatically yet.</p>
    </section></div>}
    </div>
  </main>;
}
