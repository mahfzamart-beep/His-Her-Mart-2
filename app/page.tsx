"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { MapPin, X, Plus, Minus, ArrowRight, Megaphone, CakeSlice } from "lucide-react";

function DessertCupIcon({size=22}:{size?:number}){return <CakeSlice size={size} strokeWidth={1.8} aria-hidden="true"/>}
type Product={id:string;name:string;slug:string;description:string|null;price:number;image_url:string|null;stock_quantity:number;category_id:string;category:{name:string}|null};
type Area={id:string;name:string;delivery_charge:number;is_active:boolean};
type Ad={id:string;title:string;description:string|null;image_url:string;media_type:"image"|"video";button_text:string;target_url:string|null;product_id:string|null;display_order:number;areaIds:string[]};
type Line={product:Product;quantity:number};
const money=(n:number)=>"৳"+Number(n||0).toLocaleString("en-BD");

function MenuProductCard({product,onAdd,onBuyNow}:{product:Product;onAdd:(id:string,delta:number)=>void;onBuyNow:(id:string)=>void}){

 const chilled=/dessert/i.test(product.category?.name||"");
 return <article className="cm-card" key={product.id}>
  <div className="cm-food-photo"><img src={product.image_url?.replace(/\\.webp$/,"-2x.jpg")||"/images/placeholder.svg"} alt={product.name} loading="lazy"/><small>{chilled?"CHILLED · READY TO ENJOY":"DESSERT · SMALL BATCH"}</small></div>
  <div className="cm-card-body"><h3>{product.name}</h3><p>{product.description||"A little cup of joy from Miss Can Cake."}</p><div className="cm-card-foot"><b>{product.price>0?money(product.price):"Price being updated"}</b><span>4 Dry Cake pieces / cup</span></div><small className="cm-stock-note">{product.stock_quantity>0?"Available now":"First batch coming soon"}</small><div className="cm-card-actions"><button className="cm-add-button" disabled={product.price<=0||product.stock_quantity<=0} onClick={()=>onAdd(product.id,1)}>Add to Cup <Plus size={14}/></button><button className="cm-buy-button" disabled={product.price<=0||product.stock_quantity<=0} onClick={()=>onBuyNow(product.id)}>Buy Now <ArrowRight size={14}/></button></div></div>
 </article>;
}

export default function Home(){
 const [products,setProducts]=useState<Product[]>([]);
 const [areas,setAreas]=useState<Area[]>([]);
 const [ads,setAds]=useState<Ad[]>([]);
 const [loading,setLoading]=useState(true);
 const [cart,setCart]=useState<Record<string,number>>({});
 const [cartReady,setCartReady]=useState(false);
 const [cartOpen,setCartOpen]=useState(false);
 const [buyNowProductId,setBuyNowProductId]=useState<string|null>(null);
 const [buyNowQuantity,setBuyNowQuantity]=useState(1);
 const [checkout,setCheckout]=useState(false);
 const [areaId,setAreaId]=useState("");
 const [customerName,setCustomerName]=useState("");
 const [phone,setPhone]=useState("");
 const [email,setEmail]=useState("");
 const [address,setAddress]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const [adArea,setAdArea]=useState("");

 useEffect(()=>{let cancelled=false;
  const withTimeout=(promise:any)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error("Request timed out")),12000))]);
  const loadStore=async()=>{
   if(!supabase){setError("Store connection is unavailable. Please try again shortly.");setLoading(false);return;}
   try{
    const [p,a,b]=await Promise.all([
     withTimeout(supabase.from("products").select("id,name,slug,description,price,image_url,stock_quantity,category_id,categories(name)").eq("is_active",true).order("created_at")).catch((error:any)=>({data:null,error})),
     withTimeout(supabase.from("delivery_areas").select("id,name,delivery_charge,is_active").eq("is_active",true).order("sort_order").order("name")).catch((error:any)=>({data:null,error})),
     withTimeout(supabase.from("advertisements").select("id,title,description,image_url,media_type,button_text,target_url,product_id,display_order").eq("is_active",true).order("display_order")).catch((error:any)=>({data:[],error}))
    ]);
    if(cancelled)return;
    if(p.error)setError("Dessert menu is taking too long to load. Please refresh once or try again.");
    const loadedProducts=((p.data||[]) as any[]).map((x:any)=>({...x,category:Array.isArray(x.categories)?x.categories[0]:x.categories}));
    setProducts(loadedProducts);
    setAreas(a.data||[]);
    const params=new URLSearchParams(window.location.search);
    const requestedProduct=params.get("buyNow");
    if(requestedProduct){
     const found=loadedProducts.find((x:Product)=>x.id===requestedProduct);
     if(found&&Number(found.price)>0&&Number(found.stock_quantity)>0){
      const requestedQty=Math.max(1,Math.min(10,Number(found.stock_quantity),Number(params.get("qty")||1)));
      setBuyNowProductId(found.id);setBuyNowQuantity(requestedQty);setCheckout(true);
     }
    }
    if(params.get("openBox")==="1")setCartOpen(true);
    if(params.has("buyNow")||params.has("openBox"))window.history.replaceState(null,"",window.location.pathname);
    setLoading(false);
    const activeAds=(b.data||[]) as any[];
    if(activeAds.length&&a.data?.length){
     const ids=activeAds.map((x:any)=>x.id);
     const links=await withTimeout(supabase.from("advertisement_delivery_areas").select("advertisement_id,delivery_area_id").in("advertisement_id",ids)).catch(()=>null);
     if(!cancelled&&links&&!links.error){
      const activeAreaIds=new Set((a.data||[]).map((x:any)=>x.id));
      const grouped=new Map<string,string[]>();
      (links.data||[]).forEach((x:any)=>grouped.set(x.advertisement_id,[...(grouped.get(x.advertisement_id)||[]),x.delivery_area_id]));
      setAds(activeAds.filter((x:any)=>(grouped.get(x.id)||[]).some((id:string)=>activeAreaIds.has(id))).map((x:any)=>({...x,areaIds:grouped.get(x.id)||[]})));
     }
    }
   }catch(error){
    if(!cancelled)setError("The store connection is slow right now. Please refresh to try again.");
   }finally{if(!cancelled)setLoading(false)}
  };
  loadStore();
  return()=>{cancelled=true}
 },[]);
 useEffect(()=>{try{setCart(JSON.parse(localStorage.getItem("miss-can-cake-cup-v1")||"{}"))}catch{setCart({})}setCartReady(true)},[]);
 useEffect(()=>{if(cartReady)localStorage.setItem("miss-can-cake-cup-v1",JSON.stringify(cart))},[cart,cartReady]);
 const cookedProducts=products.filter(p=>/dessert/i.test(p.category?.name||""));


 const lines:Line[]=buyNowProductId?products.filter(p=>p.id===buyNowProductId).map(product=>({product,quantity:buyNowQuantity})):Object.entries(cart).flatMap(([id,quantity])=>{const product=products.find(p=>p.id===id);return product&&quantity>0?[{product,quantity}]:[]});
 const count=lines.reduce((s,l)=>s+l.quantity,0);
 const subtotal=lines.reduce((s,l)=>s+l.quantity*Number(l.product.price),0);
 const chosenArea=areas.find(a=>a.id===areaId);
 const total=subtotal+Number(chosenArea?.delivery_charge||0);
 const update=(id:string,delta:number)=>setCart(old=>{const next={...old};const q=(next[id]||0)+delta;if(q<=0)delete next[id];else next[id]=Math.min(10,q);return next});
 const buyNow=(id:string)=>{setBuyNowProductId(id);setBuyNowQuantity(1);setCartOpen(false);setError("");setCheckout(true)};
 const placeOrder=async(e:FormEvent)=>{
  e.preventDefault();setError("");
  if(!supabase||!chosenArea||!lines.length)return;
  if(lines.some(l=>l.product.price<=0||l.product.stock_quantity<l.quantity)){setError("Some products still need a confirmed price or stock. Please contact us.");return}
  setBusy(true);
  const {data,error:fnError}=await supabase.functions.invoke("create-guest-order",{body:{
   customer_name:customerName,customer_phone:phone,customer_email:email||null,
   shipping_address:{delivery_area_id:chosenArea.id,delivery_area_name:chosenArea.name,address_line:address,city:"Sylhet"},
   items:lines.map(l=>({product_id:l.product.id,quantity:l.quantity}))
  }});
  setBusy(false);
  if(fnError||data?.error){setError(data?.error||fnError?.message||"Order could not be placed.");return}
  const order=data?.order;
  if(!order?.order_number){setError("Order confirmation could not be verified. Please contact Miss Can Cake before trying again.");return}
  setSuccess("Your order "+order.order_number+" has been received. Total: "+money(order.total));
  if(buyNowProductId===null)setCart({});setCheckout(false);setCartOpen(false);setBuyNowProductId(null);setBuyNowQuantity(1);
 };
 return <main className="cm">
  <div className="cm-top" aria-label="4 pieces per cup, chilled dessert, Sylhet delivery"><span className="cm-top-label">SMALL-BATCH DESSERTS · MADE WITH LOVE · SYLHET DELIVERY</span></div>
  <header className="cm-header"><a className="cm-logo" href="#"><span>MISS</span><b>CAN CAKE</b></a><nav><a href="#home">Home</a><a href="#menu">Our Desserts</a><a href="#about">About</a><a href="#offers">Offers</a><a href="#faq">FAQ</a></nav><button className="cm-icon" onClick={()=>setCartOpen(true)} aria-label="Open order"><DessertCupIcon size={23}/> <i>{count}</i></button></header>
  <section className="cm-hero" id="home"><div className="cm-hero-copy"><span className="cm-kicker">THE SIGNATURE DESSERT · MISS CAN CAKE</span><h1>A little coffee.<br/><em>A lot of comfort.</em></h1><p>Meet Miss Tiramisu: soft Dry Cake pieces layered with silky coffee-kissed cream and finished with a delicate dusting of cocoa. A little indulgence, made with care.</p><div className="mc-hero-price"><strong>৳110</strong><span>MISS TIRAMISU · 120ML</span></div><div className="cm-location"><MapPin size={17}/> Delivery in selected areas of Sylhet City</div><div className="cm-hero-actions"><a className="cm-btn" href="#menu">Explore the Menu <ArrowRight size={17}/></a><a className="cm-hero-secondary" href="#offers">Check Delivery Areas</a></div></div><div className="cm-hero-art"><img className="cm-hero-upload" src="/images/miss-tiramisu-placeholder.svg" alt="Miss Tiramisu dessert cup" fetchPriority="high"/></div></section>
  
  <section className="cm-trust-strip" aria-label="Shopping highlights"><div><span>🍰</span><b>4 pieces</b><small>in every cup</small></div><div><span>☕</span><b>Coffee-kissed</b><small>soft cake layers</small></div><div><span>🍫</span><b>Cocoa finish</b><small>made with care</small></div><div><span>🛵</span><b>Sylhet delivery</b><small>selected areas</small></div></section>
  <section className="cm-menu" id="menu">
  <div className="cm-section-title"><span>MADE FRESH, JUST FOR YOU</span><h2>Our <em>Desserts</em></h2><p>Discover our first signature dessert. Every 120ml cup comes with four small Dry Cake pieces layered with coffee cream and finished with cocoa.</p></div>
  <div className="cm-menu-category cm-cooked" id="cooked-menu">
   <div className="cm-menu-category-head"><div><span>CHILLED · READY TO ENJOY</span><h3>Miss Tiramisu</h3><p>Our first signature dessert, served chilled and ready to enjoy.</p></div><small>{cookedProducts.length} {cookedProducts.length===1?"variety":"varieties"}</small></div>
   {loading?<p className="cm-empty">Preparing Miss Tiramisu…</p>:cookedProducts.length===0?<div className="cm-menu-empty"><span>🍰</span><h3>Miss Tiramisu is getting ready.</h3><p>Our first small-batch dessert will be available soon.</p></div>:<div className="cm-grid">{cookedProducts.map(p=><MenuProductCard key={p.id} product={p} onAdd={update} onBuyNow={buyNow}/>)}</div>}
  </div>
 </section>
  <section className="cm-ads" id="offers"><div className="cm-section-title"><span><Megaphone size={15}/> LOCAL AVAILABILITY & PROMOTIONS</span><h2>Find Miss Can Cake <em>Around You</em></h2><p>Check where we deliver and watch our latest offers, campaigns and food videos.</p></div><div className="cm-service-areas"><div className="cm-service-head"><span>NOW DELIVERING IN SYLHET</span><b>{areas.length} active {areas.length===1?"area":"areas"}</b></div><div className="cm-area-chips"><button type="button" className={!adArea?"active":""} onClick={()=>setAdArea("")}>All available areas</button>{areas.map(area=><button type="button" key={area.id} className={adArea===area.id?"active":""} onClick={()=>setAdArea(area.id)}><span><MapPin size={13}/>{area.name}</span><small>Delivery {money(area.delivery_charge)}</small></button>)}</div>{areas.length===0&&<p className="cm-empty">Delivery locations will appear here as soon as service areas are enabled.</p>}</div><div className="cm-promo-heading"><span>{adArea?"Promotions for "+(areas.find(area=>area.id===adArea)?.name||"your area"):"Latest promotions & videos"}</span><small>Updated by Miss Can Cake</small></div><div className="cm-ad-grid">{ads.filter(ad=>!adArea||ad.areaIds.includes(adArea)).map(ad=><article className="cm-ad-card" key={ad.id}>{ad.media_type==="video"?<video className="cm-ad-media" src={ad.image_url} controls playsInline preload="metadata" aria-label={ad.title}/>:<img className="cm-ad-media" src={ad.image_url} alt={ad.title}/>}<div><b>{ad.title}</b>{ad.description&&<p>{ad.description}</p>}<a className="cm-ad-cta" href={ad.target_url||"#menu"}>{ad.button_text} <ArrowRight size={14}/></a></div></article>)}</div>{ads.filter(ad=>!adArea||ad.areaIds.includes(adArea)).length===0&&<p className="cm-empty">No promotions are currently available in this area yet.</p>}</section>
  <section className="cm-about" id="about">
   <div className="cm-about-intro">
    <span className="cm-kicker">WHY MISS CAN CAKE</span>
    <h2>Why <em>Miss Can Cake?</em></h2>
    <p>We believe a little dessert can make an ordinary day feel special. Our first small-batch treat is prepared with care, served chilled, and priced clearly before checkout.</p>
    <a className="cm-about-link" href="#menu">Explore our desserts <ArrowRight size={16}/></a>
   </div>
   <div className="cm-about-grid">
    <article className="cm-about-card"><span className="cm-about-icon">🍰</span><small>01 / SMALL BATCH</small><h3>Made with care</h3><p>Our first dessert is prepared in small batches for a fresh, thoughtful treat.</p></article>
    <article className="cm-about-card"><span className="cm-about-icon">☕</span><small>02 / COFFEE & CREAM</small><h3>Layered comfort</h3><p>Four small Dry Cake pieces meet coffee-kissed cream and a delicate cocoa finish.</p></article>
    <article className="cm-about-card"><span className="cm-about-icon">🥄</span><small>03 / FOUR PIECES PER CUP</small><h3>A little cup of joy</h3><p>Each 120ml cup includes four small Dry Cake pieces, layered for a satisfying treat.</p></article>
    <article className="cm-about-card"><span className="cm-about-icon">🛵</span><small>04 / LOCAL SYLHET DELIVERY</small><h3>Delivery made clear</h3><p>Choose an active service area and see its delivery fee before placing your order.</p></article>
   </div>
  </section>
  <section className="cm-faq" id="faq"><h2>Good to <em>Know</em></h2><p><b>Miss Tiramisu:</b> A chilled dessert made with four small Dry Cake pieces, coffee cream and cocoa.</p><p><b>Cup size:</b> Each cup is 120ml and contains four pieces.</p><p><b>Storage:</b> Keep refrigerated and enjoy chilled. Do not leave at room temperature for extended periods.</p><p><b>Delivery:</b> Currently available only in selected areas of Sylhet City.</p></section>
  <div className="cm-mobile-dock"><a href="#menu">Explore Menu <ArrowRight size={16}/></a><button onClick={()=>setCartOpen(true)}><DessertCupIcon size={19}/> Your Order <b>{count}</b></button></div>
  <footer className="cm-footer"><a className="cm-logo" href="#"><span>Miss</span><b>Can Cake</b></a><p>A little cup of joy. ☕</p><small>© {new Date().getFullYear()} Miss Can Cake. Made with love in Sylhet.</small></footer>
  {cartOpen&&<div className="cm-overlay" onClick={()=>setCartOpen(false)}><aside className="cm-drawer" onClick={e=>e.stopPropagation()}><div className="cm-drawer-head"><h2>Your Order ({count})</h2><button onClick={()=>setCartOpen(false)}><X/></button></div>{!lines.length?<p className="cm-empty">Your order is waiting for something sweet.</p>:<>{lines.map(l=><div className="cm-line" key={l.product.id}><div><b>{l.product.name}</b><small>{l.quantity} cup · {money(l.product.price*l.quantity)}</small></div><div className="cm-qty"><button onClick={()=>update(l.product.id,-1)}><Minus/></button>{l.quantity}<button onClick={()=>update(l.product.id,1)}><Plus/></button></div></div>)}<div className="cm-total"><span>Subtotal</span><b>{money(subtotal)}</b></div><button className="cm-btn cm-wide" onClick={()=>{setCartOpen(false);setCheckout(true)}}>Checkout <ArrowRight/></button></>}</aside></div>}
  {checkout&&<div className="cm-overlay"><form className="cm-checkout" onSubmit={placeOrder}><div className="cm-drawer-head"><h2>Delivery Details</h2><button type="button" onClick={()=>{setCheckout(false);setBuyNowProductId(null);setBuyNowQuantity(1)}}><X/></button></div><p>We currently deliver only in selected Sylhet areas.</p><label>Full name<input required value={customerName} onChange={e=>setCustomerName(e.target.value)}/></label><label>Phone number<input required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="01XXXXXXXXX"/></label><label>Email (optional)<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Delivery area<select required value={areaId} onChange={e=>setAreaId(e.target.value)}><option value="">Choose an active area</option>{areas.map(a=><option key={a.id} value={a.id}>{a.name} — {money(a.delivery_charge)}</option>)}</select></label><label>Full address<textarea required minLength={5} value={address} onChange={e=>setAddress(e.target.value)}/></label><div className="cm-total"><span>Subtotal</span><b>{money(subtotal)}</b></div><div className="cm-total"><span>Delivery</span><b>{chosenArea?money(chosenArea.delivery_charge):"Select area"}</b></div><div className="cm-total"><span>Total</span><b>{money(total)}</b></div><div className="cm-checkout-note"><b>At delivery</b><span>Please check your dessert cups while the delivery person is present. If anything is missing, incorrect or damaged, contact our team with your order number.</span><a href="https://wa.me/8801969419302" target="_blank" rel="noreferrer">WhatsApp customer support</a></div>{error&&<p className="cm-error">{error}</p>}<button className="cm-btn cm-wide" disabled={busy||!chosenArea}>{busy?"Placing order…":"Place Order · "+money(total)}</button></form></div>}
  {success&&<div className="cm-overlay"><div className="cm-checkout"><div className="cm-drawer-head"><h2>Order Received!</h2><button onClick={()=>setSuccess("")}><X/></button></div><p>{success}</p><button className="cm-btn cm-wide" onClick={()=>setSuccess("")}>Continue Shopping</button></div></div>}
 </main>
}
