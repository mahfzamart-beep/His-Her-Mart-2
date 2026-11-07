"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { FormEvent } from "react";
import UnboxingNotice from "../components/UnboxingNotice";
import { supabase } from "../lib/supabase";
import { Search, ShoppingBag, Heart, Menu, X, ArrowRight, Plus, Minus, Sparkles, Truck, MessageCircle, ShieldCheck } from "lucide-react";

type Product = { id: string | number; slug: string; name: string; category: string; price: number; oldPrice?: number; image: string; tag?: string; freeShippingEligible?: boolean; stockQuantity?: number; sizeOptions?: string[] };
type CartLine = { key: string; productId: string; size: string | null; quantity: number; product: Product };
const makeCartKey = (productId: string, size?: string | null) => size ? `${productId}::${encodeURIComponent(size)}` : productId;
const parseCartKey = (key: string) => { const splitAt = key.indexOf("::"); if (splitAt < 0) return { productId: key, size: null as string | null }; const rawSize = key.slice(splitAt + 2); let size = rawSize; try { size = decodeURIComponent(rawSize); } catch { /* Keep the stored value readable if legacy browser data is malformed. */ } return { productId: key.slice(0, splitAt), size }; };
type OrderConfirmation = {
  order_number: string;
  subtotal: number;
  total: number;
  order_status: string;
  payment_method: string;
  delivery_charge: number;
  free_shipping_applied: boolean;
  free_shipping_eligible_quantity: number;
};

const defaultCategories = ["All", "Men's Fashion", "Women's Fashion", "Beauty & Cosmetics", "Shoes & Footwear", "Watches & Accessories", "Bags & Wallets", "Electronics", "Home & Lifestyle", "Kids & Baby", "Mother & Baby Care", "Health & Wellness", "Grocery & Food", "Kitchen & Dining", "Furniture & Home Decor", "Home Appliances", "Mobiles & Accessories", "Computers & Office", "Sports & Outdoors", "Toys & Games", "Books & Stationery", "Automotive & Motorbikes", "Pet Supplies", "Travel & Luggage", "Jewellery", "Men's Grooming", "Garden & Outdoor Living"];
const fallbackProducts: Product[] = [
  { id: 1, slug: "everyday-linen-shirt", name: "Everyday Linen Shirt", category: "Men's Fashion", price: 1290, oldPrice: 1590, image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=900&q=85", tag: "Bestseller" },
  { id: 2, slug: "classic-womens-handbag", name: "Classic Women's Handbag", category: "Bags & Wallets", price: 1850, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&q=85", tag: "New" },
  { id: 3, slug: "minimal-gold-watch", name: "Minimal Gold Watch", category: "Watches & Accessories", price: 2250, oldPrice: 2690, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=85" },
  { id: 4, slug: "soft-glow-skincare-set", name: "Soft Glow Skincare Set", category: "Beauty & Cosmetics", price: 990, image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=900&q=85" },
  { id: 5, slug: "everyday-sneakers", name: "Everyday Sneakers", category: "Shoes & Footwear", price: 2190, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=85", tag: "Popular" },
  { id: 6, slug: "relaxed-fit-blazer", name: "Relaxed Fit Blazer", category: "Women's Fashion", price: 2890, oldPrice: 3290, image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=900&q=85" },
  { id: 7, slug: "canvas-weekend-tote", name: "Canvas Weekend Tote", category: "Bags & Wallets", price: 890, image: "https://images.unsplash.com/photo-1590878400972-3c4a5b9a9d1c?w=900&q=85" },
  { id: 8, slug: "modern-ceramic-vase", name: "Modern Ceramic Vase", category: "Home & Lifestyle", price: 1150, image: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=900&q=85" }
];

const money = (amount: number) => `৳${amount.toLocaleString("en-BD")}`;

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [catalogReady, setCatalogReady] = useState(false);
  const [category, setCategory] = useState("All");

  useEffect(() => {
    let cancelled = false;
    if (!supabase) {
      setProducts(fallbackProducts.map((item, index) => ({
        ...item,
        id: ["f384859e-941b-4656-b3f1-c72ef49b108c", "ba8e7b95-7f11-4024-a4fd-461b6000f61f", "36e4f88b-6e23-41e0-9a4b-79be9acb1d61", "560b2af6-d324-4196-9b43-48b4055ad247", "37a8831d-485f-4357-9263-53c3b39b7acf", "9ef0d6c9-948b-44d9-9606-fafb806e7fff", "c172806b-7e65-4388-a81c-e411a1682bbb", "4c252b52-300f-46dc-9242-fccb57770f63"][index],
        stockQuantity: [20, 15, 12, 18, 10, 8, 20, 9][index]
      })));
      setCatalogReady(true);
      return;
    }

    const demoIds = [
      "f384859e-941b-4656-b3f1-c72ef49b108c",
      "ba8e7b95-7f11-4024-a4fd-461b6000f61f",
      "36e4f88b-6e23-41e0-9a4b-79be9acb1d61",
      "560b2af6-d324-4196-9b43-48b4055ad247",
      "37a8831d-485f-4357-9263-53c3b39b7acf",
      "9ef0d6c9-948b-44d9-9606-fafb806e7fff",
      "c172806b-7e65-4388-a81c-e411a1682bbb",
      "4c252b52-300f-46dc-9242-fccb57770f63"
    ];
    const showDemoProducts = () => {
      if (cancelled) return;
      setProducts(fallbackProducts.map((item, index) => ({
        ...item, id: demoIds[index], stockQuantity: [20, 15, 12, 18, 10, 8, 20, 9][index]
      })));
      setCatalogReady(true);
    };

    // Never let a slow catalogue request keep the entire storefront in a
    // loading state. Show the seeded demo catalogue quickly, then replace it
    // with the live Supabase products as soon as that request completes.
    const fallbackTimer = window.setTimeout(showDemoProducts, 1800);

    // Categories are helpful for labels and filters, but must not block products.
    const categoryRequest = supabase
      .from("categories")
      .select("id,name,slug")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    void Promise.resolve(categoryRequest).then(({ data, error }) => {
      if (!cancelled && !error && data?.length) {
        setCategories(["All", ...data.map((item: any) => item.name)]);
      }
    }).catch(() => undefined);

    async function loadProducts() {
      try {
        const { data, error } = await supabase!
          .from("products")
          .select("id,category_id,slug,name,price,compare_at_price,image_url,is_featured,free_shipping_eligible,stock_quantity,size_options,size_type")
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        if (cancelled) return;
        if (error) throw error;

        if (!data?.length) {
          window.clearTimeout(fallbackTimer);
          showDemoProducts();
          return;
        }

        // Give the independent category request a brief chance to finish;
        // product rendering itself never waits indefinitely for categories.
        const categoryResult = await Promise.race([
          categoryRequest,
          new Promise<{ data: null; error: null }>(resolve => window.setTimeout(() => resolve({ data: null, error: null }), 700))
        ]);
        const categoryById = new Map((categoryResult.data || []).map((item: any) => [item.id, item.name]));
        if (cancelled) return;
        window.clearTimeout(fallbackTimer);
        const mapped: Product[] = data.map((row: any) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          category: categoryById.get(row.category_id) || "All",
          price: Number(row.price),
          oldPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
          image: row.image_url || fallbackProducts[0].image,
          tag: row.is_featured ? "Featured" : undefined,
          freeShippingEligible: row.free_shipping_eligible === true,
          stockQuantity: Number(row.stock_quantity ?? 0),
          sizeOptions: Array.isArray(row.size_options) ? row.size_options.filter((size: unknown): size is string => typeof size === "string" && !!size.trim()) : []
        }));
        setProducts(mapped);
        setCatalogReady(true);
      } catch {
        // Keep the storefront usable with demo products during a transient
        // Supabase/network issue instead of leaving an endless spinner.
        window.clearTimeout(fallbackTimer);
        showDemoProducts();
      }
    }
    void loadProducts();
    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
    };
  }, []);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [wishlist, setWishlist] = useState<(string | number)[]>([]);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("hhm-cart-v1");
      const savedWishlist = localStorage.getItem("hhm-wishlist-v1");
      if (savedCart) setCart(JSON.parse(savedCart));
      if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
    } catch {
      localStorage.removeItem("hhm-cart-v1");
      localStorage.removeItem("hhm-wishlist-v1");
    } finally { setStorageReady(true); }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem("hhm-cart-v1", JSON.stringify(cart));
    localStorage.setItem("hhm-wishlist-v1", JSON.stringify(wishlist));
  }, [cart, wishlist, storageReady]);

  useEffect(() => {
    const syncSavedState = () => {
      try {
        setCart(JSON.parse(localStorage.getItem("hhm-cart-v1") || "{}"));
        setWishlist(JSON.parse(localStorage.getItem("hhm-wishlist-v1") || "[]"));
      } catch { /* Ignore malformed local browser data. */ }
    };
    window.addEventListener("storage", syncSavedState);
    window.addEventListener("hhm-storage-updated", syncSavedState);
    return () => {
      window.removeEventListener("storage", syncSavedState);
      window.removeEventListener("hhm-storage-updated", syncSavedState);
    };
  }, []);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [buyNow, setBuyNow] = useState<{ productId: string; quantity: number; size: string | null } | null>(null);
  const [orderSuccessOpen, setOrderSuccessOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderConfirmation | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [district, setDistrict] = useState("");
  const [deliveryZone, setDeliveryZone] = useState("");
  const [area, setArea] = useState("");
  const [addressLine, setAddressLine] = useState("");

  const visibleProducts = useMemo(() => products.filter(p =>
    (category === "All" || p.category === category) &&
    `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase())
  ), [category, query]);

  const cartLines: CartLine[] = Object.entries(cart).flatMap(([key, quantity]) => {
    const parsed = parseCartKey(key);
    const product = products.find(item => String(item.id) === parsed.productId);
    return product && quantity > 0 ? [{ key, productId: parsed.productId, size: parsed.size, quantity, product }] : [];
  });
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const subtotal = cartLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const freeShippingEligibleCount = cartLines.reduce((sum, line) => sum + (line.product.freeShippingEligible ? line.quantity : 0), 0);
  const freeShippingUnlocked = freeShippingEligibleCount >= 3;
  const checkoutLines: CartLine[] = buyNow
    ? (() => { const product = products.find(item => String(item.id) === buyNow.productId); return product ? [{ key: makeCartKey(buyNow.productId, buyNow.size), productId: buyNow.productId, size: buyNow.size, quantity: buyNow.quantity, product }] : []; })()
    : cartLines;
  const checkoutSubtotal = checkoutLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const checkoutFreeShippingEligibleCount = checkoutLines.reduce((sum, line) => sum + (line.product.freeShippingEligible ? line.quantity : 0), 0);
  const checkoutFreeShippingUnlocked = checkoutFreeShippingEligibleCount >= 3;
  const hasFreeShippingProducts = products.some(product => product.freeShippingEligible === true);
  const deliveryChargePreview = checkoutFreeShippingUnlocked ? 0 : deliveryZone === "inside_dhaka" ? 80 : deliveryZone === "outside_dhaka" ? 150 : null;
  useEffect(() => {
    if (!storageReady || !catalogReady) return;
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("buyNow");
    const openBag = params.get("openBag") === "1";
    if (productId) {
      const product = products.find(item => String(item.id) === productId);
      const requested = Math.max(1, Math.min(10, Number(params.get("qty") || 1)));
      const selectedSize = params.get("size");
      const availableSizes = product?.sizeOptions || [];
      if (product && Number(product.stockQuantity ?? 0) > 0 && (!availableSizes.length || (selectedSize && availableSizes.includes(selectedSize)))) {
        setBuyNow({ productId, quantity: Math.min(requested, Number(product.stockQuantity)), size: selectedSize || null });
        setCheckoutOpen(true);
      } else if (product && availableSizes.length && !selectedSize) {
        setOrderError("Please choose a size before ordering this product.");
      } else if (product && availableSizes.length && selectedSize && !availableSizes.includes(selectedSize)) {
        setOrderError("The selected size is not available. Please choose again.");
      } else {
        setOrderError("This product is currently unavailable. Please refresh the product page.");
      }
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("checkout") === "1") {
      setBuyNow(null);
      setCheckoutOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (openBag) {
      setCartOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [storageReady, catalogReady, products]);

  const startBuyNow = (product: Product) => {
    if (typeof product.id !== "string" || !/^[0-9a-f-]{36}$/i.test(product.id) || (product.stockQuantity ?? 0) <= 0) return;
    if (product.sizeOptions?.length) {
      window.location.assign("/products/" + product.slug);
      return;
    }
    setOrderError("");
    setBuyNow({ productId: product.id, quantity: 1, size: null });
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const changeQty = (key: string, delta: number) => setCart(old => {
    const { productId } = parseCartKey(key);
    const product = products.find(item => String(item.id) === productId);
    const otherSizeQuantity = Object.entries(old).reduce((sum, [otherKey, quantity]) => {
      if (otherKey === key) return sum;
      return parseCartKey(otherKey).productId === productId ? sum + quantity : sum;
    }, 0);
    const stockLimit = Math.max(0, Math.min(10, Number(product?.stockQuantity ?? 999) - otherSizeQuantity));
    const nextQuantity = Math.min(stockLimit, Math.max(0, (old[key] || 0) + delta));
    const next = { ...old };
    if (nextQuantity) next[key] = nextQuantity;
    else delete next[key];
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
    if (checkoutLines.length === 0 || checkoutLines.some(line => !/^[0-9a-f-]{36}$/i.test(line.productId) || (line.product.sizeOptions?.length && (!line.size || !line.product.sizeOptions.includes(line.size))))) {
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
            delivery_zone: deliveryZone,
            area: area.trim(),
            address_line: addressLine.trim(),
          },
          items: checkoutLines.map(line => ({
            product_id: line.productId,
            quantity: line.quantity,
            selected_size: line.size,
          })),
          accept_unboxing_policy: true,
          website: "",
        },
      });

      const response = data as { error?: string; order_received?: boolean; order_number?: string; order?: OrderConfirmation } | null;
      if (response?.order_received && response.order_number) {
        setOrderError(`Your order ${response.order_number} has already been received. Please contact WhatsApp +8801969419302 for confirmation and do not submit again.`);
        return;
      }
      if (error) throw error;
      if (response?.error) throw new Error(response.error);
      const confirmation = response?.order as OrderConfirmation;
      if (!confirmation?.order_number) {
        throw new Error("The order response could not be verified. Please contact the store before trying again.");
      }
      setOrderResult({
        ...confirmation,
        subtotal: Number(confirmation.subtotal),
        total: Number(confirmation.total),
      });
      if (!buyNow) setCart({});
      setBuyNow(null);
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
      <div className="announcement"><span>THOUGHTFULLY CHOSEN FINDS</span><i>·</i><span>DELIVERED ACROSS BANGLADESH</span></div>
      <header className="header">
        <button className="icon-btn mobile-toggle" aria-label="Open menu" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X /> : <Menu />}</button>
        <a className="brand" href="#"><span>H<span className="amp">&</span>H</span><small>HIS & HER MART</small></a>
        <nav className={mobileMenu ? "nav nav-open" : "nav"}>
          <a href="#shop" onClick={() => setMobileMenu(false)}>Shop All</a>
          <a href="#shop" onClick={() => { setCategory("Men's Fashion"); setMobileMenu(false); }}>For Him</a>
          <a href="#shop" onClick={() => { setCategory("Women's Fashion"); setMobileMenu(false); }}>For Her</a>
          <a href="#story" onClick={() => setMobileMenu(false)}>Our Story</a>
          <a href="/track-order" onClick={() => setMobileMenu(false)}>Track Order</a>
          <Link href="/faq" onClick={() => setMobileMenu(false)}>Help & FAQs</Link>
          <Link href="/wishlist" onClick={() => setMobileMenu(false)}>Wishlist ({wishlist.length})</Link>
        </nav>
        <div className="header-actions">
          <label className="search-box"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products" /></label>
          <Link className="icon-btn wishlist-head" href="/wishlist" aria-label={`Wishlist, ${wishlist.length} saved items`}><Heart /><span className="wishlist-count">{wishlist.length}</span></Link>
          <button className="icon-btn bag-btn" aria-label="Shopping bag" onClick={() => setCartOpen(true)}><ShoppingBag /><span>{cartCount}</span></button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><Sparkles size={14} /> THE EVERYDAY EDIT</p>
          <h1>Everyday pieces.<br /><em>Elevated.</em></h1>
          <p className="hero-text">A considered mix of style, essentials and little luxuries — chosen to make everyday shopping feel a little more special.</p>
          <a className="primary-btn" href="#shop">Discover the collection <ArrowRight size={17} /></a>
          <div className="hero-note"><span /> A MORE CONSIDERED WAY TO SHOP</div>
        </div>
        <div className="hero-image-wrap">
          <div className="hero-image" role="img" aria-label="Neutral-toned fashion editorial" />
          <div className="hero-stamp"><small>THE HHM EDIT</small><b>Considered<br />for everyday.</b><span>✳</span></div>
        </div>
      </section>

      <section className="category-strip">
        <div><span className="cat-number">01</span><b>For Him</b><small>Everyday essentials</small></div>
        <div><span className="cat-number">02</span><b>For Her</b><small>Style that feels like you</small></div>
        <div><span className="cat-number">03</span><b>Little Luxuries</b><small>Details make the day</small></div>
      </section>

      <section className="service-ribbon" aria-label="Shopping services">
        <div className="service-item"><span className="service-icon"><ShieldCheck size={19} /></span><span><b>Shop with confidence</b><small>Cash on delivery available</small></span></div>
        <div className="service-item"><span className="service-icon"><Truck size={19} /></span><span><b>Delivery across Bangladesh</b><small>৳80 in Dhaka · ৳150 outside</small></span></div>
        <a className="service-item service-help" href="https://wa.me/8801969419302" target="_blank" rel="noreferrer"><span className="service-icon"><MessageCircle size={19} /></span><span><b>Here to help</b><small>Chat with us on WhatsApp</small></span><ArrowRight size={15} /></a>
      </section>

      <section className="shop-section" id="shop">
        <div className="section-heading">
          <div><p className="eyebrow">THE COLLECTION</p><h2>Find your <em>favourites.</em></h2></div>
          <p>Style, essentials and everyday discoveries.<br />A thoughtful edit for him, her and home.</p>
        </div>
        <div className="filters">
          <div className="category-filters">{categories.map(c => <button key={c} className={category === c ? "filter active" : "filter"} onClick={() => setCategory(c)}>{c}</button>)}</div>
          <span className="result-count">{visibleProducts.length} ITEMS</span>
        </div>
        <div className="product-grid">
          {visibleProducts.map(p => <article className="product-card" key={p.id}>
            <div className="product-image-wrap"><Link href={"/products/" + p.slug} aria-label={`View ${p.name}`} className="product-image-link"><img src={p.image} alt={p.name} loading="lazy" decoding="async" /></Link>
              {p.tag && <span className="product-tag">{p.tag}</span>}
              {p.freeShippingEligible && <span className="free-shipping-product-tag">FREE SHIPPING</span>}
              <button className={wishlist.includes(p.id) ? "wish active" : "wish"} aria-label="Toggle wishlist" onClick={() => setWishlist(w => w.includes(p.id) ? w.filter(x => x !== p.id) : [...w, p.id])}><Heart size={18} fill={wishlist.includes(p.id) ? "currentColor" : "none"} /></button>
              <div className="product-card-actions"><button className="quick-add" disabled={(p.stockQuantity ?? 999) <= 0} onClick={() => p.sizeOptions?.length ? window.location.assign("/products/" + p.slug) : (cart[makeCartKey(String(p.id))] || 0) > 0 ? setCartOpen(true) : changeQty(makeCartKey(String(p.id)), 1)}>{(p.stockQuantity ?? 999) <= 0 ? "OUT OF STOCK" : p.sizeOptions?.length ? "CHOOSE SIZE" : (cart[makeCartKey(String(p.id))] || 0) > 0 ? "VIEW IN BAG" : "ADD TO BAG"} {(cart[makeCartKey(String(p.id))] || 0) > 0 && !p.sizeOptions?.length ? <ShoppingBag size={14} /> : <Plus size={14} />}</button><button className="quick-order" disabled={(p.stockQuantity ?? 999) <= 0 || typeof p.id !== "string" || !/^[0-9a-f-]{36}$/i.test(p.id)} onClick={() => startBuyNow(p)}>{p.sizeOptions?.length ? "CHOOSE SIZE" : "ORDER NOW"} <ArrowRight size={14} /></button></div>
            </div>
            <div className="product-info"><div><p className="product-category">{p.category}</p><h3><Link href={"/products/" + p.slug} className="product-name-link">{p.name}</Link></h3><small className="stock-note">{(p.stockQuantity ?? 999) <= 0 ? "Out of stock" : (p.stockQuantity ?? 999) < 5 ? `Only ${p.stockQuantity} left` : "In stock"}</small></div><div className="price">{money(p.price)}{p.oldPrice && <del>{money(p.oldPrice)}</del>}</div></div>
          </article>)}
        </div>
        {!catalogReady ? <div className="empty">Loading products…</div> : catalogError ? <div className="empty">{catalogError}</div> : visibleProducts.length === 0 ? <div className="empty">No products found. Try another search or category.</div> : null}
      </section>

      <section className="story" id="story">
        <div className="story-image" />
        <div className="story-copy"><p className="eyebrow">A BETTER WAY TO BROWSE</p><h2>Made for <em>every you.</em></h2><p>His & Her Mart brings together considered fashion, useful finds and everyday little luxuries. A simpler, more thoughtful way to shop for the people and moments that matter.</p><a href="#shop" className="text-link">Get to know our collection <ArrowRight size={16} /></a></div>
      </section>

      <section className="newsletter">
        <p className="eyebrow">PERSONAL SERVICE, ALWAYS</p>
        <h2>Need a little help?<br /><em>We are one message away.</em></h2>
        <p className="newsletter-copy">Questions about a product, delivery or your order? Talk to our team directly on WhatsApp.</p>
        <a className="primary-btn" href="https://wa.me/8801969419302" target="_blank" rel="noreferrer">Chat with our team <ArrowRight size={16} /></a>
      </section>

      <footer>
        <div className="footer-main">
          <div className="footer-brand-column">
            <a className="brand footer-brand" href="#"><span>H<span className="amp">&</span>H</span><small>HIS & HER MART</small></a>
            <p>Thoughtfully chosen finds for every side of life. A more considered way to shop for him, her and home.</p>
          </div>
          <div className="footer-column"><b>EXPLORE</b><a href="#shop">Shop all</a><a href="#shop" onClick={() => setCategory("Men's Fashion")}>For him</a><a href="#shop" onClick={() => setCategory("Women's Fashion")}>For her</a><a href="#story">Our story</a></div>
          <div className="footer-column"><b>HELP</b><a href="/track-order">Track an order</a><a href="/wishlist">Wishlist</a><a href="/faq">Help & FAQs</a></div>
          <div className="footer-column footer-contact"><b>GET IN TOUCH</b><span>Customer care</span><a href="https://wa.me/8801969419302" target="_blank" rel="noreferrer">WhatsApp · +880 1969-419302</a><span>Cash on delivery available</span></div>
        </div>
        <div className="footer-bottom"><span>© 2026 His & Her Mart. All rights reserved.</span><span>MODERN SHOPPING · FOR HIM & HER</span></div>
      </footer>

      {cartOpen && <div className="overlay" onClick={() => setCartOpen(false)}><aside className="cart-drawer" onClick={e => e.stopPropagation()}>
        <div className="cart-title"><h2>Your bag <span>({cartCount})</span></h2><button className="icon-btn" onClick={() => setCartOpen(false)}><X /></button></div>
        {cartLines.length === 0 ? <div className="empty-cart"><ShoppingBag size={34} /><p>Your bag is waiting for something lovely.</p><button className="primary-btn" onClick={() => setCartOpen(false)}>Continue shopping</button></div> : <>
          <div className="cart-list">{cartLines.map(line => <div className="cart-item" key={line.key}><img src={line.product.image} alt={line.product.name} /><div className="cart-item-info"><b>{line.product.name}</b>{line.size && <small className="cart-selected-size">Size: {line.size}</small>}<span>{money(line.product.price)}</span><div className="qty"><button onClick={() => changeQty(line.key, -1)}><Minus size={13} /></button>{line.quantity}<button onClick={() => changeQty(line.key, 1)}><Plus size={13} /></button></div></div></div>)}</div>
          <div className="cart-bottom"><div><span>Subtotal</span><b>{money(subtotal)}</b></div>{hasFreeShippingProducts && <div className={freeShippingUnlocked ? "free-shipping-progress unlocked" : "free-shipping-progress"}><b>{freeShippingUnlocked ? "Free shipping unlocked!" : "Selected-product free shipping"}</b><span>{freeShippingUnlocked ? "Your order qualifies for free delivery." : `Add ${Math.max(0, 3 - freeShippingEligibleCount)} more eligible item${3 - freeShippingEligibleCount === 1 ? "" : "s"} to unlock free shipping.`}</span></div>}<small>Delivery is ৳80 inside Dhaka or ৳150 outside Dhaka{hasFreeShippingProducts ? ". Selected eligible products may qualify for free shipping." : "."}</small><button className="primary-btn checkout" onClick={() => { setOrderError(""); setBuyNow(null); setCheckoutOpen(true); }}>Continue to checkout <ArrowRight size={16} /></button></div>
        </>}
      </aside></div>}

      {checkoutOpen && <div className="overlay checkout-overlay" onClick={() => { setCheckoutOpen(false); setBuyNow(null); }}>
        <section className="checkout-panel" role="dialog" aria-modal="true" aria-labelledby="checkout-title" onClick={e => e.stopPropagation()}>
          <div className="checkout-header">
            <div><p className="eyebrow">ALMOST THERE</p><h2 id="checkout-title">{buyNow ? "Order this product" : "Delivery details"}</h2></div>
            <button className="icon-btn" type="button" aria-label="Close checkout" onClick={() => { setCheckoutOpen(false); setBuyNow(null); }}><X /></button>
          </div>
          <p className="checkout-helper">{buyNow ? "Order Now starts checkout for the selected product. Complete your delivery details and confirm the COD order below." : "Complete your delivery details and confirm your Cash on Delivery order below."}</p>
          <div className="checkout-order-summary">
            <b>Order summary</b>
            {checkoutLines.map(line => <div key={line.key}><span>{line.product.name}{line.size ? ` · Size: ${line.size}` : ""} × {line.quantity}</span><strong>{money(line.product.price * line.quantity)}</strong></div>)}
          </div>
          <form onSubmit={handlePlaceOrder}>
            <div className="checkout-fields">
              <label>Full name <input required minLength={2} maxLength={100} value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Name of the recipient" /></label>
              <label>Mobile number <input required type="tel" inputMode="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="01XXXXXXXXX" /></label>
              <label>Email address <span className="optional-label">Optional</span><input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="name@example.com" /></label>
              <label>Delivery area<select required value={deliveryZone} onChange={e => setDeliveryZone(e.target.value)}><option value="">Choose delivery area</option><option value="inside_dhaka">Inside Dhaka — ৳80</option><option value="outside_dhaka">Outside Dhaka — ৳150</option></select></label>
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
              <div><span>{buyNow ? "Selected product subtotal" : "Product subtotal"}</span><b>{money(checkoutSubtotal)}</b></div>
              <div><span>Delivery charge</span><b>{checkoutFreeShippingUnlocked ? "FREE" : deliveryChargePreview === null ? "Select delivery area" : money(deliveryChargePreview)}</b></div>
              <div><span>Estimated total</span><b>{deliveryChargePreview === null ? "—" : money(checkoutSubtotal + deliveryChargePreview)}</b></div>
              <small>{checkoutFreeShippingUnlocked ? "Free shipping unlocked: your selected order contains at least 3 quantity units from eligible products." : `Inside Dhaka: ৳80 · Outside Dhaka: ৳150. Choose the correct delivery area above.${hasFreeShippingProducts ? " Selected eligible products may qualify for free shipping." : ""}`}</small>
            </div>

            <UnboxingNotice checked={policyAccepted} onCheckedChange={setPolicyAccepted} />
            {orderError && <p className="checkout-error" role="alert">{orderError}</p>}
            <div className="checkout-actions">
              <button type="button" className="back-to-bag" onClick={() => { setCheckoutOpen(false); setBuyNow(null); }}>Back to bag</button>
              <button type="submit" className="primary-btn place-order-btn" disabled={isSubmitting || checkoutLines.length === 0}>
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
          <p className="success-intro">Thank you for shopping with us. Our team will verify product availability and coordinate fulfilment with the supplier.</p>
          <div className="order-reference">
            <span>YOUR ORDER NUMBER</span>
            <strong>{orderResult.order_number}</strong>
            <div><span>Order status</span><b>Awaiting store confirmation</b></div>
            <div><span>Payment</span><b>Cash on Delivery</b></div>
            <div><span>Product subtotal</span><b>{money(orderResult.subtotal)}</b></div>
            <div><span>Delivery charge</span><b>{orderResult.free_shipping_applied ? "FREE" : money(orderResult.delivery_charge)}</b></div>
            <div><span>Total</span><b>{money(orderResult.total)}</b></div>
            <small>{orderResult.free_shipping_applied ? `Free shipping applied to ${orderResult.free_shipping_eligible_quantity} eligible item(s).` : `Delivery charge applied: ${orderResult.delivery_charge === 80 ? "Inside Dhaka ৳80" : "Outside Dhaka ৳150"}.`}</small>
          </div>
          <UnboxingNotice showConsent={false} />
          <button className="primary-btn success-close" onClick={() => setOrderSuccessOpen(false)}>Continue shopping <ArrowRight size={16} /></button>
        </section>
      </div>}
    </main>
  );
}
