"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity, AlertTriangle, ArrowDownToLine, BarChart3, Bike, Boxes, Check,
  CheckCircle2, ChevronDown, ClipboardList, Download, FileText, IndianRupee,
  Package, PackageCheck, Plus, RefreshCw, Search, ShieldCheck, ShoppingBag,
  Truck, Users, Wallet, Warehouse
} from "lucide-react";
import { supabase } from "../lib/supabase";

type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  fulfillment_source: string;
  supplier_id: string | null;
  supplier_cost_snapshot: number | null;
  supplier_order_reference: string | null;
  supplier_fulfillment_status: string;
};
type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  shipping_address: Record<string, string>;
  subtotal: number;
  delivery_charge: number;
  discount: number;
  total: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  created_at: string;
  updated_at: string;
  courier_partner: string | null;
  courier_tracking_number: string | null;
  courier_status_note: string | null;
  handed_over_at: string | null;
  delivered_at: string | null;
  order_items: OrderItem[];
};
type Product = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  stock_quantity: number;
  supplier_cost_price: number | null;
  supplier_id: string | null;
  fulfillment_source: string;
  is_active: boolean;
};
type Supplier = {
  id: string;
  name: string;
  platform_code: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  notes: string | null;
  is_active: boolean;
};
type Expense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  incurred_on: string;
  supplier_id: string | null;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  supplier?: { name: string } | null;
};
type ActivityRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  created_at: string;
};
type Tab = "overview" | "orders" | "inventory" | "suppliers" | "customers" | "finance" | "activity";

const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];
const SUPPLIER_STATUSES = ["not_submitted", "submitted", "confirmed", "packed", "shipped", "delivered", "cancelled"];
const EXPENSE_CATEGORIES = ["packaging", "marketing", "courier", "refund", "operations", "software", "supplier", "other"];
const money = (value: number) => new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(Number(value || 0));
const shortDate = (value: string) => new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(new Date(value));
const fullDate = (value: string) => new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] || character));
const csvCell = (value: unknown) => {
  let text = String(value ?? "").replace(/[\r\n]+/g, " ");
  if (/^\s*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
};

export default function AdminControlCenter({ actorId }: { actorId: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [period, setPeriod] = useState<"7" | "30" | "all">("7");
  const [stockThreshold, setStockThreshold] = useState("5");
  const [orderSearch, setOrderSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("confirmed");
  const [inventoryDrafts, setInventoryDrafts] = useState<Record<string, { stock: string; cost: string; supplier: string }>>({});
  const [supplierDraft, setSupplierDraft] = useState({ name: "", platform_code: "", contact_person: "", phone: "", email: "", website_url: "", notes: "" });
  const [expenseDraft, setExpenseDraft] = useState({ category: "operations", description: "", amount: "", incurred_on: new Date().toISOString().slice(0, 10), supplier_id: "", payment_method: "cash", reference: "", notes: "" });
  const [courierDraft, setCourierDraft] = useState({ courier_partner: "", courier_tracking_number: "", courier_status_note: "", order_status: "pending", payment_status: "pending" });

  const refresh = useCallback(async () => {
    if (!supabase) { setError("Supabase is not configured."); setLoading(false); return; }
    setLoading(true);
    setError("");
    const [orderResult, productResult, supplierResult, expenseResult, activityResult] = await Promise.all([
      supabase.from("orders").select("id,order_number,customer_name,customer_phone,customer_email,shipping_address,subtotal,delivery_charge,discount,total,payment_method,payment_status,order_status,created_at,updated_at,courier_partner,courier_tracking_number,courier_status_note,handed_over_at,delivered_at,order_items(id,product_id,product_name,unit_price,quantity,line_total,fulfillment_source,supplier_id,supplier_cost_snapshot,supplier_order_reference,supplier_fulfillment_status)").order("created_at", { ascending: false }).limit(500),
      supabase.from("products").select("id,name,sku,price,stock_quantity,supplier_cost_price,supplier_id,fulfillment_source,is_active").order("name", { ascending: true }).limit(1000),
      supabase.from("suppliers").select("id,name,platform_code,contact_person,phone,email,website_url,notes,is_active").order("name", { ascending: true }),
      supabase.from("operating_expenses").select("id,category,description,amount,incurred_on,supplier_id,payment_method,reference,notes,supplier:suppliers(name)").order("incurred_on", { ascending: false }).limit(500),
      supabase.from("admin_activity_log").select("id,action,entity_type,entity_id,summary,created_at").order("created_at", { ascending: false }).limit(100)
    ]);
    const failures = [orderResult.error, productResult.error, supplierResult.error, expenseResult.error, activityResult.error].filter(Boolean);
    if (orderResult.data) setOrders(orderResult.data as unknown as Order[]);
    if (productResult.data) {
      const next = productResult.data as Product[];
      setProducts(next);
      setInventoryDrafts(current => {
        const drafts = { ...current };
        next.forEach(product => {
          if (!drafts[product.id]) drafts[product.id] = { stock: String(product.stock_quantity), cost: product.supplier_cost_price == null ? "" : String(product.supplier_cost_price), supplier: product.supplier_id || "" };
        });
        return drafts;
      });
    }
    if (supplierResult.data) setSuppliers(supplierResult.data as Supplier[]);
    if (expenseResult.data) setExpenses(expenseResult.data as unknown as Expense[]);
    if (activityResult.data) setActivity(activityResult.data as ActivityRow[]);
    if (failures.length) setError(failures.map(item => item?.message).join(" · "));
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const log = async (action: string, entityType: string, entityId: string | null, summary: string, metadata: Record<string, unknown> = {}) => {
    if (!supabase) return;
    const { error: logError } = await supabase.from("admin_activity_log").insert({
      actor_id: actorId, action, entity_type: entityType, entity_id: entityId, summary, metadata
    });
    if (logError) setError("Action saved, but activity log could not be written: " + logError.message);
  };

  const rangeOrders = useMemo(() => {
    if (period === "all") return orders;
    const days = Number(period);
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    since.setHours(0, 0, 0, 0);
    return orders.filter(order => new Date(order.created_at) >= since);
  }, [orders, period]);

  const deliveredOrders = useMemo(() => rangeOrders.filter(order => order.order_status === "delivered"), [rangeOrders]);
  const pendingCount = orders.filter(order => order.order_status === "pending").length;
  const processingCount = orders.filter(order => ["confirmed", "processing"].includes(order.order_status)).length;
  const shippedCount = orders.filter(order => order.order_status === "shipped").length;
  const deliveredRevenue = deliveredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const lowStockProducts = products.filter(product => product.is_active && product.stock_quantity <= Math.max(0, Number(stockThreshold) || 0));
  const outOfStock = products.filter(product => product.is_active && product.stock_quantity <= 0);
  const activeProducts = products.filter(product => product.is_active).length;
  const inventoryValue = products.reduce((sum, product) => sum + (product.supplier_cost_price == null ? 0 : Number(product.supplier_cost_price) * Number(product.stock_quantity)), 0);

  const profitData = useMemo(() => {
    const productById = new Map(products.map(product => [product.id, product]));
    let revenue = 0;
    let knownCost = 0;
    let knownLines = 0;
    let missingLines = 0;
    for (const order of deliveredOrders) {
      revenue += Math.max(0, Number(order.subtotal || 0) - Number(order.discount || 0));
      for (const item of order.order_items || []) {
        const currentCost = item.product_id ? productById.get(item.product_id)?.supplier_cost_price : null;
        const snapshot = item.supplier_cost_snapshot;
        const unitCost = snapshot != null ? Number(snapshot) : currentCost != null ? Number(currentCost) : null;
        if (unitCost == null || !Number.isFinite(unitCost)) missingLines += 1;
        else { knownCost += unitCost * Number(item.quantity || 0); knownLines += 1; }
      }
    }
    const expensesInRange = expenses.filter(expense => {
      if (period === "all") return true;
      const since = new Date();
      since.setDate(since.getDate() - Number(period) + 1);
      since.setHours(0, 0, 0, 0);
      return new Date(expense.incurred_on + "T00:00:00") >= since;
    });
    const expenseTotal = expensesInRange.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const grossEstimate = missingLines === 0 ? revenue - knownCost : null;
    return { revenue, knownCost, knownLines, missingLines, expenseTotal, grossEstimate, netEstimate: grossEstimate == null ? null : grossEstimate - expenseTotal };
  }, [deliveredOrders, products, expenses, period]);

  const customers = useMemo(() => {
    const groups = new Map<string, { phone: string; name: string; email: string | null; count: number; delivered: number; total: number; last: string; orders: Order[] }>();
    for (const order of orders) {
      const key = order.customer_phone.replace(/\D/g, "");
      const current = groups.get(key) || { phone: order.customer_phone, name: order.customer_name, email: order.customer_email, count: 0, delivered: 0, total: 0, last: order.created_at, orders: [] };
      current.count += 1;
      current.orders.push(order);
      if (order.order_status === "delivered") { current.delivered += 1; current.total += Number(order.total || 0); }
      if (new Date(order.created_at) > new Date(current.last)) { current.last = order.created_at; current.name = order.customer_name; current.email = order.customer_email; current.phone = order.customer_phone; }
      groups.set(key, current);
    }
    return Array.from(groups.values()).sort((a, b) => b.count - a.count || new Date(b.last).getTime() - new Date(a.last).getTime());
  }, [orders]);

  const topProducts = useMemo(() => {
    const groups = new Map<string, { name: string; quantity: number; sales: number }>();
    for (const order of deliveredOrders) for (const item of order.order_items || []) {
      const current = groups.get(item.product_id || item.product_name) || { name: item.product_name, quantity: 0, sales: 0 };
      current.quantity += Number(item.quantity || 0);
      current.sales += Number(item.line_total || 0);
      groups.set(item.product_id || item.product_name, current);
    }
    return Array.from(groups.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  }, [deliveredOrders]);

  const salesTrend = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    const key = day.toLocaleDateString("en-CA");
    const value = deliveredOrders.filter(order => new Date(order.created_at).toLocaleDateString("en-CA") === key).reduce((sum, order) => sum + Number(order.total || 0), 0);
    return { label: new Intl.DateTimeFormat("en-BD", { weekday: "short" }).format(day), value };
  }), [deliveredOrders]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter(order => !q || [order.order_number, order.customer_name, order.customer_phone].some(value => (value || "").toLowerCase().includes(q)));
  }, [orders, orderSearch]);

  const filteredProducts = useMemo(() => {
    const q = inventorySearch.trim().toLowerCase();
    return products.filter(product => !q || [product.name, product.sku, product.fulfillment_source].some(value => (value || "").toLowerCase().includes(q)));
  }, [products, inventorySearch]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    return customers.filter(customer => !q || [customer.name, customer.phone, customer.email].some(value => (value || "").toLowerCase().includes(q)));
  }, [customers, customerSearch]);

  const saveInventory = async (product: Product) => {
    if (!supabase) return;
    const draft = inventoryDrafts[product.id];
    const stock = Number(draft?.stock);
    const cost = draft?.cost.trim() ? Number(draft.cost) : null;
    if (!Number.isInteger(stock) || stock < 0 || stock > 1000000 || (cost != null && (!Number.isFinite(cost) || cost < 0 || cost > 10000000))) {
      setError("Enter valid stock and supplier cost values for " + product.name + ".");
      return;
    }
    setSaving(true); setError(""); setNotice("");
    const { error: updateError } = await supabase.from("products").update({
      stock_quantity: stock, supplier_cost_price: cost, supplier_id: draft.supplier || null, updated_at: new Date().toISOString()
    }).eq("id", product.id);
    if (updateError) setError(updateError.message);
    else {
      setInventoryDrafts(current => ({ ...current, [product.id]: { stock: String(stock), cost: cost == null ? "" : String(cost), supplier: draft.supplier || "" } }));
      await log("inventory_updated", "product", product.id, "Updated inventory and unit cost for " + product.name, { stock_quantity: stock, supplier_cost_price: cost });
      setNotice("Inventory saved for " + product.name + ".");
      await refresh();
    }
    setSaving(false);
  };

  const addSupplier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    if (supplierDraft.name.trim().length < 2) { setError("Supplier name must contain at least 2 characters."); return; }
    setSaving(true); setError(""); setNotice("");
    const payload = {
      name: supplierDraft.name.trim(),
      platform_code: supplierDraft.platform_code.trim() || null,
      contact_person: supplierDraft.contact_person.trim() || null,
      phone: supplierDraft.phone.trim() || null,
      email: supplierDraft.email.trim() || null,
      website_url: supplierDraft.website_url.trim() || null,
      notes: supplierDraft.notes.trim() || null,
      is_active: true
    };
    const { data, error: insertError } = await supabase.from("suppliers").insert(payload).select("id").single();
    if (insertError) setError(insertError.message);
    else {
      await log("supplier_created", "supplier", data.id, "Added supplier " + payload.name);
      setSupplierDraft({ name: "", platform_code: "", contact_person: "", phone: "", email: "", website_url: "", notes: "" });
      setNotice("Supplier added.");
      await refresh();
    }
    setSaving(false);
  };

  const toggleSupplier = async (supplier: Supplier) => {
    if (!supabase) return;
    setSaving(true); setError(""); setNotice("");
    const { error: updateError } = await supabase.from("suppliers").update({ is_active: !supplier.is_active, updated_at: new Date().toISOString() }).eq("id", supplier.id);
    if (updateError) setError(updateError.message);
    else {
      await log("supplier_status_changed", "supplier", supplier.id, (supplier.is_active ? "Paused " : "Activated ") + supplier.name);
      await refresh();
      setNotice("Supplier status updated.");
    }
    setSaving(false);
  };

  const addExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const amount = Number(expenseDraft.amount);
    if (expenseDraft.description.trim().length < 2 || !Number.isFinite(amount) || amount <= 0 || amount > 100000000) {
      setError("Enter an expense description and a valid amount above ৳0.");
      return;
    }
    setSaving(true); setError(""); setNotice("");
    const payload = {
      category: expenseDraft.category, description: expenseDraft.description.trim(), amount,
      incurred_on: expenseDraft.incurred_on, supplier_id: expenseDraft.supplier_id || null,
      payment_method: expenseDraft.payment_method, reference: expenseDraft.reference.trim() || null,
      notes: expenseDraft.notes.trim() || null, created_by: actorId
    };
    const { data, error: insertError } = await supabase.from("operating_expenses").insert(payload).select("id").single();
    if (insertError) setError(insertError.message);
    else {
      await log("expense_recorded", "expense", data.id, "Recorded " + expenseDraft.category + " expense of " + money(amount), { category: expenseDraft.category, amount });
      setExpenseDraft(current => ({ ...current, description: "", amount: "", reference: "", notes: "" }));
      setNotice("Expense recorded.");
      await refresh();
    }
    setSaving(false);
  };

  const selectOrder = (order: Order) => {
    setSelectedOrderId(order.id);
    setCourierDraft({
      courier_partner: order.courier_partner || "",
      courier_tracking_number: order.courier_tracking_number || "",
      courier_status_note: order.courier_status_note || "",
      order_status: order.order_status,
      payment_status: order.payment_status
    });
  };

  const saveCourier = async () => {
    const order = orders.find(item => item.id === selectedOrderId);
    if (!supabase || !order) return;
    setSaving(true); setError(""); setNotice("");
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      courier_partner: courierDraft.courier_partner.trim() || null,
      courier_tracking_number: courierDraft.courier_tracking_number.trim() || null,
      courier_status_note: courierDraft.courier_status_note.trim() || null,
      order_status: courierDraft.order_status,
      payment_status: courierDraft.payment_status,
      updated_at: now
    };
    if (courierDraft.order_status === "shipped" && !order.handed_over_at) payload.handed_over_at = now;
    if (courierDraft.order_status === "delivered" && !order.delivered_at) payload.delivered_at = now;
    const { error: updateError } = await supabase.from("orders").update(payload).eq("id", order.id);
    if (updateError) setError(updateError.message);
    else {
      await log("order_fulfilment_updated", "order", order.id, "Updated order, payment and delivery details for " + order.order_number, { courier_partner: payload.courier_partner, courier_tracking_number: payload.courier_tracking_number, order_status: payload.order_status, payment_status: payload.payment_status });
      setNotice("Order, payment and delivery details saved.");
      await refresh();
    }
    setSaving(false);
  };

  const bulkUpdateOrders = async () => {
    if (!supabase || selectedOrderIds.length === 0) return;
    if (!window.confirm("Update " + selectedOrderIds.length + " selected order(s) to " + bulkStatus.toUpperCase() + "?")) return;
    setSaving(true); setError(""); setNotice("");
    const now = new Date().toISOString();
    const selectedOrders = orders.filter(order => selectedOrderIds.includes(order.id));
    const results = await Promise.all(selectedOrders.map(order => {
      const payload: Record<string, unknown> = { order_status: bulkStatus, updated_at: now };
      if (bulkStatus === "shipped" && !order.handed_over_at) payload.handed_over_at = now;
      if (bulkStatus === "delivered" && !order.delivered_at) payload.delivered_at = now;
      return supabase.from("orders").update(payload).eq("id", order.id);
    }));
    const failures = results.filter(result => result.error);
    if (failures.length) {
      setError(`${failures.length} of ${selectedOrders.length} selected order(s) could not be updated. Refresh and verify each order before retrying.`);
      await refresh();
    } else {
      await log("orders_bulk_status_updated", "order", null, "Bulk-updated " + selectedOrders.length + " orders to " + bulkStatus, { order_ids: selectedOrderIds });
      setNotice("Selected orders updated.");
      setSelectedOrderIds([]);
      await refresh();
    }
    setSaving(false);
  };

  const updateSupplierLine = async (order: Order, item: OrderItem, status: string, reference: string) => {
    if (!supabase) return;
    setSaving(true); setError(""); setNotice("");
    const { error: updateError } = await supabase.from("order_items").update({
      supplier_fulfillment_status: status, supplier_order_reference: reference.trim() || null
    }).eq("id", item.id);
    if (updateError) setError(updateError.message);
    else {
      await log("supplier_item_status_updated", "order_item", item.id, "Supplier fulfilment updated for " + item.product_name + " (" + order.order_number + ")", { status, reference });
      setNotice("Supplier fulfilment updated.");
      await refresh();
    }
    setSaving(false);
  };

  const exportOrders = () => {
    const headers = ["Order Number", "Created At", "Customer", "Phone", "Email", "District", "Area", "Address", "Subtotal", "Discount", "Delivery", "Total", "Payment", "Payment Status", "Order Status", "Courier", "Tracking"];
    const rows = filteredOrders.map(order => [
      order.order_number, order.created_at, order.customer_name, order.customer_phone, order.customer_email,
      order.shipping_address?.district, order.shipping_address?.area, order.shipping_address?.address_line,
      order.subtotal, order.discount, order.delivery_charge, order.total, order.payment_method, order.payment_status,
      order.order_status, order.courier_partner, order.courier_tracking_number
    ]);
    downloadCsv("his-her-mart-orders.csv", [headers, ...rows]);
  };

  const exportCustomers = () => {
    const headers = ["Customer", "Phone", "Email", "Total Orders", "Delivered Orders", "Delivered Spend", "Last Order"];
    downloadCsv("his-her-mart-customers.csv", [headers, ...filteredCustomers.map(customer => [customer.name, customer.phone, customer.email, customer.count, customer.delivered, customer.total, customer.last])]);
  };

  function downloadCsv(filename: string, rows: unknown[][]) {
    const csv = rows.map(row => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const printInvoice = (order: Order) => {
    const invoiceWindow = window.open("", "_blank", "width=850,height=900");
    if (!invoiceWindow) { setError("Allow pop-ups to print the invoice."); return; }
    const itemRows = (order.order_items || []).map(item => "<tr><td>" + escapeHtml(item.product_name) + "</td><td>" + Number(item.quantity) + "</td><td>" + money(Number(item.unit_price)) + "</td><td>" + money(Number(item.line_total)) + "</td></tr>").join("");
    invoiceWindow.document.write("<!doctype html><html><head><title>Invoice " + escapeHtml(order.order_number) + "</title><meta name='viewport' content='width=device-width,initial-scale=1'><style>body{font:14px Arial,sans-serif;color:#222;margin:40px}header{display:flex;justify-content:space-between;border-bottom:2px solid #222;padding-bottom:18px}h1{font-family:Georgia,serif;font-size:30px}table{width:100%;border-collapse:collapse;margin-top:30px}th,td{padding:12px;border-bottom:1px solid #ddd;text-align:left}.total{margin:25px 0 0 auto;width:260px}.total p{display:flex;justify-content:space-between}@media print{button{display:none}}</style></head><body><header><div><h1>HIS &amp; HERS MART</h1><p>Order invoice / Cash on Delivery</p></div><div><b>" + escapeHtml(order.order_number) + "</b><p>" + escapeHtml(fullDate(order.created_at)) + "</p></div></header><h3>Customer</h3><p>" + escapeHtml(order.customer_name) + "<br>" + escapeHtml(order.customer_phone) + "<br>" + escapeHtml(order.shipping_address?.address_line) + ", " + escapeHtml(order.shipping_address?.area) + ", " + escapeHtml(order.shipping_address?.district) + "</p><table><thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>" + itemRows + "</tbody></table><div class='total'><p><span>Subtotal</span><b>" + money(Number(order.subtotal)) + "</b></p><p><span>Discount</span><b>− " + money(Number(order.discount || 0)) + "</b></p><p><span>Delivery</span><b>" + money(Number(order.delivery_charge)) + "</b></p><p><span>Total</span><b>" + money(Number(order.total)) + "</b></p></div><script>window.onload=()=>window.print()</script></body></html>");
    invoiceWindow.document.close();
  };

  const nav: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "orders", label: "Orders & delivery", icon: ClipboardList },
    { id: "inventory", label: "Inventory", icon: Warehouse },
    { id: "suppliers", label: "Suppliers", icon: Truck },
    { id: "customers", label: "Customers", icon: Users },
    { id: "finance", label: "Finance", icon: Wallet },
    { id: "activity", label: "Activity log", icon: Activity }
  ];

  return <section className="admin-control-center">
    <div className="admin-control-heading">
      <div>
        <p className="eyebrow">BUSINESS OPERATIONS</p>
        <h2>Admin Control Centre</h2>
        <p>Orders, inventory, suppliers, customer insights and business finance in one place.</p>
      </div>
      <div className="admin-control-heading-actions">
        <span><ShieldCheck size={14}/> Owner workspace</span>
        <button type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""}/> Refresh data</button>
      </div>
    </div>

    {error && <div className="admin-control-alert error"><AlertTriangle size={16}/><span>{error}</span></div>}
    {notice && <div className="admin-control-alert success"><CheckCircle2 size={16}/><span>{notice}</span><button type="button" onClick={() => setNotice("")}>×</button></div>}

    <nav className="admin-control-nav" aria-label="Admin workspace modules">
      {nav.map(item => {
        const Icon = item.icon;
        return <button type="button" key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><Icon size={16}/><span>{item.label}</span></button>;
      })}
    </nav>

    {loading ? <div className="admin-control-loading"><RefreshCw size={18} className="spin"/> Loading business data securely…</div> : <>
      {tab === "overview" && <>
        <div className="admin-control-toolbar">
          <div><b>Business snapshot</b><small>Calculated from the latest 500 orders and current catalogue records.</small></div>
          <select value={period} onChange={event => setPeriod(event.target.value as "7" | "30" | "all")} aria-label="Dashboard reporting period"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All loaded history</option></select>
        </div>
        <div className="admin-control-metrics">
          <article><span><ClipboardList size={17}/> Orders loaded</span><strong>{rangeOrders.length}</strong><small>{pendingCount} pending · {processingCount} processing · {shippedCount} shipped</small></article>
          <article><span><Wallet size={17}/> Delivered sales</span><strong>{money(deliveredRevenue)}</strong><small>{deliveredOrders.length} delivered orders in selected period</small></article>
          <article><span><Package size={17}/> Active products</span><strong>{activeProducts}</strong><small>{outOfStock.length} out of stock · {lowStockProducts.length} at or below threshold</small></article>
          <article><span><Boxes size={17}/> Known stock cost</span><strong>{money(inventoryValue)}</strong><small>Excludes products without a recorded supplier cost</small></article>
        </div>
        <div className="admin-control-two-col">
          <section className="admin-control-card">
            <div className="admin-control-card-head"><div><b>Delivered sales trend</b><small>Daily delivered order value · last 7 days</small></div><BarChart3 size={18}/></div>
            <div className="admin-control-chart">
              {salesTrend.map(day => <div className="admin-control-bar-col" key={day.label}><b>{money(day.value)}</b><span style={{ height: Math.max(4, day.value / Math.max(1, ...salesTrend.map(item => item.value)) * 116) }}/><small>{day.label}</small></div>)}
            </div>
          </section>
          <section className="admin-control-card">
            <div className="admin-control-card-head"><div><b>Stock attention</b><small>Change the alert threshold as your catalogue grows</small></div><AlertTriangle size={18}/></div>
            <label className="admin-control-inline-label">Low stock threshold <input type="number" min="0" max="10000" value={stockThreshold} onChange={event => setStockThreshold(event.target.value)}/></label>
            {lowStockProducts.length === 0 ? <p className="admin-control-empty-line"><CheckCircle2 size={16}/> No active products need a stock alert.</p> :
              <div className="admin-control-compact-list">{lowStockProducts.slice(0, 6).map(product => <div key={product.id}><span>{product.name}<small>{product.sku || "No SKU"}</small></span><b className={product.stock_quantity <= 0 ? "danger" : "warning"}>{product.stock_quantity <= 0 ? "Out of stock" : product.stock_quantity + " left"}</b></div>)}</div>}
            <button type="button" className="admin-control-text-btn" onClick={() => setTab("inventory")}>Open inventory <ChevronDown size={14}/></button>
          </section>
        </div>
        <div className="admin-control-two-col">
          <section className="admin-control-card">
            <div className="admin-control-card-head"><div><b>Top delivered products</b><small>Ranked by units in the selected period</small></div><ShoppingBag size={18}/></div>
            {topProducts.length === 0 ? <p className="admin-control-empty-line">No delivered product sales in this period yet.</p> : <div className="admin-control-compact-list">{topProducts.map((product, index) => <div key={product.name}><span><i>{index + 1}</i>{product.name}</span><b>{product.quantity} units · {money(product.sales)}</b></div>)}</div>}
          </section>
          <section className="admin-control-card">
            <div className="admin-control-card-head"><div><b>Finance confidence</b><small>Based on cost records for delivered items</small></div><IndianRupee size={18}/></div>
            {profitData.missingLines === 0 ? <><strong className="admin-control-finance-value">{money(profitData.netEstimate || 0)}</strong><p className="admin-control-muted">Estimated result after recorded expenses. Product costs use order snapshots or current supplier cost.</p></> :
              <><strong className="admin-control-finance-value">Incomplete</strong><p className="admin-control-muted">{profitData.missingLines} delivered order item line(s) have no recorded cost. Add missing supplier costs before using profit figures.</p></>}
            <button type="button" className="admin-control-text-btn" onClick={() => setTab("finance")}>Review finance <ChevronDown size={14}/></button>
          </section>
        </div>
        <section className="admin-control-card">
          <div className="admin-control-card-head"><div><b>Latest orders</b><small>Fast access to recent order operations</small></div><button type="button" className="admin-control-text-btn" onClick={() => setTab("orders")}>Manage all <ChevronDown size={14}/></button></div>
          <div className="admin-control-table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Placed</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>
            {orders.slice(0, 6).map(order => <tr key={order.id}><td><b>{order.order_number}</b></td><td>{order.customer_name}<small>{order.customer_phone}</small></td><td>{shortDate(order.created_at)}</td><td>{money(order.total)}</td><td><span className={"admin-control-status " + order.order_status}>{order.order_status}</span></td><td><button type="button" className="admin-control-small-btn" onClick={() => { selectOrder(order); setTab("orders"); }}>Manage</button></td></tr>)}
            {orders.length === 0 && <tr><td colSpan={6}>No orders available.</td></tr>}
          </tbody></table></div>
        </section>
      </>}

      {tab === "orders" && <>
        <div className="admin-control-toolbar"><div><b>Order operations & delivery desk</b><small>Manage courier references, status, bulk updates, supplier fulfilment and invoice printing.</small></div><button type="button" className="admin-control-outline-btn" onClick={exportOrders}><Download size={15}/> Export filtered orders</button></div>
        <div className="admin-control-search"><Search size={16}/><input value={orderSearch} onChange={event => setOrderSearch(event.target.value)} placeholder="Search order number, customer or phone"/></div>
        <div className="admin-control-bulk"><label><input type="checkbox" checked={filteredOrders.length > 0 && filteredOrders.every(order => selectedOrderIds.includes(order.id))} onChange={event => setSelectedOrderIds(event.target.checked ? Array.from(new Set([...selectedOrderIds, ...filteredOrders.map(order => order.id)])) : selectedOrderIds.filter(id => !filteredOrders.some(order => order.id === id)))}/> Select visible orders</label><select value={bulkStatus} onChange={event => setBulkStatus(event.target.value)}>{ORDER_STATUSES.map(status => <option key={status} value={status}>{status.toUpperCase()}</option>)}</select><button type="button" onClick={() => void bulkUpdateOrders()} disabled={!selectedOrderIds.length || saving}>Update {selectedOrderIds.length || ""} selected</button></div>
        <section className="admin-control-card">
          <div className="admin-control-table-wrap"><table><thead><tr><th></th><th>Order / Customer</th><th>Date</th><th>Amount</th><th>Status</th><th>Payment</th><th>Delivery</th><th>Actions</th></tr></thead><tbody>
            {filteredOrders.map(order => <tr key={order.id}><td><input type="checkbox" checked={selectedOrderIds.includes(order.id)} onChange={event => setSelectedOrderIds(current => event.target.checked ? [...current, order.id] : current.filter(id => id !== order.id))}/></td><td><b>{order.order_number}</b><small>{order.customer_name} · {order.customer_phone}</small></td><td>{shortDate(order.created_at)}</td><td>{money(order.total)}</td><td><span className={"admin-control-status " + order.order_status}>{order.order_status}</span></td><td>{order.payment_status.toUpperCase()}</td><td>{order.courier_tracking_number || "Not assigned"}<small>{order.courier_partner || "Manual fulfilment"}</small></td><td><button type="button" className="admin-control-small-btn" onClick={() => selectOrder(order)}>Manage</button></td></tr>)}
            {filteredOrders.length === 0 && <tr><td colSpan={8}>No matching orders.</td></tr>}
          </tbody></table></div>
        </section>
        {selectedOrderId && (() => {
          const order = orders.find(item => item.id === selectedOrderId);
          if (!order) return null;
          return <section className="admin-control-card admin-control-order-editor">
            <div className="admin-control-card-head"><div><b>{order.order_number}</b><small>{order.customer_name} · {order.customer_phone} · {fullDate(order.created_at)}</small></div><button type="button" className="admin-control-text-btn" onClick={() => setSelectedOrderId("")}>Close ×</button></div>
            <div className="admin-control-order-grid">
              <label>Courier / delivery partner<input value={courierDraft.courier_partner} onChange={event => setCourierDraft(current => ({ ...current, courier_partner: event.target.value }))} placeholder="Supplier courier / courier name"/></label>
              <label>Tracking / consignment number<input value={courierDraft.courier_tracking_number} onChange={event => setCourierDraft(current => ({ ...current, courier_tracking_number: event.target.value }))} placeholder="Tracking reference"/></label>
              <label>Order status<select value={courierDraft.order_status} onChange={event => setCourierDraft(current => ({ ...current, order_status: event.target.value }))}>{ORDER_STATUSES.map(status => <option key={status} value={status}>{status.toUpperCase()}</option>)}</select></label>
              <label>Payment status<select value={courierDraft.payment_status} onChange={event => setCourierDraft(current => ({ ...current, payment_status: event.target.value }))}><option value="pending">PENDING</option><option value="paid">PAID</option><option value="failed">FAILED</option><option value="refunded">REFUNDED</option></select></label>
              <label className="wide">Delivery / courier note<textarea rows={2} value={courierDraft.courier_status_note} onChange={event => setCourierDraft(current => ({ ...current, courier_status_note: event.target.value }))} placeholder="Manual dispatch or delivery update"/></label>
            </div>
            {order.order_status === "delivered" && order.payment_status === "pending" && <p className="admin-control-note"><AlertTriangle size={16}/><span>Delivered order with payment still marked pending. Verify cash / COD collection before changing payment status to PAID.</span></p>}
             <div className="admin-control-order-meta"><span>Subtotal <b>{money(order.subtotal)}</b></span><span>Delivery <b>{money(order.delivery_charge)}</b></span><span>Total <b>{money(order.total)}</b></span><span>Handed over <b>{order.handed_over_at ? fullDate(order.handed_over_at) : "Not recorded"}</b></span><span>Delivered <b>{order.delivered_at ? fullDate(order.delivered_at) : "Not recorded"}</b></span></div>
            <div className="admin-control-actions"><button type="button" onClick={() => void saveCourier()} disabled={saving}><Check size={15}/> Save fulfilment</button><button type="button" className="secondary" onClick={() => printInvoice(order)}><FileText size={15}/> Print invoice</button></div>
            <p className="admin-control-hint">Courier status is recorded manually. No courier API or live tracking connection is configured.</p>
          </section>;
        })()}
        <section className="admin-control-card">
          <div className="admin-control-card-head"><div><b>Supplier fulfilment queue</b><small>Manage each supplier item separately after manual availability confirmation.</small></div><Truck size={18}/></div>
          <div className="admin-control-fulfilment-list">
            {orders.flatMap(order => (order.order_items || []).filter(item => item.fulfillment_source !== "own_stock").map(item => ({ order, item }))).slice(0, 80).map(({ order, item }) => <SupplierLine key={item.id} order={order} item={item} suppliers={suppliers} saving={saving} onSave={updateSupplierLine}/>)}
            {orders.every(order => (order.order_items || []).every(item => item.fulfillment_source === "own_stock")) && <p className="admin-control-empty-line">No supplier-fulfilled order items in the loaded order history.</p>}
          </div>
        </section>
      </>}

      {tab === "inventory" && <>
        <div className="admin-control-toolbar"><div><b>Inventory & cost control</b><small>Update stock, supplier mapping and cost price. Changes affect the live product catalogue.</small></div><span className="admin-control-count">{lowStockProducts.length} stock alerts</span></div>
        <div className="admin-control-search"><Search size={16}/><input value={inventorySearch} onChange={event => setInventorySearch(event.target.value)} placeholder="Search product, SKU or source"/></div>
        <section className="admin-control-card">
          <div className="admin-control-table-wrap"><table><thead><tr><th>Product</th><th>Price</th><th>Stock quantity</th><th>Supplier cost (BDT)</th><th>Supplier</th><th></th></tr></thead><tbody>
            {filteredProducts.map(product => <tr key={product.id}>
              <td><b>{product.name}</b><small>{product.sku || "No SKU"} · {product.is_active ? "Published" : "Hidden"}</small></td>
              <td>{money(product.price)}</td>
              <td><input className="admin-control-cell-input" type="number" min="0" value={inventoryDrafts[product.id]?.stock ?? String(product.stock_quantity)} onChange={event => setInventoryDrafts(current => ({ ...current, [product.id]: { ...(current[product.id] || { stock: String(product.stock_quantity), cost: "", supplier: product.supplier_id || "" }), stock: event.target.value } }))}/></td>
              <td><input className="admin-control-cell-input" type="number" min="0" step="0.01" placeholder="Not set" value={inventoryDrafts[product.id]?.cost ?? ""} onChange={event => setInventoryDrafts(current => ({ ...current, [product.id]: { ...(current[product.id] || { stock: String(product.stock_quantity), cost: "", supplier: product.supplier_id || "" }), cost: event.target.value } }))}/></td>
              <td><select className="admin-control-cell-select" value={inventoryDrafts[product.id]?.supplier ?? product.supplier_id ?? ""} onChange={event => setInventoryDrafts(current => ({ ...current, [product.id]: { ...(current[product.id] || { stock: String(product.stock_quantity), cost: product.supplier_cost_price == null ? "" : String(product.supplier_cost_price), supplier: "" }), supplier: event.target.value } }))}><option value="">Not assigned</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></td>
              <td><button type="button" className="admin-control-small-btn" onClick={() => void saveInventory(product)} disabled={saving}>Save</button></td>
            </tr>)}
            {filteredProducts.length === 0 && <tr><td colSpan={6}>No matching products.</td></tr>}
          </tbody></table></div>
        </section>
        <div className="admin-control-note"><AlertTriangle size={16}/><span>Supplier stock and price are not automatically synced. Verify with ShopBase BD / DropshippingBD before confirming a supplier order. Cost changes apply to future order cost snapshots; older orders use current cost only as an estimate.</span></div>
      </>}

      {tab === "suppliers" && <>
        <div className="admin-control-toolbar"><div><b>Supplier directory</b><small>Manage manual supplier relationships and keep item references in one place.</small></div><span className="admin-control-count">{suppliers.filter(item => item.is_active).length} active suppliers</span></div>
        <div className="admin-control-supplier-grid">
          {suppliers.map(supplier => <article className="admin-control-card admin-control-supplier-card" key={supplier.id}>
            <div className="admin-control-card-head"><div><b>{supplier.name}</b><small>{supplier.platform_code || "Manual supplier"}</small></div><span className={supplier.is_active ? "admin-control-live" : "admin-control-paused"}>{supplier.is_active ? "Active" : "Paused"}</span></div>
            <p>{supplier.contact_person || "Contact not added"}{supplier.phone ? " · " + supplier.phone : ""}</p>
            {supplier.email && <p>{supplier.email}</p>}
            {supplier.website_url && <p><a href={supplier.website_url} target="_blank" rel="noreferrer">{supplier.website_url}</a></p>}
            <p className="admin-control-muted">{supplier.notes || "No internal notes."}</p>
            <button type="button" className="admin-control-small-btn" onClick={() => void toggleSupplier(supplier)} disabled={saving}>{supplier.is_active ? "Pause supplier" : "Activate supplier"}</button>
          </article>)}
        </div>
        <section className="admin-control-card">
          <div className="admin-control-card-head"><div><b>Add a supplier</b><small>Contact details are optional; never enter supplier passwords or API secrets here.</small></div><Plus size={18}/></div>
          <form className="admin-control-form-grid" onSubmit={addSupplier}>
            <label>Supplier name<input required minLength={2} maxLength={120} value={supplierDraft.name} onChange={event => setSupplierDraft(current => ({ ...current, name: event.target.value }))} placeholder="Supplier / wholesaler name"/></label>
            <label>Platform code<input maxLength={64} value={supplierDraft.platform_code} onChange={event => setSupplierDraft(current => ({ ...current, platform_code: event.target.value }))} placeholder="Optional internal code"/></label>
            <label>Contact person<input value={supplierDraft.contact_person} onChange={event => setSupplierDraft(current => ({ ...current, contact_person: event.target.value }))}/></label>
            <label>Phone<input value={supplierDraft.phone} onChange={event => setSupplierDraft(current => ({ ...current, phone: event.target.value }))}/></label>
            <label>Email<input type="email" value={supplierDraft.email} onChange={event => setSupplierDraft(current => ({ ...current, email: event.target.value }))}/></label>
            <label>Website URL<input type="url" value={supplierDraft.website_url} onChange={event => setSupplierDraft(current => ({ ...current, website_url: event.target.value }))} placeholder="https://…"/></label>
            <label className="wide">Internal notes<textarea rows={2} value={supplierDraft.notes} onChange={event => setSupplierDraft(current => ({ ...current, notes: event.target.value }))}/></label>
            <div className="wide"><button type="submit" disabled={saving}><Plus size={15}/> Add supplier</button></div>
          </form>
        </section>
      </>}

      {tab === "customers" && <>
        <div className="admin-control-toolbar"><div><b>Customer insights</b><small>Customer groups are derived from the latest 500 loaded orders, grouped by mobile number.</small></div><button type="button" className="admin-control-outline-btn" onClick={exportCustomers}><Download size={15}/> Export customers</button></div>
        <div className="admin-control-metrics compact">
          <article><span><Users size={16}/> Unique customers</span><strong>{customers.length}</strong></article>
          <article><span><CheckCircle2 size={16}/> Repeat customers</span><strong>{customers.filter(customer => customer.count > 1).length}</strong></article>
          <article><span><Wallet size={16}/> Delivered spend</span><strong>{money(customers.reduce((sum, customer) => sum + customer.total, 0))}</strong></article>
          <article><span><ShoppingBag size={16}/> Orders loaded</span><strong>{orders.length}</strong></article>
        </div>
        <div className="admin-control-search"><Search size={16}/><input value={customerSearch} onChange={event => setCustomerSearch(event.target.value)} placeholder="Search customer name, phone or email"/></div>
        <section className="admin-control-card"><div className="admin-control-table-wrap"><table><thead><tr><th>Customer</th><th>Phone</th><th>Orders</th><th>Delivered</th><th>Delivered spend</th><th>Last order</th></tr></thead><tbody>
          {filteredCustomers.map(customer => <tr key={customer.phone}><td><b>{customer.name}</b><small>{customer.email || "No email recorded"}</small></td><td>{customer.phone}</td><td>{customer.count}{customer.count > 1 && <span className="admin-control-live"> Repeat</span>}</td><td>{customer.delivered}</td><td>{money(customer.total)}</td><td>{shortDate(customer.last)}</td></tr>)}
          {filteredCustomers.length === 0 && <tr><td colSpan={6}>No customer records match.</td></tr>}
        </tbody></table></div></section>
        <p className="admin-control-hint">This is order-based customer insight, not an independent marketing consent list. Do not send promotional messages without the required permission.</p>
      </>}

      {tab === "finance" && <>
        <div className="admin-control-toolbar"><div><b>Finance & profit tracker</b><small>Delivered sales, known product costs and recorded operating expenses.</small></div><select value={period} onChange={event => setPeriod(event.target.value as "7" | "30" | "all")}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All loaded history</option></select></div>
        <div className="admin-control-metrics compact">
          <article><span><Wallet size={16}/> Delivered sales</span><strong>{money(profitData.revenue)}</strong><small>Product subtotal, not all placed orders</small></article>
          <article><span><Boxes size={16}/> Known product cost</span><strong>{money(profitData.knownCost)}</strong><small>{profitData.knownLines} item lines with cost</small></article>
          <article><span><IndianRupee size={16}/> Recorded expenses</span><strong>{money(profitData.expenseTotal)}</strong><small>{expenses.length} expense entries loaded</small></article>
          <article><span><BarChart3 size={16}/> Gross / net estimate</span><strong>{profitData.netEstimate == null ? "Incomplete" : money(profitData.netEstimate)}</strong><small>{profitData.missingLines} item lines missing cost</small></article>
        </div>
        <div className="admin-control-note"><AlertTriangle size={16}/><span>{profitData.missingLines > 0 ? "Profit cannot be finalised: some delivered items have no cost record. Add supplier cost in Inventory. Historical orders without a snapshot use today's product cost as an estimate. " : "All delivered item costs in this period are present. " }This is a management estimate before unrecorded COD, tax, packaging, refund and other business costs; only expenses entered below are deducted.</span></div>
        {profitData.netEstimate != null && <section className="admin-control-card admin-control-finance-breakdown"><div><span>Delivered product revenue</span><b>{money(profitData.revenue)}</b></div><div><span>Recorded item cost</span><b>− {money(profitData.knownCost)}</b></div><div><span>Recorded operating expenses</span><b>− {money(profitData.expenseTotal)}</b></div><div className="grand"><span>Estimated result</span><b>{money(profitData.netEstimate)}</b></div></section>}
        <section className="admin-control-card">
          <div className="admin-control-card-head"><div><b>Record an operating expense</b><small>Keep packaging, marketing, courier, supplier and other costs in one ledger.</small></div><Plus size={18}/></div>
          <form className="admin-control-form-grid" onSubmit={addExpense}>
            <label>Category<select value={expenseDraft.category} onChange={event => setExpenseDraft(current => ({ ...current, category: event.target.value }))}>{EXPENSE_CATEGORIES.map(category => <option key={category} value={category}>{category.toUpperCase()}</option>)}</select></label>
            <label>Amount (BDT)<input type="number" min="0.01" step="0.01" required value={expenseDraft.amount} onChange={event => setExpenseDraft(current => ({ ...current, amount: event.target.value }))} placeholder="0.00"/></label>
            <label>Description<input required minLength={2} maxLength={240} value={expenseDraft.description} onChange={event => setExpenseDraft(current => ({ ...current, description: event.target.value }))} placeholder="e.g. Packaging supplies"/></label>
            <label>Date<input type="date" required value={expenseDraft.incurred_on} onChange={event => setExpenseDraft(current => ({ ...current, incurred_on: event.target.value }))}/></label>
            <label>Supplier (optional)<select value={expenseDraft.supplier_id} onChange={event => setExpenseDraft(current => ({ ...current, supplier_id: event.target.value }))}><option value="">No supplier linked</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
            <label>Payment method<select value={expenseDraft.payment_method} onChange={event => setExpenseDraft(current => ({ ...current, payment_method: event.target.value }))}><option value="cash">Cash</option><option value="bank">Bank</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="card">Card</option><option value="other">Other</option></select></label>
            <label>Reference / receipt<input value={expenseDraft.reference} onChange={event => setExpenseDraft(current => ({ ...current, reference: event.target.value }))}/></label>
            <label>Notes<input value={expenseDraft.notes} onChange={event => setExpenseDraft(current => ({ ...current, notes: event.target.value }))}/></label>
            <div className="wide"><button type="submit" disabled={saving}><Plus size={15}/> Save expense</button></div>
          </form>
        </section>
        <section className="admin-control-card"><div className="admin-control-card-head"><div><b>Expense ledger</b><small>Most recent recorded operating expenses</small></div><Wallet size={18}/></div>
          <div className="admin-control-table-wrap"><table><thead><tr><th>Date</th><th>Expense</th><th>Category</th><th>Supplier</th><th>Method</th><th>Amount</th></tr></thead><tbody>
            {expenses.map(expense => <tr key={expense.id}><td>{shortDate(expense.incurred_on)}</td><td><b>{expense.description}</b><small>{expense.reference || ""}</small></td><td>{expense.category}</td><td>{expense.supplier?.name || "—"}</td><td>{expense.payment_method || "—"}</td><td>{money(expense.amount)}</td></tr>)}
            {expenses.length === 0 && <tr><td colSpan={6}>No expenses have been entered yet.</td></tr>}
          </tbody></table></div>
        </section>
      </>}

      {tab === "activity" && <>
        <div className="admin-control-toolbar"><div><b>Admin activity log</b><small>Records important actions performed from this control centre.</small></div><span className="admin-control-count">{activity.length} events loaded</span></div>
        <section className="admin-control-card"><div className="admin-control-timeline">
          {activity.map(row => <article key={row.id}><span><Activity size={15}/></span><div><b>{row.summary}</b><small>{row.action} · {row.entity_type}{row.entity_id ? " · " + row.entity_id.slice(0, 8) : ""}</small><time>{fullDate(row.created_at)}</time></div></article>)}
          {activity.length === 0 && <p className="admin-control-empty-line">No activity recorded by the new control centre yet.</p>}
        </div></section>
        <p className="admin-control-hint">The activity log is append-only for this workspace. Existing actions in the older admin screens are not retroactively logged.</p>
      </>}
    </>}
  </section>;
}

function SupplierLine({ order, item, suppliers, saving, onSave }: {
  order: Order;
  item: OrderItem;
  suppliers: Supplier[];
  saving: boolean;
  onSave: (order: Order, item: OrderItem, status: string, reference: string) => Promise<void>;
}) {
  const [status, setStatus] = useState(item.supplier_fulfillment_status || "not_submitted");
  const [reference, setReference] = useState(item.supplier_order_reference || "");
  const supplierName = suppliers.find(supplier => supplier.id === item.supplier_id)?.name ||
    (item.fulfillment_source === "shopbase_bd" ? "ShopBase BD" : item.fulfillment_source === "dropshippingbd" ? "DropshippingBD" : item.fulfillment_source);
  return <article className="admin-control-fulfilment-row">
    <div><b>{item.product_name} × {item.quantity}</b><small>{order.order_number} · {supplierName}</small></div>
    <input value={reference} onChange={event => setReference(event.target.value)} placeholder="Supplier order reference"/>
    <select value={status} onChange={event => setStatus(event.target.value)}>{SUPPLIER_STATUSES.map(value => <option key={value} value={value}>{value.replaceAll("_", " ").toUpperCase()}</option>)}</select>
    <button type="button" className="admin-control-small-btn" onClick={() => void onSave(order, item, status, reference)} disabled={saving}>Save</button>
  </article>;
}
