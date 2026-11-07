"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Heart, ShoppingBag, Plus, Minus, Check } from "lucide-react";
import { supabase } from "../../../lib/supabase";

type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
  images: string[] | null;
  size_type: string | null;
  size_options: string[] | null;
  stock_quantity: number;
  category?: { name: string } | null;
  free_shipping_eligible?: boolean;
};
const money = (n: number) => new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(n);
const makeCartKey = (productId: string, size?: string | null) => size ? `${productId}::${encodeURIComponent(size)}` : productId;
const getCartProductId = (key: string) => key.split("::", 1)[0];
const sizeHeading = (sizeType: string | null) => {
  if (sizeType === "apparel_alpha") return "Choose your clothing size · Alphanumeric";
  if (sizeType === "apparel_numeric") return "Choose your clothing size · Numeric";
  if (sizeType === "shoe_eu") return "Choose your shoe size · EU";
  if (sizeType === "shoe_uk") return "Choose your shoe size · UK";
  if (sizeType === "shoe_us") return "Choose your shoe size · US";
  if (sizeType === "letter") return "Choose your clothing size";
  if (sizeType === "numeric") return "Choose your numeric size";
  return "Choose your size";
};

export default function ProductDetailsPage({ slug }: { slug: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [busy, setBusy] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [inBagQty, setInBagQty] = useState(0);
  const [saved, setSaved] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [sizeError, setSizeError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase || !slug) { setBusy(false); return; }
      const { data, error } = await supabase.from("products")
        .select("id,slug,name,description,price,compare_at_price,image_url,images,size_type,size_options,stock_quantity,free_shipping_eligible,category:categories(name)")
        .eq("slug", slug).eq("is_active", true).maybeSingle();
      if (!active) return;
      if (!error && data) {
        const item = data as unknown as Product;
        setProduct(item);
        const gallery = Array.from(new Set([item.image_url, ...(Array.isArray(item.images) ? item.images : [])].filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url)))).slice(0, 12);
        setSelectedImage(gallery[0] || "");
      }
      setBusy(false);
    }
    void load();
    return () => { active = false; };
  }, [slug]);

  const requiredSizes = Array.isArray(product?.size_options) ? product.size_options.filter(Boolean) : [];
  const selectedCartKey = product ? makeCartKey(product.id, selectedSize) : "";

  useEffect(() => {
    if (!product) return;
    try {
      const wishlist = JSON.parse(localStorage.getItem("hhm-wishlist-v1") || "[]") as string[];
      const cart = JSON.parse(localStorage.getItem("hhm-cart-v1") || "{}") as Record<string, number>;
      setSaved(wishlist.includes(product.id));
      setInBagQty(Number(cart[selectedCartKey] || 0));
    } catch {
      setInBagQty(0);
    }
  }, [product, selectedCartKey]);

  function addToBag() {
    if (!product) return;
    if (requiredSizes.length && (!selectedSize || !requiredSizes.includes(selectedSize))) {
      setSizeError("Please choose an available size before adding this item to your bag.");
      return;
    }
    let cart: Record<string, number> = {};
    try { cart = JSON.parse(localStorage.getItem("hhm-cart-v1") || "{}"); } catch { cart = {}; }
    const otherSizeQuantity = Object.entries(cart).reduce((sum, [key, value]) => {
      if (key === selectedCartKey) return sum;
      return getCartProductId(key) === product.id ? sum + Number(value || 0) : sum;
    }, 0);
    const maxForSelected = Math.max(0, Math.min(10, Number(product.stock_quantity) - otherSizeQuantity));
    const nextQty = Math.min(maxForSelected, (cart[selectedCartKey] || 0) + qty);
    if (nextQty <= (cart[selectedCartKey] || 0)) {
      setSizeError("There is not enough stock remaining for this quantity.");
      return;
    }
    cart[selectedCartKey] = nextQty;
    localStorage.setItem("hhm-cart-v1", JSON.stringify(cart));
    window.dispatchEvent(new Event("hhm-storage-updated"));
    setInBagQty(nextQty);
    setSizeError("");
    setAdded(true);
  }

  function openBag() { window.location.assign("/?openBag=1"); }

  function orderNow() {
    if (!product || Number(product.stock_quantity) <= 0) return;
    if (requiredSizes.length && (!selectedSize || !requiredSizes.includes(selectedSize))) {
      setSizeError("Please choose an available size before ordering.");
      return;
    }
    const requested = Math.max(1, Math.min(10, Number(product.stock_quantity), qty));
    const sizeQuery = selectedSize ? "&size=" + encodeURIComponent(selectedSize) : "";
    window.location.assign("/?buyNow=" + encodeURIComponent(product.id) + "&qty=" + requested + sizeQuery);
  }

  function toggleSaved() {
    if (!product) return;
    let list: string[] = [];
    try { list = JSON.parse(localStorage.getItem("hhm-wishlist-v1") || "[]"); } catch { list = []; }
    const next = list.includes(product.id) ? list.filter(x => x !== product.id) : [...list, product.id];
    localStorage.setItem("hhm-wishlist-v1", JSON.stringify(next));
    window.dispatchEvent(new Event("hhm-storage-updated"));
    setSaved(next.includes(product.id));
  }

  if (busy) return <main className="detail-shell"><p>Loading product…</p></main>;
  if (!product) return <main className="detail-shell"><p className="eyebrow">HIS & HER MART</p><h1>Product not found</h1><p>This item may be unavailable or no longer listed.</p><Link className="primary-btn" href="/">Back to shopping <ArrowLeft size={16} /></Link></main>;

  const stock = Number(product.stock_quantity || 0);
  const gallery = Array.from(new Set([product.image_url, ...(Array.isArray(product.images) ? product.images : [])].filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url)))).slice(0, 12);
  const sizeRequired = requiredSizes.length > 0;
  return <main className="detail-shell">
    <header className="detail-top"><Link href="/" className="detail-back"><ArrowLeft size={16} /> Back to store</Link><Link href="/wishlist" className="detail-wishlist"><Heart size={17} /> Wishlist</Link></header>
    <div className="detail-grid">
      <div className="detail-gallery">
        <div className="detail-image">{selectedImage ? <img src={selectedImage} alt={product.name} /> : <div className="detail-image-placeholder">Image coming soon</div>}{product.free_shipping_eligible && <span>SELECTED FREE SHIPPING</span>}</div>
        {gallery.length > 1 && <div className="detail-thumbnails" aria-label="More product images">{gallery.map((url, index) => <button type="button" key={url} className={selectedImage === url ? "detail-thumb active" : "detail-thumb"} onClick={() => setSelectedImage(url)} aria-label={`Show product image ${index + 1}`}><img src={url} alt={`${product.name} view ${index + 1}`} /></button>)}</div>}
      </div>
      <section className="detail-copy">
        <p className="eyebrow">{product.category?.name || "THE COLLECTION"}</p><h1>{product.name}</h1>
        <div className="detail-price">{money(Number(product.price))}{product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && <del>{money(Number(product.compare_at_price))}</del>}</div>
        <p className="detail-stock">{stock > 0 ? (stock < 5 ? "Only " + stock + " left in stock" : "In stock and ready to order") : "Currently out of stock"}</p>
        <p className="detail-description">{product.description || "A thoughtfully selected find from His & Her Mart. Contact our team if you need more product information before ordering."}</p>
        {sizeRequired && <div className="detail-size-selector">
          <div className="detail-size-heading"><b>{sizeHeading(product.size_type)}</b><small>{selectedSize ? "Selected: " + selectedSize : "Select one available option"}</small></div>
          <div className="detail-size-options">{requiredSizes.map(size => <button type="button" key={size} className={selectedSize === size ? "detail-size-option selected" : "detail-size-option"} aria-pressed={selectedSize === size} onClick={() => { setSelectedSize(size); setSizeError(""); setAdded(false); }}>{size}</button>)}</div>
          <small className="detail-size-stock-note">{product.size_type?.startsWith("shoe_") ? "Choose from the available shoe sizes listed by the store." : "Choose from the available clothing sizes listed by the store."} Product stock is shared across the listed sizes.</small>
        </div>}
        <div className="detail-quantity"><span>Quantity</span><div><button onClick={() => setQty(v => Math.max(1, v - 1))} disabled={qty <= 1}><Minus size={14} /></button><b>{qty}</b><button onClick={() => setQty(v => Math.min(stock, 10, v + 1))} disabled={qty >= stock || qty >= 10}><Plus size={14} /></button></div></div>
        {sizeError && <p className="detail-size-error" role="alert">{sizeError}</p>}
        <div className="detail-actions"><button className="primary-btn" onClick={inBagQty > 0 ? openBag : addToBag} disabled={stock <= 0 || (sizeRequired && !selectedSize)}>{inBagQty > 0 ? "View in bag (" + inBagQty + ")" : "Add to bag"} {inBagQty > 0 ? <ShoppingBag size={16} /> : <Plus size={16} />}</button><button className="order-now-btn" onClick={orderNow} disabled={stock <= 0 || (sizeRequired && !selectedSize)}>Order now <ArrowRight size={16} /></button><button className={saved ? "detail-save saved" : "detail-save"} onClick={toggleSaved}><Heart size={17} fill={saved ? "currentColor" : "none"} />{saved ? "Saved" : "Save item"}</button></div>
        {added && <p className="detail-added"><Check size={15} /> Added to your bag. <Link href="/?openBag=1">View your bag</Link></p>}
        <div className="detail-assurance"><div><b>Cash on Delivery</b><small>Pay when your parcel arrives</small></div><div><b>Order tracking</b><small>Track your order online</small></div><div><b>Need help?</b><small><Link href="/faq">Read our FAQs</Link></small></div></div>
      </section>
    </div>
  </main>;
}
