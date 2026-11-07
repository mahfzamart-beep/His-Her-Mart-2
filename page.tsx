"use client";

import { useMemo, useState } from "react";
import { Search, ShoppingBag, Heart, Menu, X, ArrowRight, Plus, Minus, Sparkles } from "lucide-react";

type Product = { id: number; name: string; category: string; price: number; oldPrice?: number; image: string; tag?: string };

const categories = ["All", "Men's Fashion", "Women's Fashion", "Beauty", "Shoes", "Watches", "Bags", "Home & Lifestyle"];
const products: Product[] = [
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
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const visibleProducts = useMemo(() => products.filter(p =>
    (category === "All" || p.category === category) &&
    `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase())
  ), [category, query]);

  const cartItems = products.filter(p => cart[p.id]);
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const subtotal = cartItems.reduce((sum, p) => sum + p.price * cart[p.id], 0);
  const changeQty = (id: number, delta: number) => setCart(old => {
    const next = { ...old, [id]: Math.max(0, (old[id] || 0) + delta) };
    if (!next[id]) delete next[id];
    return next;
  });

  return (
    <main>
      <div className="announcement">A little something for every style · Discover the latest arrivals</div>
      <header className="header">
        <button className="icon-btn mobile-toggle" aria-label="Open menu" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X /> : <Menu />}</button>
        <a className="brand" href="#"><span>H<span className="amp">&</span>H</span><small>HIS & HERS MART</small></a>
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
        <div className="story-copy"><p className="eyebrow">A BETTER WAY TO BROWSE</p><h2>Made for <em>every you.</em></h2><p>His & Hers Mart brings together considered fashion, useful finds and everyday little luxuries. A simpler, more thoughtful way to shop for the people and moments that matter.</p><a href="#shop" className="text-link">Get to know our collection <ArrowRight size={16} /></a></div>
      </section>

      <section className="newsletter">
        <p className="eyebrow">NOTES FROM THE MART</p><h2>A little inspiration,<br /><em>straight to your inbox.</em></h2>
        <form onSubmit={e => { e.preventDefault(); if (email.includes("@")) setSubscribed(true); }}><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address" /><button>{subscribed ? "THANK YOU" : "SIGN ME UP"} <ArrowRight size={15} /></button></form>
        <small>{subscribed ? "Thanks for joining us. This preview form does not yet save subscriptions." : "By subscribing, you agree to receive occasional updates from us."}</small>
      </section>

      <footer><a className="brand footer-brand" href="#"><span>H<span className="amp">&</span>H</span><small>HIS & HERS MART</small></a><p>Modern Shopping · For Him & Her</p><div>© 2026 His & Hers Mart. All rights reserved.</div></footer>

      {cartOpen && <div className="overlay" onClick={() => setCartOpen(false)}><aside className="cart-drawer" onClick={e => e.stopPropagation()}>
        <div className="cart-title"><h2>Your bag <span>({cartCount})</span></h2><button className="icon-btn" onClick={() => setCartOpen(false)}><X /></button></div>
        {cartItems.length === 0 ? <div className="empty-cart"><ShoppingBag size={34} /><p>Your bag is waiting for something lovely.</p><button className="primary-btn" onClick={() => setCartOpen(false)}>Continue shopping</button></div> : <>
          <div className="cart-list">{cartItems.map(p => <div className="cart-item" key={p.id}><img src={p.image} alt={p.name} /><div className="cart-item-info"><b>{p.name}</b><span>{money(p.price)}</span><div className="qty"><button onClick={() => changeQty(p.id, -1)}><Minus size={13} /></button>{cart[p.id]}<button onClick={() => changeQty(p.id, 1)}><Plus size={13} /></button></div></div></div>)}</div>
          <div className="cart-bottom"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><small>Delivery charge calculated at checkout.</small><button className="primary-btn checkout" onClick={() => alert("Checkout is a preview only. Order processing will be added in a later step.")}>Continue to checkout <ArrowRight size={16} /></button></div>
        </>}
      </aside></div>}
    </main>
  );
}
