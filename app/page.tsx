"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { FormEvent } from "react";
import UnboxingNotice from "../components/UnboxingNotice";
import { supabase } from "../lib/supabase";
import { Search, ShoppingBag, Heart, Menu, X, ArrowRight, ArrowLeftRight, Eye, Plus, Minus, Sparkles, Truck, MessageCircle, ShieldCheck, Clock, Trash2 } from "lucide-react";

type Product = { id: string | number; slug: string; name: string; description?: string; category: string; price: number; oldPrice?: number; image: string; tag?: string; freeShippingEligible?: boolean; stockQuantity?: number; sizeOptions?: string[]; colorOptions?: string[] };
type CartLine = { key: string; productId: string; size: string | null; color: string | null; quantity: number; product: Product };
const makeCartKey = (productId: string, size?: string | null, color?: string | null) => size || color ? productId + "::" + encodeURIComponent(size || "") + "::" + encodeURIComponent(color || "") : productId;
const decodeCartPart = (value: string) => { try { return decodeURIComponent(value); } catch { return value; } };
const parseCartKey = (key: string) => {
  const splitAt = key.indexOf("::");
  if (splitAt < 0) return { productId: key, size: null as string | null, color: null as string | null };
  const productId = key.slice(0, splitAt);
  const options = key.slice(splitAt + 2);
  const secondSeparator = options.indexOf("::");
  if (secondSeparator < 0) return { productId, size: decodeCartPart(options) || null, color: null };
  return { productId, size: decodeCartPart(options.slice(0, secondSeparator)) || null, color: decodeCartPart(options.slice(secondSeparator + 2)) || null };
};
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
const money = (amount: number) => `৳${amount.toLocaleString("en-BD")}`;

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [catalogReady, setCatalogReady] = useState(false);
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("recommended");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [recentViewedIds, setRecentViewedIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!supabase) {
      setCatalogError("Our collection is temporarily unavailable. Please refresh or contact our team on WhatsApp.");
      setCatalogReady(true);
      return;
    }

    // Resolve the category lookup once and reuse the same promise below.
    // A timeout fallback here previously labelled every product as "All",
    // which made category and combined filters return an empty catalogue.
    const categoryPromise = Promise.resolve(
      supabase
        .from("categories")
        .select("id,name,slug")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
    );

    async function loadProducts() {
      try {
        const { data, error } = await supabase!
          .from("products")
          .select("id,category_id,slug,name,description,price,compare_at_price,image_url,is_featured,free_shipping_eligible,stock_quantity,size_options,size_type,color_options")
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        if (cancelled) return;
        if (error) throw error;

        if (!data?.length) {
          setProducts([]);
          setCatalogError("Our collection is being refreshed. Please check back soon.");
          setCatalogReady(true);
          return;
        }

        // Keep product-category mapping deterministic. Never use "All" as a
        // product category: it is a filter sentinel, not a real category.
        const categoryResult = await categoryPromise;
        if (cancelled) return;
        if (categoryResult.error) {
          console.warn("Unable to load product categories:", categoryResult.error);
        }
        const categoryRows = categoryResult.data || [];
        const categoryById = new Map(categoryRows.map((item: any) => [item.id, item.name]));
        const mapped: Product[] = data.map((row: any) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          description: typeof row.description === "string" ? row.description : "",
          category: categoryById.get(row.category_id) || "Uncategorised",
          price: Number(row.price),
          oldPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
          image: typeof row.image_url === "string" ? row.image_url : "",
          tag: row.is_featured ? "Featured" : undefined,
          freeShippingEligible: row.free_shipping_eligible === true,
          stockQuantity: Number(row.stock_quantity ?? 0),
          sizeOptions: Array.isArray(row.size_options) ? row.size_options.filter((size: unknown): size is string => typeof size === "string" && !!size.trim()) : [],
          colorOptions: Array.isArray(row.color_options) ? row.color_options.filter((color: unknown): color is string => typeof color === "string" && !!color.trim()) : []
        }));
        const categoriesWithProducts = new Set(mapped.map(product => product.category));
        const orderedCategories = categoryRows
          .map((item: any) => item.name)
          .filter((name: string) => categoriesWithProducts.has(name));
        if (categoriesWithProducts.has("Uncategorised")) orderedCategories.push("Uncategorised");
        setCategories(["All", ...orderedCategories]);
        setProducts(mapped);
        setCatalogReady(true);
      } catch (error) {
        if (cancelled) return;
        console.error("Unable to load the product catalogue:", error);
        setProducts([]);
        setCatalogError("We couldn't load the collection right now. Please refresh or contact customer support.");
        setCatalogReady(true);
      }
    }
    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);
  const [query, setQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");
  const [discountedOnly, setDiscountedOnly] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareReady, setCompareReady] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareNotice, setCompareNotice] = useState("");
  const [quickViewId, setQuickViewId] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [wishlist, setWishlist] = useState<(string | number)[]>([]);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("hhm-recently-viewed-v1") || "[]");
      setRecentViewedIds(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string").slice(0, 8) : []);
    } catch { setRecentViewedIds([]); }
  }, []);

  useEffect(() => {
    try {
      const savedCompare = JSON.parse(localStorage.getItem("hhm-compare-v1") || "[]");
      setCompareIds(Array.isArray(savedCompare) ? savedCompare.filter((id): id is string => typeof id === "string").slice(0, 3) : []);
    } catch { setCompareIds([]); }
    setCompareReady(true);
  }, []);

  useEffect(() => {
    if (!compareReady) return;
    localStorage.setItem("hhm-compare-v1", JSON.stringify(compareIds));
  }, [compareIds, compareReady]);

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
  const [buyNow, setBuyNow] = useState<{ productId: string; quantity: number; size: string | null; color: string | null } | null>(null);
  const [orderSuccessOpen, setOrderSuccessOpen] = useState(false);
  const [orderCopied, setOrderCopied] = useState(false);
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

  const visibleProducts = useMemo(() => {
    const filtered = products.filter(p =>
      (category === "All" || p.category === category) &&
      (!inStockOnly || Number(p.stockQuantity ?? 0) > 0) &&
      (!discountedOnly || Boolean(p.oldPrice && p.oldPrice > p.price)) &&
      (priceFilter === "all" ||
        (priceFilter === "under500" && p.price < 500) ||
        (priceFilter === "500to1000" && p.price >= 500 && p.price < 1000) ||
        (priceFilter === "1000to2500" && p.price >= 1000 && p.price < 2500) ||
        (priceFilter === "2500plus" && p.price >= 2500)) &&
      `${p.name} ${p.category} ${p.description || ""}`.toLowerCase().includes(query.trim().toLowerCase())
    );
    if (sortBy === "newest") filtered.sort((a, b) => products.indexOf(a) - products.indexOf(b));
    if (sortBy === "price-low") filtered.sort((a, b) => a.price - b.price);
    if (sortBy === "price-high") filtered.sort((a, b) => b.price - a.price);
    if (sortBy === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "recommended") filtered.sort((a, b) => Number(Boolean(b.tag)) - Number(Boolean(a.tag)));
    return filtered;
  }, [products, category, query, sortBy, inStockOnly, priceFilter, discountedOnly]);

  const recentViewedProducts = useMemo(() => recentViewedIds.map(id => products.find(product => String(product.id) === id)).filter((product): product is Product => Boolean(product)).filter(product => product.stockQuantity !== undefined).slice(0, 6), [recentViewedIds, products]);
  const compareProducts = useMemo(() => compareIds.map(id => products.find(product => String(product.id) === id)).filter((product): product is Product => Boolean(product)).slice(0, 3), [compareIds, products]);
  const quickViewProduct = useMemo(() => products.find(product => String(product.id) === quickViewId) || null, [products, quickViewId]);

  useEffect(() => {
    if (!quickViewId && !compareOpen && !cartOpen && !checkoutOpen && !orderSuccessOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (quickViewId) setQuickViewId(null);
      else if (compareOpen) setCompareOpen(false);
      else if (checkoutOpen) { setCheckoutOpen(false); setBuyNow(null); }
      else if (cartOpen) setCartOpen(false);
      else if (orderSuccessOpen) setOrderSuccessOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [quickViewId, compareOpen, cartOpen, checkoutOpen, orderSuccessOpen]);
  const clearRecentlyViewed = () => { setRecentViewedIds([]); localStorage.removeItem("hhm-recently-viewed-v1"); };

  const browseCategory = (nextCategory: string) => {
    setCategory(nextCategory);
    setQuery("");
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const clearCatalogFilters = () => {
    setCategory("All");
    setQuery("");
    setInStockOnly(false);
    setPriceFilter("all");
    setDiscountedOnly(false);
    setSortBy("recommended");
  };

  const cartLines: CartLine[] = Object.entries(cart).flatMap(([key, quantity]) => {
    const parsed = parseCartKey(key);
    const product = products.find(item => String(item.id) === parsed.productId);
    return product && quantity > 0 ? [{ key, productId: parsed.productId, size: parsed.size, color: parsed.color, quantity, product }] : [];
  });
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const subtotal = cartLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const freeShippingEligibleCount = cartLines.reduce((sum, line) => sum + (line.product.freeShippingEligible ? line.quantity : 0), 0);
  const freeShippingUnlocked = freeShippingEligibleCount >= 3;
  const checkoutLines: CartLine[] = buyNow
    ? (() => { const product = products.find(item => String(item.id) === buyNow.productId); return product ? [{ key: makeCartKey(buyNow.productId, buyNow.size, buyNow.color), productId: buyNow.productId, size: buyNow.size, color: buyNow.color, quantity: buyNow.quantity, product }] : []; })()
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
      const selectedColor = params.get("color");
      const availableSizes = product?.sizeOptions || [];
      const availableColors = product?.colorOptions || [];
      const sizeIsValid = !availableSizes.length || (!!selectedSize && availableSizes.includes(selectedSize));
      const colorIsValid = !availableColors.length || (!!selectedColor && availableColors.includes(selectedColor));
      if (product && Number(product.stockQuantity ?? 0) > 0 && sizeIsValid && colorIsValid) {
        setBuyNow({ productId, quantity: Math.min(requested, Number(product.stockQuantity)), size: selectedSize || null, color: selectedColor || null });
        setCheckoutOpen(true);
      } else if (product && availableSizes.length && !selectedSize) {
        setOrderError("Please choose a size before ordering this product.");
      } else if (product && availableSizes.length && selectedSize && !availableSizes.includes(selectedSize)) {
        setOrderError("The selected size is not available. Please choose again.");
      } else if (product && availableColors.length && !selectedColor) {
        setOrderError("Please choose a colour before ordering this product.");
      } else if (product && availableColors.length && selectedColor && !availableColors.includes(selectedColor)) {
        setOrderError("The selected colour is not available. Please choose again.");
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
    if (product.sizeOptions?.length || product.colorOptions?.length) {
      window.location.assign("/products/" + product.slug);
      return;
    }
    setOrderError("");
    setBuyNow({ productId: product.id, quantity: 1, size: null, color: null });
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const toggleCompare = (product: Product) => {
    const id = String(product.id);
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter(item => item !== id));
      setCompareNotice("");
      return;
    }
    if (compareIds.length >= 3) {
      setCompareNotice("You can compare up to 3 products at a time.");
      return;
    }
    setCompareIds([...compareIds, id]);
    setCompareNotice("");
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

  const quickAddToBag = (product: Product) => {
    if (product.sizeOptions?.length || product.colorOptions?.length) {
      window.location.assign("/products/" + product.slug);
      return;
    }
    changeQty(makeCartKey(String(product.id)), 1);
    setQuickViewId(null);
    setCartOpen(true);
  };

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
    if (checkoutLines.length === 0 || checkoutLines.some(line => !/^[0-9a-f-]{36}$/i.test(line.productId) || (line.product.sizeOptions?.length && (!line.size || !line.product.sizeOptions.includes(line.size))) || (line.product.colorOptions?.length && (!line.color || !line.product.colorOptions.includes(line.color))))) {
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
            selected_color: line.color,
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
      setOrderCopied(false);
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "OnlineStore",
        name: "His & Hers Mart",
        url: "https://his-and-her-mart.vercel.app",
        description: "Thoughtfully selected fashion, beauty, shoes, accessories and everyday essentials for him and her in Bangladesh.",
        telephone: "+8801969419302",
        areaServed: { "@type": "Country", name: "Bangladesh" },
        currenciesAccepted: "BDT",
        paymentAccepted: "Cash on Delivery"
      }).replace(/</g, "\\u003c") }} />
      <div className="announcement"><span>THOUGHTFULLY CHOSEN FINDS</span><i>·</i><span>DELIVERED ACROSS BANGLADESH</span></div>
      <header className="header">
        <button className="icon-btn mobile-toggle" aria-label="Open menu" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X /> : <Menu />}</button>
        <Link className="brand" href="/" aria-label="His & Hers Mart home"><img src="/brand/his-and-hers-logo.png" alt="His & Hers — Shop Smart. Live Better." /></Link>
        <nav className={mobileMenu ? "nav nav-open" : "nav"}>
          <a href="#shop" onClick={() => setMobileMenu(false)}>Shop All</a>
          <a href="#shop" onClick={() => { setCategory("Men's Fashion"); setMobileMenu(false); }}>For Him</a>
          <a href="#shop" onClick={() => { setCategory("Women's Fashion"); setMobileMenu(false); }}>For Her</a>
          <a href="#story" onClick={() => setMobileMenu(false)}>Our Story</a>
          <a href="/track-order" onClick={() => setMobileMenu(false)}>Track Order</a>
          <Link href="/faq" onClick={() => setMobileMenu(false)}>Help & FAQs</Link>
          <Link href="/wishlist" onClick={() => setMobileMenu(false)}>Wishlist ({wishlist.length})</Link>
          <Link href="/install" className="nav-install-link" onClick={() => setMobileMenu(false)}>Install App</Link>
        </nav>
        <div className="header-actions">
          <label className="search-box"><Search size={17} /><input type="search" list="hhm-product-suggestions" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products" aria-label="Search products" />{query && <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}</label>
          <Link className="icon-btn wishlist-head" href="/wishlist" aria-label={`Wishlist, ${wishlist.length} saved items`}><Heart /><span className="wishlist-count">{wishlist.length}</span></Link>
          <button className="icon-btn bag-btn" aria-label="Shopping bag" onClick={() => setCartOpen(true)}><ShoppingBag /><span>{cartCount}</span></button>
        </div>
      </header>
      <div className="mobile-search-row">
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          list="hhm-product-suggestions"
          aria-label="Search products"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search the collection"
        />
        {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={16}/></button>}
      </div>
      <datalist id="hhm-product-suggestions">{products.map(product => <option key={product.id} value={product.name} />)}</datalist>

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

      <section className="category-strip" aria-label="Shop by collection">
        <button type="button" onClick={() => browseCategory("Men's Fashion")} aria-label="Shop men's fashion">
          <span className="cat-number">01</span><b>For Him</b><small>Everyday essentials</small>
          <span className="category-arrow" aria-hidden="true">↗</span>
        </button>
        <button type="button" onClick={() => browseCategory("Women's Fashion")} aria-label="Shop women's fashion">
          <span className="cat-number">02</span><b>For Her</b><small>Style that feels like you</small>
          <span className="category-arrow" aria-hidden="true">↗</span>
        </button>
        <button type="button" onClick={() => browseCategory("All")} aria-label="Browse all collections">
          <span className="cat-number">03</span><b>Little Luxuries</b><small>Explore the full edit</small>
          <span className="category-arrow" aria-hidden="true">↗</span>
        </button>
      </section>

      <section className="service-ribbon" aria-label="Shopping services">
        <div className="service-item"><span className="service-icon"><ShieldCheck size={19} /></span><span><b>Shop with confidence</b><small>Cash on delivery available</small></span></div>
        <div className="service-item"><span className="service-icon"><Truck size={19} /></span><span><b>Delivery across Bangladesh</b><small>৳80 in Dhaka · ৳150 outside</small></span></div>
        <a className="service-item service-help" href="https://wa.me/8801969419302" target="_blank" rel="noreferrer"><span className="service-icon"><MessageCircle size={19} /></span><span><b>Here to help</b><small>Chat with us on WhatsApp</small></span><ArrowRight size={15} /></a>
      </section>

      {recentViewedProducts.length > 0 && <section className="recently-viewed-section" aria-labelledby="recently-viewed-title">
        <div className="recently-viewed-heading"><div><p className="eyebrow"><Clock size={13} /> YOUR BROWSING HISTORY</p><h2 id="recently-viewed-title">Recently <em>viewed.</em></h2></div><button type="button" onClick={clearRecentlyViewed}>Clear history</button></div>
        <div className="recently-viewed-grid">{recentViewedProducts.map(product => <Link className="recently-viewed-card" href={"/products/" + product.slug} key={product.id}><span className="recently-viewed-image">{product.image ? <img src={product.image} alt={product.name} loading="lazy" /> : <span>No image</span>}</span><span className="recently-viewed-meta"><small>{product.category}</small><b>{product.name}</b><strong>{money(product.price)}</strong></span></Link>)}</div>
      </section>}

      <section className="shop-section" id="shop">
        <div className="section-heading">
          <div><p className="eyebrow">THE COLLECTION</p><h2>Find your <em>favourites.</em></h2></div>
          <p>Style, essentials and everyday discoveries.<br />A thoughtful edit for him, her and home.</p>
        </div>
        <div className="filters">
          <div className="category-filters" aria-label="Filter products by category">
            {categories.map(c => <button type="button" key={c} aria-pressed={category === c} className={category === c ? "filter active" : "filter"} onClick={() => setCategory(c)}>{c}</button>)}
          </div>
          <div className="catalog-controls">
            <label className="sort-control">Sort by
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label="Sort products">
                <option value="recommended">Recommended</option>
                <option value="newest">Newest first</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="name">Name: A to Z</option>
              </select>
            </label>
            <label className="price-filter">Price
              <select value={priceFilter} onChange={e => setPriceFilter(e.target.value)} aria-label="Filter by price">
                <option value="all">Any price</option>
                <option value="under500">Under ৳500</option>
                <option value="500to1000">৳500–৳999</option>
                <option value="1000to2500">৳1,000–৳2,499</option>
                <option value="2500plus">৳2,500+</option>
              </select>
            </label>
            <label className="stock-filter"><input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} /> In stock only</label>
            <label className="stock-filter"><input type="checkbox" checked={discountedOnly} onChange={e => setDiscountedOnly(e.target.checked)} /> Offers only</label>
            <span className="result-count">{visibleProducts.length} ITEMS</span>
          </div>
        </div>
        <div className="product-grid">
          {visibleProducts.map(p => <article className="product-card" key={p.id}>
            <div className="product-image-wrap"><Link href={"/products/" + p.slug} aria-label={`View ${p.name}`} className="product-image-link">{p.image ? <img src={p.image} alt={p.name} loading="lazy" decoding="async" /> : <span className="product-image-placeholder">Image coming soon</span>}</Link>
              {p.tag && <span className="product-tag">{p.tag}</span>}
              {p.freeShippingEligible && <span className="free-shipping-product-tag">FREE SHIPPING</span>}
              {p.oldPrice && p.oldPrice > p.price && <span className="product-discount-tag">SAVE {Math.round((1 - p.price / p.oldPrice) * 100)}%</span>}
              <button className={compareIds.includes(String(p.id)) ? "compare-product active" : "compare-product"} type="button" aria-label={compareIds.includes(String(p.id)) ? "Remove " + p.name + " from comparison" : "Compare " + p.name} aria-pressed={compareIds.includes(String(p.id))} onClick={() => toggleCompare(p)}><ArrowLeftRight size={15} /></button>
              <button className={wishlist.includes(p.id) ? "wish active" : "wish"} aria-label={wishlist.includes(p.id) ? "Remove " + p.name + " from wishlist" : "Add " + p.name + " to wishlist"} onClick={() => setWishlist(w => w.includes(p.id) ? w.filter(x => x !== p.id) : [...w, p.id])}><Heart size={18} fill={wishlist.includes(p.id) ? "currentColor" : "none"} /></button>
              <button className="quick-view-trigger" type="button" onClick={() => setQuickViewId(String(p.id))}><Eye size={14} /> Quick view</button>
              <div className="product-card-actions"><button className="quick-add" disabled={(p.stockQuantity ?? 999) <= 0} onClick={() => (p.sizeOptions?.length || p.colorOptions?.length) ? window.location.assign("/products/" + p.slug) : (cart[makeCartKey(String(p.id))] || 0) > 0 ? setCartOpen(true) : changeQty(makeCartKey(String(p.id)), 1)}>{(p.stockQuantity ?? 999) <= 0 ? "OUT OF STOCK" : (p.sizeOptions?.length || p.colorOptions?.length) ? "CHOOSE OPTIONS" : (cart[makeCartKey(String(p.id))] || 0) > 0 ? "VIEW IN BAG" : "ADD TO BAG"} {(cart[makeCartKey(String(p.id))] || 0) > 0 && !(p.sizeOptions?.length || p.colorOptions?.length) ? <ShoppingBag size={14} /> : <Plus size={14} />}</button><button className="quick-order" disabled={(p.stockQuantity ?? 999) <= 0 || typeof p.id !== "string" || !/^[0-9a-f-]{36}$/i.test(p.id)} onClick={() => startBuyNow(p)}>{(p.sizeOptions?.length || p.colorOptions?.length) ? "CHOOSE OPTIONS" : "ORDER NOW"} <ArrowRight size={14} /></button></div>
            </div>
            <div className="product-info"><div><p className="product-category">{p.category}</p><h3><Link href={"/products/" + p.slug} className="product-name-link">{p.name}</Link></h3><small className="stock-note">{(p.stockQuantity ?? 999) <= 0 ? "Out of stock" : (p.stockQuantity ?? 999) < 5 ? `Only ${p.stockQuantity} left` : "In stock"}</small></div><div className="price">{money(p.price)}{p.oldPrice && <del>{money(p.oldPrice)}</del>}</div></div>
          </article>)}
        </div>
        {!catalogReady ? <div className="empty" role="status">Loading products…</div> : catalogError ? <div className="empty no-results catalog-unavailable" role="alert"><b>We’ll be right back.</b><span>{catalogError}</span><div><button type="button" onClick={() => window.location.reload()}>Try again</button><a href="https://wa.me/8801969419302" target="_blank" rel="noreferrer">Contact support</a></div></div> : visibleProducts.length === 0 ? <div className="empty no-results"><b>No products found.</b><span>Try a different search or clear your filters to see the full collection.</span><button type="button" onClick={clearCatalogFilters}>Clear all filters</button></div> : null}
      </section>

      <section className="story" id="story">
        <div className="story-image" />
        <div className="story-copy"><p className="eyebrow">A BETTER WAY TO BROWSE</p><h2>Made for <em>every you.</em></h2><p>His & Hers Mart brings together considered fashion, useful finds and everyday little luxuries. A simpler, more thoughtful way to shop for the people and moments that matter.</p><a href="#shop" className="text-link">Get to know our collection <ArrowRight size={16} /></a></div>
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
            <Link className="brand footer-brand" href="/" aria-label="His & Hers Mart home"><img src="/brand/his-and-hers-logo.png" alt="His & Hers — Shop Smart. Live Better." /></Link>
            <p>Thoughtfully chosen finds for every side of life. A more considered way to shop for him, her and home.</p>
          </div>
          <div className="footer-column"><b>EXPLORE</b><a href="#shop">Shop all</a><a href="#shop" onClick={() => setCategory("Men's Fashion")}>For him</a><a href="#shop" onClick={() => setCategory("Women's Fashion")}>For her</a><a href="#story">Our story</a></div>
          <div className="footer-column"><b>HELP</b><a href="/track-order">Track an order</a><a href="/wishlist">Wishlist</a><a href="/shipping">Shipping information</a><a href="/returns">Product checks & exchanges</a><a href="/faq">Help & FAQs</a><a href="/contact">Contact us</a></div>
          <div className="footer-column footer-contact"><b>GET IN TOUCH</b><span>Customer care</span><a href="https://wa.me/8801969419302" target="_blank" rel="noreferrer">WhatsApp · +880 1969-419302</a><span>Cash on delivery available</span><Link href="/install">Install our app</Link></div>
        </div>
        <div className="footer-bottom"><span>© 2026 His & Hers Mart. All rights reserved.</span><span>MODERN SHOPPING · FOR HIM & HER</span></div>
      </footer>

      {compareProducts.length > 0 && <div className="compare-bar" role="region" aria-label="Product comparison">
        <div><b>{compareProducts.length} product{compareProducts.length === 1 ? "" : "s"} selected</b><small>Compare up to 3 side by side</small></div>
        {compareNotice && <span role="status">{compareNotice}</span>}
        <button type="button" disabled={compareProducts.length < 2} onClick={() => setCompareOpen(true)}>Compare now <ArrowRight size={14} /></button>
        <button type="button" className="compare-clear" onClick={() => { setCompareIds([]); setCompareNotice(""); }}>Clear</button>
      </div>}

      <nav className="mobile-bottom-nav" aria-label="Quick navigation">
        <a href="#shop" aria-label="Shop products"><Search size={19} /><span>Shop</span></a>
        <Link href="/wishlist" aria-label={`Wishlist, ${wishlist.length} saved items`}><Heart size={19} /><span>Saved</span>{wishlist.length > 0 && <b>{wishlist.length}</b>}</Link>
        <button type="button" onClick={() => setCartOpen(true)} aria-label={`Open bag, ${cartCount} items`}><ShoppingBag size={19} /><span>Bag</span>{cartCount > 0 && <b>{cartCount}</b>}</button>
        <Link href="/track-order" aria-label="Track order"><Truck size={19} /><span>Track</span></Link>
        <a href="https://wa.me/8801969419302" target="_blank" rel="noreferrer" aria-label="Contact customer support"><MessageCircle size={19} /><span>Help</span></a>
      </nav>

      {quickViewProduct && <div className="quick-view-overlay" role="presentation" onClick={() => setQuickViewId(null)}>
        <section className="quick-view-dialog" role="dialog" aria-modal="true" aria-labelledby="quick-view-title" onClick={e => e.stopPropagation()}>
          <button type="button" className="quick-view-close" aria-label="Close quick view" onClick={() => setQuickViewId(null)}><X size={20} /></button>
          <div className="quick-view-layout">
            <div className="quick-view-image">{quickViewProduct.image ? <img src={quickViewProduct.image} alt={quickViewProduct.name} /> : <span>Image coming soon</span>}</div>
            <div className="quick-view-copy">
              <p className="eyebrow">{quickViewProduct.category}</p>
              <h2 id="quick-view-title">{quickViewProduct.name}</h2>
              <div className="quick-view-price">{money(quickViewProduct.price)}{quickViewProduct.oldPrice && quickViewProduct.oldPrice > quickViewProduct.price && <del>{money(quickViewProduct.oldPrice)}</del>}</div>
              <p className="quick-view-stock">{(quickViewProduct.stockQuantity ?? 0) > 0 ? ((quickViewProduct.stockQuantity ?? 0) < 5 ? "Only " + quickViewProduct.stockQuantity + " left" : "In stock and ready to order") : "Currently unavailable"}</p>
              <p className="quick-view-description">{quickViewProduct.description?.trim() || "A thoughtfully selected find from His & Hers Mart. Open the product page for more details and available options."}</p>
              {quickViewProduct.freeShippingEligible && <small className="quick-view-shipping">Selected-product free shipping may apply when 3 eligible quantity units are ordered.</small>}
              <div className="quick-view-actions">
                <Link href={"/products/" + quickViewProduct.slug} className="quick-view-details" onClick={() => setQuickViewId(null)}>View details</Link>
                <button type="button" className="primary-btn" disabled={(quickViewProduct.stockQuantity ?? 0) <= 0} onClick={() => quickAddToBag(quickViewProduct)}>{quickViewProduct.sizeOptions?.length || quickViewProduct.colorOptions?.length ? "Choose options" : "Add to bag"} <ShoppingBag size={15} /></button>
                <button type="button" className="order-now-btn" disabled={(quickViewProduct.stockQuantity ?? 0) <= 0} onClick={() => { const item = quickViewProduct; setQuickViewId(null); startBuyNow(item); }}>Order now <ArrowRight size={15} /></button>
              </div>
            </div>
          </div>
        </section>
      </div>}

      {compareOpen && compareProducts.length > 0 && <div className="compare-overlay" role="presentation" onClick={() => setCompareOpen(false)}>
        <section className="compare-dialog" role="dialog" aria-modal="true" aria-labelledby="compare-title" onClick={e => e.stopPropagation()}>
          <header><div><p className="eyebrow">SHOP WITH CLARITY</p><h2 id="compare-title">Compare your <em>shortlist.</em></h2><small>Side-by-side details from the current product catalogue.</small></div><button type="button" className="icon-btn" aria-label="Close comparison" onClick={() => setCompareOpen(false)}><X /></button></header>
          <div className="compare-table-wrap"><table className="compare-table">
            <thead><tr><th scope="col">Details</th>{compareProducts.map(item => <th scope="col" key={item.id}>
              {item.image && <img src={item.image} alt={item.name} />}
              <b>{item.name}</b>
              <Link href={"/products/" + item.slug} onClick={() => setCompareOpen(false)}>View product</Link>
              <button type="button" onClick={() => setCompareIds(ids => ids.filter(id => id !== String(item.id)))} aria-label={"Remove " + item.name + " from comparison"}>Remove</button>
            </th>)}</tr></thead>
            <tbody>{[
              {label:"Price", value:(item: Product) => money(item.price)},
              {label:"Previous price", value:(item: Product) => item.oldPrice && item.oldPrice > item.price ? money(item.oldPrice) : "—"},
              {label:"Category", value:(item: Product) => item.category},
              {label:"Availability", value:(item: Product) => (item.stockQuantity ?? 0) > 0 ? "In stock" : "Out of stock"},
              {label:"Available options", value:(item: Product) => [item.sizeOptions?.length ? "Sizes" : "", item.colorOptions?.length ? "Colours" : ""].filter(Boolean).join(" · ") || "Standard"},
              {label:"Selected free delivery", value:(item: Product) => item.freeShippingEligible ? "Eligible (3 units)" : "Not marked eligible"}
            ].map(row => <tr key={row.label}><th scope="row">{row.label}</th>{compareProducts.map(item => <td key={item.id}>{row.value(item)}</td>)}</tr>)}</tbody>
          </table></div>
          <div className="compare-footer"><span>{compareProducts.length} of 3 products selected</span><button type="button" onClick={() => setCompareOpen(false)}>Continue browsing</button></div>
        </section>
      </div>}

      {cartOpen && <div className="overlay" onClick={() => setCartOpen(false)}><aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title" onClick={e => e.stopPropagation()}>
        <div className="cart-title"><h2 id="cart-drawer-title">Your bag <span>({cartCount})</span></h2><button className="icon-btn" type="button" aria-label="Close shopping bag" onClick={() => setCartOpen(false)}><X /></button></div>
        {cartLines.length === 0 ? <div className="empty-cart"><ShoppingBag size={34} /><p>Your bag is waiting for something lovely.</p><button className="primary-btn" onClick={() => setCartOpen(false)}>Continue shopping</button></div> : <>
          <div className="cart-list">{cartLines.map(line => <div className="cart-item" key={line.key}>{line.product.image ? <img src={line.product.image} alt={line.product.name} /> : <div className="cart-item-placeholder">No image</div>}<div className="cart-item-info"><b>{line.product.name}</b>{line.size && <small className="cart-selected-size">Size: {line.size}</small>}{line.color && <small className="cart-selected-size">Colour: {line.color}</small>}<span>{money(line.product.price)}</span><div className="qty"><button type="button" onClick={() => changeQty(line.key, -1)} aria-label={line.quantity === 1 ? "Remove " + line.product.name + " from bag" : "Decrease quantity of " + line.product.name}>{line.quantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}</button><span>{line.quantity}</span><button type="button" onClick={() => changeQty(line.key, 1)} disabled={line.quantity >= (line.product.stockQuantity ?? 999)} aria-label={"Increase quantity of " + line.product.name}><Plus size={13} /></button></div><button type="button" className="cart-save-for-later" onClick={() => { setWishlist(current => current.includes(line.product.id) ? current : [...current, line.product.id]); changeQty(line.key, -line.quantity); }}><Heart size={12} /> Save for later</button></div></div>)}</div>
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
            {checkoutLines.map(line => <div key={line.key}><span>{line.product.name}{line.size ? ` · Size: ${line.size}` : ""}{line.color ? ` · Colour: ${line.color}` : ""} × {line.quantity}</span><strong>{money(line.product.price * line.quantity)}</strong></div>)}
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
          <p className="eyebrow">HIS & HERS MART</p>
          <h2 id="order-success-title">Congratulations!<br /><em>Your order has been received.</em></h2>
          <p className="success-intro">Thank you for shopping with us. Our team will verify product availability and coordinate fulfilment with the supplier.</p>
          <div className="order-reference">
            <span>YOUR ORDER NUMBER</span>
            <strong>{orderResult.order_number}</strong>
            <button type="button" className="copy-order-number" onClick={async () => {
              try { await navigator.clipboard.writeText(orderResult.order_number); setOrderCopied(true); }
              catch { setOrderCopied(false); }
            }}>{orderCopied ? "Copied" : "Copy order number"}</button>
            <div><span>Order status</span><b>Awaiting store confirmation</b></div>
            <div><span>Payment</span><b>Cash on Delivery</b></div>
            <div><span>Product subtotal</span><b>{money(orderResult.subtotal)}</b></div>
            <div><span>Delivery charge</span><b>{orderResult.free_shipping_applied ? "FREE" : money(orderResult.delivery_charge)}</b></div>
            <div><span>Total</span><b>{money(orderResult.total)}</b></div>
            <small>{orderResult.free_shipping_applied ? `Free shipping applied to ${orderResult.free_shipping_eligible_quantity} eligible item(s).` : `Delivery charge applied: ${orderResult.delivery_charge === 80 ? "Inside Dhaka ৳80" : "Outside Dhaka ৳150"}.`}</small>
          </div>
          <UnboxingNotice showConsent={false} />
          <div className="success-actions">
            <Link className="success-track-link" href="/track-order" onClick={() => setOrderSuccessOpen(false)}>Track your order</Link>
            <button className="primary-btn success-close" onClick={() => setOrderSuccessOpen(false)}>Continue shopping <ArrowRight size={16} /></button>
          </div>
        </section>
      </div>}
    </main>
  );
}
