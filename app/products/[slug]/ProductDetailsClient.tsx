"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShoppingBag, Plus, Minus, Check, Share2, ZoomIn, X, Truck, MessageCircle } from "lucide-react";
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
  stock_quantity: number;
  category?: { name: string } | null;
};
const money = (n: number) => new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(n);
const BOX_KEY = "cloud-momos-box-v1";

export default function ProductDetailsPage({ slug }: { slug: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [busy, setBusy] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [inBoxQty, setInBoxQty] = useState(0);
  const [selectedImage, setSelectedImage] = useState("");
  const [purchaseError, setPurchaseError] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [imageZoomOpen, setImageZoomOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase || !slug) { setBusy(false); return; }
      const { data, error } = await supabase.from("products")
        .select("id,slug,name,description,price,compare_at_price,image_url,images,stock_quantity,category:categories(name)")
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

  const selectedCartKey = product?.id || "";

  useEffect(() => {
    if (!product) return;
    try {
      const box = JSON.parse(localStorage.getItem(BOX_KEY) || "{}") as Record<string, number>;
      setInBoxQty(Number(box[selectedCartKey] || 0));
    } catch {
      setInBoxQty(0);
    }
  }, [product, selectedCartKey]);

  function addToBox() {
    if (!product) return;
    let box: Record<string, number> = {};
    try { box = JSON.parse(localStorage.getItem(BOX_KEY) || "{}"); } catch { box = {}; }
    const current = Number(box[selectedCartKey] || 0);
    const nextQty = Math.min(10, Number(product.stock_quantity), current + qty);
    if (nextQty <= current) {
      setPurchaseError("There are not enough boxes in stock for this quantity.");
      return;
    }
    box[selectedCartKey] = nextQty;
    localStorage.setItem(BOX_KEY, JSON.stringify(box));
    window.dispatchEvent(new Event("cloud-momos-box-updated"));
    setInBoxQty(nextQty);
    setPurchaseError("");
    setAdded(true);
  }

  async function shareProduct() {
    if (!product) return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name + " | Cloud Momos", text: "A momo favourite from Cloud Momos in Sylhet.", url });
        setShareMessage("Ready to share.");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareMessage("Momo link copied.");
      } else {
        setShareMessage("Copy this page address to share the item.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setShareMessage("Sharing is unavailable right now.");
    }
  }

  function openBox() { window.location.assign("/?openBox=1"); }

  function buyNow() {
    if (!product || Number(product.stock_quantity) <= 0) return;
    const requested = Math.max(1, Math.min(10, Number(product.stock_quantity), qty));
    window.location.assign("/?buyNow=" + encodeURIComponent(product.id) + "&qty=" + requested);
  }

  if (busy) return <main className="detail-shell"><p>Preparing your momo details…</p></main>;
  if (!product) return <main className="detail-shell"><p className="eyebrow">CLOUD MOMOS · MENU</p><h1>Menu item not found</h1><p>This momo favourite may be unavailable or no longer listed.</p><Link className="primary-btn" href="/">Back to the menu <ArrowLeft size={16} /></Link></main>;

  const stock = Number(product.stock_quantity || 0);
  const gallery = Array.from(new Set([product.image_url, ...(Array.isArray(product.images) ? product.images : [])].filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url)))).slice(0, 12);
  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: gallery,
    category: product.category?.name || undefined,
    brand: { "@type": "Brand", name: "Cloud Momos" },
    offers: {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: Number(product.price),
      availability: stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: "https://cloudmomos.vercel.app/products/" + encodeURIComponent(product.slug),
      itemCondition: "https://schema.org/NewCondition"
    }
  };

  return <main className="detail-shell">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productStructuredData).replace(/</g, "\\u003c") }} />
    <header className="detail-top">
      <Link href="/" className="detail-back"><ArrowLeft size={16} /> Back to menu</Link>
      <div className="detail-top-actions"><button type="button" className="detail-share" onClick={shareProduct}><Share2 size={16} /> Share</button></div>
    </header>
    <div className="detail-grid">
      <div className="detail-gallery">
        <div className="detail-image">{selectedImage ? <><img src={selectedImage} alt={product.name} /><button type="button" className="detail-zoom-trigger" onClick={() => setImageZoomOpen(true)} aria-label="Zoom momo image"><ZoomIn size={18} /></button></> : <div className="detail-image-placeholder">Momo photo coming soon</div>}</div>
        {gallery.length > 1 && <div className="detail-thumbnails" aria-label="More momo photos">{gallery.map((url, index) => <button type="button" key={url} className={selectedImage === url ? "detail-thumb active" : "detail-thumb"} onClick={() => setSelectedImage(url)} aria-label={`Show momo photo ${index + 1}`}><img src={url} alt={`${product.name} view ${index + 1}`} /></button>)}</div>}
      </div>
      <section className="detail-copy">
        <p className="eyebrow">{product.category?.name || "CLOUD MOMOS MENU"}</p><h1>{product.name}</h1>
        <div className="detail-price">{money(Number(product.price))}{product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && <del>{money(Number(product.compare_at_price))}</del>}</div>
        <p className="detail-stock">{stock > 0 ? (stock < 5 ? "Only " + stock + " boxes left" : "Available to order") : "Currently out of stock"}</p>
        <p className="detail-description">{product.description || "A Cloud Momos favourite, prepared with care. Every box contains 6 pieces."}</p>
        <div className="detail-quantity"><span>Boxes · 6 pieces each</span><div><button onClick={() => setQty(v => Math.max(1, v - 1))} disabled={qty <= 1}><Minus size={14} /></button><b>{qty}</b><button onClick={() => setQty(v => Math.min(stock, 10, v + 1))} disabled={qty >= stock || qty >= 10}><Plus size={14} /></button></div></div>
        {purchaseError && <p className="detail-size-error" role="alert">{purchaseError}</p>}
        <div className="detail-actions">
          <button className="primary-btn" onClick={inBoxQty > 0 ? openBox : addToBox} disabled={stock <= 0}>{inBoxQty > 0 ? "View Your Box (" + inBoxQty + ")" : "Add to Box"} {inBoxQty > 0 ? <ShoppingBag size={16} /> : <Plus size={16} />}</button>
          <button className="order-now-btn" onClick={buyNow} disabled={stock <= 0}>Buy Now <ArrowRight size={16} /></button>
        </div>
        {added && <p className="detail-added"><Check size={15} /> Added to Your Box. <button type="button" onClick={openBox}>View Your Box</button></p>}
        {shareMessage && <p className="detail-share-message" role="status">{shareMessage}</p>}
        <a className="product-whatsapp-help" href={"https://wa.me/8801969419302?text=" + encodeURIComponent("Hello Cloud Momos, I have a question about " + product.name + ": https://cloudmomos.vercel.app/products/" + product.slug)} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Ask Cloud Momos on WhatsApp</a>
        <div className="detail-assurance"><div><b>Cash on Delivery</b><small>Pay when your order arrives</small></div><div><b>6 pieces per box</b><small>Shown clearly before checkout</small></div><div><b>Need help?</b><small><Link href="/faq">Read our momo FAQs</Link></small></div></div>
        <div className="detail-delivery-card">
          <div className="detail-delivery-title"><Truck size={18} /><span><b>Delivery in selected Sylhet areas</b><small>Your area's delivery charge appears at checkout</small></span></div>
          <p>Choose an active delivery area to see the exact fee before placing your order. Frozen momos are uncooked; cook thoroughly before eating.</p>
          <div><Link href="/shipping">Delivery information</Link><Link href="/returns">Order care</Link></div>
        </div>
      </section>
    </div>
    <div className="mobile-sticky-purchase" aria-label="Quick momo order">
      <div className="mobile-sticky-price"><small>{stock > 0 ? (stock < 5 ? "FEW BOXES LEFT" : "READY TO ORDER") : "OUT OF STOCK"}</small><b>{money(Number(product.price))}</b></div>
      <div className="mobile-sticky-actions">
        <button type="button" className="mobile-sticky-add" disabled={stock <= 0} onClick={() => inBoxQty > 0 ? openBox() : addToBox()}>{inBoxQty > 0 ? "View Box" : "Add to Box"}</button>
        <button type="button" className="mobile-sticky-order" disabled={stock <= 0} onClick={buyNow}>Buy Now</button>
      </div>
    </div>
    {imageZoomOpen && selectedImage && <div className="detail-image-lightbox" role="dialog" aria-modal="true" aria-label="Momo photo preview" onClick={() => setImageZoomOpen(false)}><button type="button" aria-label="Close photo preview" onClick={() => setImageZoomOpen(false)}><X size={22} /></button><img src={selectedImage} alt={product.name + " enlarged"} onClick={event => event.stopPropagation()} /></div>}
  </main>;
}
