"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import UnboxingNotice from "../components/UnboxingNotice";
import { supabase } from "../lib/supabase";
import { Search, ShoppingBag, Heart, Menu, X, ArrowRight, Plus, Minus, Sparkles } from "lucide-react";

type Product = { id: string | number; name: string; category: string; price: number; oldPrice?: number; image: string; tag?: string };
type OrderConfirmation = {
  order_number: string;
  subtotal: number;
  total: number;
  order_status: string;
  payment_method: string;
};

const categories = ["All", "Men's Fashion", "Women's Fashion", "Beauty", "Shoes", "Watches", "Bags", "Home & Lifestyle"];
const fallbackProducts: Product[] = [
  { id: 1, name: "Everyday Linen Shirt", category: "Men's Fashion", price: 1290, oldPrice: 1590, image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=900&q=85", tag: "Bestseller" },
  { id: 2, name: "Classic Women's Handbag", category: "Bags", price: 1850, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&q=85", tag: "New" },
  { id: 3, name: "Minimal Gold Watch", category: "Watches", price: 2250, oldPrice: 2690, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=85" },
  { id: 4, name: "Soft Glow Skincare Set", category: "Beauty", price: 990, image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=900&q=85" },
  { id: 5, name: "Everyday Sneakers", category: "Shoes", price: 2190, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=85", tag: "Popular" },
  { id: 6, name: "Relaxed Fit Blazer", category: "Women's Fashion", price: 2890, oldPrice: 3290, image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=900&q=85" },
  { id: 7, name: "Canvas Weekend Tote", category: "Bags", price: 890, image: "https://images.unsplash.com/photo-1590878400972-3c4a5b9a9d1c?w=900&q=85" },
  { id: 8, name: "Modern Ceramic Vase", category: "Home & Lifestyle", price: 1150, image: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=900&q=85" }
];

const money = (amount: number) => `৳${amount.toLocaleString("en-BD")}`;

export default function Home() {
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [category, setCategory] = useState("All");

  useEffect(() => {
    let cancelled = false;
    async function loadProducts() {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("products")
        .select("id,name,price,compare_at_price,image_url,is_featured,category:categories(slug)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (cancelled || error || !data?.length) return;
      const labels: Record<string, string> = {
        "mens-fashion": "Men's Fashion",
        "womens-fashion": "Women's Fashion",
        "beauty-cosmetics": "Beauty",
        "shoes-footwear": "Shoes",
        "watches-accessories": "Watches",
        "bags-wallets": "Bags",
        "home-lifestyle": "Home & Lifestyle",
        "electronics": "Electronics"
      };
      const mapped: Product[] = data.map((row: any) => ({
        id: row.id,
        name: row.name,
        category: labels[row.category?.slug] || "All",
        price: Number(row.price),
        oldPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
        image: row.image_url || fallbackProducts[0].image,
        tag: row.is_featured ? "Featured" : undefined
      }));
      setProducts(mapped);
    }
    loadProducts();
    return () => { cancelled = true; };
  }, []);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [wishlist, setWishlist] = useState<(string | number)[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderSuccessOpen, setOrderSuccessOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderConfirmation | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");
  const [addressLine, setAddressLine] = useState("");

  const visibleProducts = useMemo(() => products.filter(p =>
    (category === "All" || p.category === category) &&
    `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase())
  ), [category, query]);

  const cartItems = products.filter(p => cart[p.id]);
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const subtotal = cartItems.reduce((sum, p) => sum + p.price * cart[p.id], 0);
  const changeQty = (id: string | number, delta: number) => setCart(old => {
    const next = { ...old, [id]: Math.max(0, (old[id] || 0) + delta) };
    if (!next[id]) delete next[id];
    return next;
  });

  const handlePlaceOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOrderError("");

    if (!supabase) {
      setOrderError("Secure checkout is not available right now. Please try again later.");
      return;
    }
    if (!policyAccepted) {
      setOrderError("Please read and accept the unboxing video notice.");
      return;
    }
    if (cartItems.length === 0 || cartItems.some(item => typeof item.id !== "string" || !/^[0-9a-f-]{36}$/i.test(item.id))) {
      setOrderError("Your cart needs to refresh before checkout. Please close checkout and try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-guest-order", {
        body: {
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: customerEmail.trim() || null,
          shipping_address: {
            district: district.trim(),
            area: area.trim(),
            address_line: addressLine.trim(),
          },
          items: cartItems.map(item => ({
            product_id: String(item.id),
            quantity: cart[item.id],
          })),
          accept_unboxing_policy: true,
          website: "",
        },
      });

      if (error) throw error;
      const confirmation = data?.order as OrderConfirmation;
      if (!confirmation?.order_number) {
        throw new Error("The order response could not be verified. Please contact the store before trying again.");
      }
      setOrderResult({
        ...confirmation,
        subtotal: Number(confirmation.subtotal),
        total: Number(confirmation.total),
      });
      setCart({});
      setCheckoutOpen(false);
      setCartOpen(false);
      setOrderSuccessOpen(true);
      setPolicyAccepted(false);
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : "We could not place your order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main>
      <div className="announcement">A little something for every style · Discover the latest arrivals</div>
      <header className="header">
        <button className="icon-btn mobile-toggle" aria-label="Open menu" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X /> : <Menu />}</button>
        <a className="brand" href="#"><span>H<span className="amp">&</span>H</span><small>HIS & HER MART</small></a>
        <nav className={mobileMenu ? "nav nav-open" : "nav"}>
          <a href="#shop" onClick={() => setMobileMenu(false)}>Shop</a>
          <a href="#shop" onClick={() => { setCategory("Men's Fashion"); setMobileMenu(false); }}>For Him</a>
          <a href="#shop" onClick={() => { setCategory("Women's Fashion"); setMobileMenu(false); }}>For Her</a>
          <a href="#story" onClick={() => setMobileMenu(false)}>Our Story</a>
        </nav>
        <div className="header-actions">
          <label className="search-box"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products" /></label>
          <button className="icon-btn wishlist-head" aria-label="Wishlist"><Heart /></button>
          <button className="icon-btn bag-btn" aria-label="Shopping bag" onClick={() => setCartOpen(true)}><ShoppingBag /><span>{cartCount}</span></button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><Sparkles size={14} /> THE EVERYDAY EDIT</p>
          <h1>Good things.<br /><em>Great style.</em></h1>
          <p className="hero-text">Thoughtfully picked essentials for every side of you. Find your next favourite, all in one place.</p>
          <a className="primary-btn" href="#shop">Explore the collection <ArrowRight size={17} /></a>
          <div className="hero-note"><span /> MODERN SHOPPING · FOR HIM & HER</div>
        </div>
        <div className="hero-image-wrap">
          <div className="hero-image" role="img" aria-label="Neutral-toned fashion editorial" />
          <div className="hero-stamp">CURATED<br /><b>FOR YOU</b><span>✳</span></div>
        </div>
      </section>

      <section className="category-strip">
        <div><span className="cat-number">01</span><b>For Him</b><small>Everyday essentials</small></div>
        <div><span className="cat-number">02</span><b>For Her</b><small>Style that feels like you</small></div>
        <div><span className="cat-number">03</span><b>Little Luxuries</b><small>Details make the day</small></div>
      </section>

      <section className="shop-section" id="shop">
        <div className="section-heading">
          <div><p className="eyebrow">THE COLLECTION</p><h2>Find your <em>favourites.</em></h2></div>
          <p>Pieces to wear, use and love —<br />selected with you in mind.</p>
        </div>
        <div className="filters">
          <div className="category-filters">{categories.map(c => <button key={c} className={category === c ? "filter active" : "filter"} onClick={() => setCategory(c)}>{c}</button>)}</div>
          <span className="result-count">{visibleProducts.length} ITEMS</span>
        </div>
        <div className="product-grid">
          {visibleProducts.map(p => <article className="product-card" key={p.id}>
            <div className="product-image-wrap"><img src={p.image} alt={p.name} />
              {p.tag && <span className="product-tag">{p.tag}</span>}
              <button className={wishlist.includes(p.id) ? "wish active" : "wish"} aria-label="Toggle wishlist" onClick={() => setWishlist(w => w.includes(p.id) ? w.filter(x => x !== p.id) : [...w, p.id])}><Heart size={18} fill={wishlist.includes(p.id) ? "currentColor" : "none"} /></button>
              <button className="quick-add" onClick={() => changeQty(p.id, 1)}>ADD TO BAG <Plus size={14} /></button>
            </div>
            <div className="product-info"><div><p className="product-category">{p.category}</p><h3>{p.name}</h3></div><div className="price">{money(p.price)}{p.oldPrice && <del>{money(p.oldPrice)}</del>}</div></div>
          </article>)}
        </div>
        {visibleProducts.length === 0 && <div className="empty">No products found. Try another search or category.</div>}
      </section>

      <section className="story" id="story">
        <div className="story-image" />
        <div className="story-copy"><p className="eyebrow">A BETTER WAY TO BROWSE</p><h2>Made for <em>every you.</em></h2><p>His & Her Mart brings together considered fashion, useful finds and everyday little luxuries. A simpler, more thoughtful way to shop for the people and moments that matter.</p><a href="#shop" className="text-link">Get to know our collection <ArrowRight size={16} /></a></div>
      </section>

      <section className="newsletter">
        <p className="eyebrow">NOTES FROM THE MART</p><h2>A little inspiration,<br /><em>straight to your inbox.</em></h2>
        <form onSubmit={e => { e.preventDefault(); if (email.includes("@")) setSubscribed(true); }}><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address" /><button>{subscribed ? "THANK YOU" : "SIGN ME UP"} <ArrowRight size={15} /></button></form>
        <small>{subscribed ? "Thanks for joining us. This preview form does not yet save subscriptions." : "By subscribing, you agree to receive occasional updates from us."}</small>
      </section>

      <footer><a className="brand footer-brand" href="#"><span>H<span className="amp">&</span>H</span><small>HIS & HER MART</small></a><p>Modern Shopping · For Him & Her</p><div>© 2026 His & Her Mart. All rights reserved.</div></footer>

      {cartOpen && <div className="overlay" onClick={() => setCartOpen(false)}><aside className="cart-drawer" onClick={e => e.stopPropagation()}>
        <div className="cart-title"><h2>Your bag <span>({cartCount})</span></h2><button className="icon-btn" onClick={() => setCartOpen(false)}><X /></button></div>
        {cartItems.length === 0 ? <div className="empty-cart"><ShoppingBag size={34} /><p>Your bag is waiting for something lovely.</p><button className="primary-btn" onClick={() => setCartOpen(false)}>Continue shopping</button></div> : <>
          <div className="cart-list">{cartItems.map(p => <div className="cart-item" key={p.id}><img src={p.image} alt={p.name} /><div className="cart-item-info"><b>{p.name}</b><span>{money(p.price)}</span><div className="qty"><button onClick={() => changeQty(p.id, -1)}><Minus size={13} /></button>{cart[p.id]}<button onClick={() => changeQty(p.id, 1)}><Plus size={13} /></button></div></div></div>)}</div>
          <div className="cart-bottom"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><small>Delivery charge calculated at checkout.</small><button className="primary-btn checkout" onClick={() => { setOrderError(""); setCheckoutOpen(true); }}>Continue to checkout <ArrowRight size={16} /></button></div>
        </>}
      </aside></div>}

      {checkoutOpen && <div className="overlay checkout-overlay" onClick={() => setCheckoutOpen(false)}>
        <section className="checkout-panel" role="dialog" aria-modal="true" aria-labelledby="checkout-title" onClick={e => e.stopPropagation()}>
          <div className="checkout-header">
            <div><p className="eyebrow">ALMOST THERE</p><h2 id="checkout-title">Delivery details</h2></div>
            <button className="icon-btn" type="button" aria-label="Close checkout" onClick={() => setCheckoutOpen(false)}><X /></button>
          </div>
          <form onSubmit={handlePlaceOrder}>
            <div className="checkout-fields">
              <label>Full name <input required minLength={2} maxLength={100} value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Name of the recipient" /></label>
              <label>Mobile number <input required type="tel" inputMode="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="01XXXXXXXXX" /></label>
              <label>Email address <span className="optional-label">Optional</span><input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="name@example.com" /></label>
              <label>District <input required minLength={2} value={district} onChange={e => setDistrict(e.target.value)} placeholder="e.g. Dhaka" /></label>
              <label>Area / Thana <span className="optional-label">Optional</span><input value={area} onChange={e => setArea(e.target.value)} placeholder="Area, thana or upazila" /></label>
              <label className="address-field">Full delivery address <textarea required minLength={5} value={addressLine} onChange={e => setAddressLine(e.target.value)} placeholder="House, road, area and nearby landmark" rows={3} /></label>
            </div>

            <div className="payment-choice">
              <span className="payment-choice-title">Payment method</span>
              <div className="cod-option"><span className="cod-radio">✓</span><span><b>Cash on Delivery</b><small>Pay when your parcel arrives</small></span></div>
              <small className="payment-note">bKash and Nagad online payments will be enabled after merchant gateway setup.</small>
            </div>

            <div className="checkout-total">
              <div><span>Product subtotal</span><b>{money(subtotal)}</b></div>
              <div><span>Delivery charge</span><b>To be confirmed</b></div>
              <small>The delivery charge will be shared by our team before dispatch. The amount above is for products only.</small>
            </div>

            <UnboxingNotice checked={policyAccepted} onCheckedChange={setPolicyAccepted} />
            {orderError && <p className="checkout-error" role="alert">{orderError}</p>}
            <div className="checkout-actions">
              <button type="button" className="back-to-bag" onClick={() => setCheckoutOpen(false)}>Back to bag</button>
              <button type="submit" className="primary-btn place-order-btn" disabled={isSubmitting || cartItems.length === 0}>
                {isSubmitting ? "PLACING ORDER..." : "PLACE COD ORDER"} <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </section>
      </div>}

      {orderSuccessOpen && orderResult && <div className="overlay order-success-overlay">
        <section className="order-success-panel" role="dialog" aria-modal="true" aria-labelledby="order-success-title">
          <div className="success-mark">✓</div>
          <p className="eyebrow">HIS & HER MART</p>
          <h2 id="order-success-title">Congratulations!<br /><em>Your order has been received.</em></h2>
          <p className="success-intro">Thank you for shopping with us. Our team will contact you to confirm the delivery charge and dispatch details.</p>
          <div className="order-reference">
            <span>YOUR ORDER NUMBER</span>
            <strong>{orderResult.order_number}</strong>
            <div><span>Order status</span><b>Awaiting store confirmation</b></div>
            <div><span>Payment</span><b>Cash on Delivery</b></div>
            <div><span>Product subtotal</span><b>{money(orderResult.subtotal)}</b></div>
            <small>Delivery charge is not included yet and will be confirmed before dispatch.</small>
          </div>
          <UnboxingNotice showConsent={false} />
          <button className="primary-btn success-close" onClick={() => setOrderSuccessOpen(false)}>Continue shopping <ArrowRight size={16} /></button>
        </section>
      </div>}
    </main>
  );
}
