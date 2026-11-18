"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { ShoppingBag, MapPin, Menu, X, Plus, Minus, ArrowRight, Cloud, ChefHat, Megaphone } from "lucide-react";

type Product={id:string;name:string;slug:string;description:string|null;price:number;image_url:string|null;stock_quantity:number;category_id:string;category:{name:string}|null};
type Area={id:string;name:string;delivery_charge:number;is_active:boolean};
type Ad={id:string;title:string;description:string|null;image_url:string;button_text:string;target_url:string|null;product_id:string|null;display_order:number;areaIds:string[]};
type Line={product:Product;quantity:number};
const money=(n:number)=>"৳"+Number(n||0).toLocaleString("en-BD");
const foodImages=[
"https://images.unsplash.com/photo-156324一?auto=format&fit=crop&w=800&q=82",
"https://images.unsplash.com/photo-1563240927-7f4f3f1d?auto=format&fit=crop&w=800&q=82"
];

export default function Home(){
 const [products,setProducts]=useState<Product[]>([]);
 const [areas,setAreas]=useState<Area[]>([]);
 const [ads,setAds]=useState<Ad[]>([]);
 const [loading,setLoading]=useState(true);
 const [category,setCategory]=useState("All");
 const [cart,setCart]=useState<Record<string,number>>({});
 const [cartOpen,setCartOpen]=useState(false);
 const [checkout,setCheckout]=useState(false);
 const [areaId,setAreaId]=useState("");
 const [customerName,setCustomerName]=useState("");
 const [phone,setPhone]=useState("");
 const [email,setEmail]=useState("");
 const [address,setAddress]=useState("");
 const [accepted,setAccepted]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const [adArea,setAdArea]=useState("");

 useEffect(()=>{let cancelled=false;(async()=>{
  if(!supabase){setError("Store is temporarily unavailable.");setLoading(false);return;}
  const [p,a,b]=await Promise.all([
   supabase.from("products").select("id,name,slug,description,price,image_url,stock_quantity,category_id,categories(name)").eq("is_active",true).order("created_at"),
   supabase.from("delivery_areas").select("id,name,delivery_charge,is_active").eq("is_active",true).order("sort_order").order("name"),
   supabase.from("advertisements").select("id,title,description,image_url,button_text,target_url,product_id,display_order").eq("is_active",true).order("display_order")
  ]);
  if(cancelled)return;
  if(p.error)setError("Could not load the momo menu. Please refresh.");
  setProducts((p.data||[]).map((x:any)=>({...x,category:Array.isArray(x.categories)?x.categories[0]:x.categories})));
  setAreas(a.data||[]);
  const activeAds=b.data||[];
  if(activeAds.length){
   const ids=activeAds.map((x:any)=>x.id);
   const links=await supabase.from("advertisement_delivery_areas").select("advertisement_id,delivery_area_id").in("advertisement_id",ids);
   if(!cancelled&&!links.error){
    const activeAreaIds=new Set((a.data||[]).map((x:any)=>x.id));
    const grouped=new Map<string,string[]>();
    (links.data||[]).forEach((x:any)=>grouped.set(x.advertisement_id,[...(grouped.get(x.advertisement_id)||[]),x.delivery_area_id]));
    setAds(activeAds.filter((x:any)=> (grouped.get(x.id)||[]).some((id:string)=>activeAreaIds.has(id))).map((x:any)=>({...x,areaIds:grouped.get(x.id)||[]})));
   }
  }
  setLoading(false);
 })();return()=>{cancelled=true}},[]);
 useEffect(()=>{try{setCart(JSON.parse(localStorage.getItem("cloud-momos-box-v1")||"{}"))}catch{setCart({})}},[]);
 useEffect(()=>{localStorage.setItem("cloud-momos-box-v1",JSON.stringify(cart))},[cart]);
 const categories=useMemo(()=>["All",...Array.from(new Set(products.map(p=>p.category?.name).filter(Boolean) as string[]))],[products]);
 const shown=products.filter(p=>category==="All"||p.category?.name===category);
 const lines:Line[]=Object.entries(cart).flatMap(([id,quantity])=>{const product=products.find(p=>p.id===id);return product&&quantity>0?[{product,quantity}]:[]});
 const count=lines.reduce((s,l)=>s+l.quantity,0);
 const subtotal=lines.reduce((s,l)=>s+l.quantity*Number(l.product.price),0);
 const chosenArea=areas.find(a=>a.id===areaId);
 const total=subtotal+Number(chosenArea?.delivery_charge||0);
 const update=(id:string,delta:number)=>setCart(old=>{const next={...old};const q=(next[id]||0)+delta;if(q<=0)delete next[id];else next[id]=Math.min(10,q);return next});
 const placeOrder=async(e:React.FormEvent)=>{
  e.preventDefault();setError("");
  if(!supabase||!chosenArea||!lines.length||!accepted)return;
  if(lines.some(l=>l.product.price<=0||l.product.stock_quantity<l.quantity)){setError("Some products still need a confirmed price or stock. Please contact us.");return}
  setBusy(true);
  const {data,error:fnError}=await supabase.functions.invoke("create-guest-order",{body:{
   customer_name:customerName,customer_phone:phone,customer_email:email||null,
   shipping_address:{delivery_area_id:chosenArea.id,delivery_area_name:chosenArea.name,address_line:address,city:"Sylhet"},
   items:lines.map(l=>({product_id:l.product.id,quantity:l.quantity})),accept_unboxing_policy:accepted
  }});
  setBusy(false);
  if(fnError||data?.error){setError(data?.error||fnError?.message||"Order could not be placed.");return}
  const order=data?.order;
  if(!order?.order_number){setError("Order confirmation could not be verified. Please contact Cloud Momos before trying again.");return}
  setSuccess("Your order "+order.order_number+" has been received. Total: "+money(order.total));
  setCart({});setCheckout(false);setCartOpen(false);
 };
 return <main className="cm">
  <div className="cm-top">LITTLE CLOUDS. BIG COMFORT. <span>DELIVERY IN SELECTED SYLHET AREAS</span></div>
  <header className="cm-header"><a className="cm-logo" href="#"><span>Cloud</span><b>Momos</b></a><nav><a href="#home">Home</a><a href="#menu">Our Menu</a><a href="#about">About</a><a href="#offers">Offers</a><a href="#faq">FAQ</a></nav><button className="cm-icon" onClick={()=>setCartOpen(true)} aria-label="Open box"><ShoppingBag/> <i>{count}</i></button></header>
  <section className="cm-hero" id="home"><div className="cm-hero-copy"><span className="cm-kicker">FRESHLY MADE WITH LOVE</span><h1>Cloud<br/><em>Momos</em></h1><p>Little clouds. Big comfort. Delicious momos, made fresh and delivered with care across selected areas of Sylhet.</p><div className="cm-location"><MapPin size={17}/> Only in Sylhet City</div><a className="cm-btn" href="#menu">Order Now <ArrowRight size={17}/></a></div><div className="cm-hero-art"><div className="cm-mascot"><ChefHat size={64}/><div className="cm-face">◠‿◠</div><b>Cloud Momos</b><small>Eat Happy!</small></div><div className="cm-steamer"><span>🥟</span><span>🥟</span><span>🥟</span><span>🥟</span><span>🥟</span><span>🥟</span></div></div></section>
  <section className="cm-category-banners"><a href="#menu" onClick={()=>setCategory("Ready to Eat")}><b>Ready to Eat</b><span>Freshly Cooked & Super Delicious!</span><strong>Explore Menu →</strong></a><a href="#menu" onClick={()=>setCategory("Frozen Momos")}><b>Frozen Momos</b><span>Store it. Cook it. Enjoy Anytime!</span><strong>Explore Menu →</strong></a></section>
  <section className="cm-menu" id="menu"><div className="cm-section-title"><span>MADE FRESH, JUST FOR YOU</span><h2>Our <em>Menu</em></h2><p>Every box comes with 6 delicious pieces.</p></div><div className="cm-tabs">{categories.map(c=><button key={c} className={category===c?"active":""} onClick={()=>setCategory(c)}>{c}</button>)}</div>{loading?<p className="cm-empty">Preparing our menu…</p>:<div className="cm-grid">{shown.map((p,i)=><article className="cm-card" key={p.id}><div className="cm-food-photo"><span className="cm-dumpling">🥟</span><small>{p.category?.name==="Frozen Momos"?"RAW · FROZEN":"COOKED · READY TO EAT"}</small></div><div className="cm-card-body"><h3>{p.name}</h3><p>{p.description}</p><div className="cm-card-foot"><b>{p.price>0?money(p.price):"Price coming soon"}</b><span>6 pcs / box</span></div><button disabled={p.price<=0||p.stock_quantity<=0} onClick={()=>update(p.id,1)}>{p.price>0&&p.stock_quantity>0?"Add to Box":"Coming Soon"} <Plus size={15}/></button></div></article>)}</div>}</section>
  <section className="cm-ads" id="offers"><div className="cm-section-title"><span><Megaphone size={15}/> LOCAL AVAILABILITY & PROMOTIONS</span><h2>Cloud Momos <em>Around You</em></h2><p>Discover offers available in your neighbourhood.</p></div><label className="cm-area-select">Choose your area <select value={adArea} onChange={e=>setAdArea(e.target.value)}><option value="">Select a delivery area</option>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><div className="cm-ad-grid">{ads.filter(ad=>!adArea||ad.areaIds.includes(adArea)).map(ad=><a className="cm-ad-card" href={ad.target_url||"#menu"} key={ad.id}><img src={ad.image_url} alt={ad.title}/><div><b>{ad.title}</b><p>{ad.description}</p><strong>{ad.button_text} →</strong></div></a>)}</div>{ads.filter(ad=>!adArea||ad.areaIds.includes(adArea)).length===0&&<p className="cm-empty">No promotions are currently available in this area.</p>}</section>
  <section className="cm-about" id="about"><div className="cm-about-badge">☁️</div><div><span className="cm-kicker">WHY CLOUD MOMOS</span><h2>Good food.<br/><em>Happy clouds.</em></h2><p>Freshly prepared momos, carefully packed frozen favourites, and a little happiness in every box. Serving selected areas of Sylhet as we grow.</p></div><ul><li>🥟 Freshly made with love</li><li>❄️ Carefully packed frozen momos</li><li>🛵 Delivery in selected Sylhet areas</li></ul></section>
  <section className="cm-faq" id="faq"><h2>Good to <em>Know</em></h2><p><b>Ready to Eat:</b> Cooked before delivery and served ready to enjoy.</p><p><b>Frozen Momos:</b> Raw and frozen when packed. Cook thoroughly before eating.</p><p><b>Box size:</b> Every box contains 6 pieces.</p><p><b>Delivery:</b> Currently available only in selected areas of Sylhet City.</p></section>
  <footer className="cm-footer"><a className="cm-logo" href="#"><span>Cloud</span><b>Momos</b></a><p>Little clouds. Big comfort. ☁️</p><small>© {new Date().getFullYear()} Cloud Momos. Made with love in Sylhet.</small></footer>
  {cartOpen&&<div className="cm-overlay" onClick={()=>setCartOpen(false)}><aside className="cm-drawer" onClick={e=>e.stopPropagation()}><div className="cm-drawer-head"><h2>Your Box ({count})</h2><button onClick={()=>setCartOpen(false)}><X/></button></div>{!lines.length?<p className="cm-empty">Your box is waiting for momos.</p>:<>{lines.map(l=><div className="cm-line" key={l.product.id}><div><b>{l.product.name}</b><small>{l.quantity} box · {money(l.product.price*l.quantity)}</small></div><div className="cm-qty"><button onClick={()=>update(l.product.id,-1)}><Minus/></button>{l.quantity}<button onClick={()=>update(l.product.id,1)}><Plus/></button></div></div>)}<div className="cm-total"><span>Subtotal</span><b>{money(subtotal)}</b></div><button className="cm-btn cm-wide" onClick={()=>{setCartOpen(false);setCheckout(true)}}>Checkout <ArrowRight/></button></>}</aside></div>}
  {checkout&&<div className="cm-overlay"><form className="cm-checkout" onSubmit={placeOrder}><div className="cm-drawer-head"><h2>Delivery Details</h2><button type="button" onClick={()=>setCheckout(false)}><X/></button></div><p>We currently deliver only in selected Sylhet areas.</p><label>Full name<input required value={customerName} onChange={e=>setCustomerName(e.target.value)}/></label><label>Phone number<input required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="01XXXXXXXXX"/></label><label>Email (optional)<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Delivery area<select required value={areaId} onChange={e=>setAreaId(e.target.value)}><option value="">Choose an active area</option>{areas.map(a=><option key={a.id} value={a.id}>{a.name} — {money(a.delivery_charge)}</option>)}</select></label><label>Full address<textarea required minLength={5} value={address} onChange={e=>setAddress(e.target.value)}/></label><div className="cm-total"><span>Subtotal</span><b>{money(subtotal)}</b></div><div className="cm-total"><span>Delivery</span><b>{chosenArea?money(chosenArea.delivery_charge):"Select area"}</b></div><div className="cm-total"><span>Total</span><b>{money(total)}</b></div><label className="cm-check"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> I will record an unboxing video from before opening the package if I need to report a defect.</label>{error&&<p className="cm-error">{error}</p>}<button className="cm-btn cm-wide" disabled={busy||!chosenArea||!accepted}>{busy?"Placing order…":"Place Order · "+money(total)}</button></form></div>}
  {success&&<div className="cm-overlay"><div className="cm-checkout"><div className="cm-drawer-head"><h2>Order Received!</h2><button onClick={()=>setSuccess("")}><X/></button></div><p>{success}</p><button className="cm-btn cm-wide" onClick={()=>setSuccess("")}>Continue Shopping</button></div></div>}
 </main>
}
