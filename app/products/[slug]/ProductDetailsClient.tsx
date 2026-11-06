"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, ShoppingBag, Plus, Minus, Check } from "lucide-react";
import { supabase } from "../../../lib/supabase";

type Product = { id:string; slug:string; name:string; description:string|null; price:number; compare_at_price:number|null; image_url:string|null; stock_quantity:number; category?:{name:string}|null; free_shipping_eligible?:boolean };
const money=(n:number)=>new Intl.NumberFormat("en-BD",{style:"currency",currency:"BDT",maximumFractionDigits:0}).format(n);

export default function ProductDetailsPage({slug}:{slug:string}){
 const [product,setProduct]=useState<Product|null>(null);
 const [busy,setBusy]=useState(true);
 const [qty,setQty]=useState(1);
 const [added,setAdded]=useState(false);
 const [saved,setSaved]=useState(false);
 useEffect(()=>{
  let active=true;
  async function load(){
   if(!supabase||!slug){setBusy(false);return}
   const {data,error}=await supabase.from("products").select("id,slug,name,description,price,compare_at_price,image_url,stock_quantity,free_shipping_eligible,category:categories(name)").eq("slug",slug).eq("is_active",true).maybeSingle();
   if(!active)return;
   if(!error&&data){const item=data as unknown as Product;setProduct(item);try{setSaved((JSON.parse(localStorage.getItem("hhm-wishlist-v1")||"[]") as string[]).includes(item.id))}catch{}}
   setBusy(false);
  }
  void load();return()=>{active=false};
 },[slug]);
 function addToBag(){
  if(!product)return;
  let cart:Record<string,number>={};try{cart=JSON.parse(localStorage.getItem("hhm-cart-v1")||"{}")}catch{}
  cart[product.id]=Math.min(Number(product.stock_quantity),(cart[product.id]||0)+qty);
  localStorage.setItem("hhm-cart-v1",JSON.stringify(cart));window.dispatchEvent(new Event("hhm-storage-updated"));setAdded(true);
 }
 function toggleSaved(){
  if(!product)return;
  let list:string[]=[];try{list=JSON.parse(localStorage.getItem("hhm-wishlist-v1")||"[]")}catch{}
  const next=list.includes(product.id)?list.filter(x=>x!==product.id):[...list,product.id];
  localStorage.setItem("hhm-wishlist-v1",JSON.stringify(next));window.dispatchEvent(new Event("hhm-storage-updated"));setSaved(next.includes(product.id));
 }
 if(busy)return <main className="detail-shell"><p>Loading product…</p></main>;
 if(!product)return <main className="detail-shell"><p className="eyebrow">HIS & HER MART</p><h1>Product not found</h1><p>This item may be unavailable or no longer listed.</p><Link className="primary-btn" href="/">Back to shopping <ArrowLeft size={16}/></Link></main>;
 const stock=Number(product.stock_quantity||0);
 return <main className="detail-shell">
  <header className="detail-top"><Link href="/" className="detail-back"><ArrowLeft size={16}/> Back to store</Link><Link href="/wishlist" className="detail-wishlist"><Heart size={17}/> Wishlist</Link></header>
  <div className="detail-grid">
   <div className="detail-image"><img src={product.image_url||""} alt={product.name}/>{product.free_shipping_eligible&&<span>SELECTED FREE SHIPPING</span>}</div>
   <section className="detail-copy">
    <p className="eyebrow">{product.category?.name||"THE COLLECTION"}</p><h1>{product.name}</h1>
    <div className="detail-price">{money(Number(product.price))}{product.compare_at_price&&Number(product.compare_at_price)>Number(product.price)&&<del>{money(Number(product.compare_at_price))}</del>}</div>
    <p className="detail-stock">{stock>0?(stock<5?"Only "+stock+" left in stock":"In stock and ready to order"):"Currently out of stock"}</p>
    <p className="detail-description">{product.description||"A thoughtfully selected find from His & Her Mart. Contact our team if you need more product information before ordering."}</p>
    <div className="detail-quantity"><span>Quantity</span><div><button onClick={()=>setQty(v=>Math.max(1,v-1))} disabled={qty<=1}><Minus size={14}/></button><b>{qty}</b><button onClick={()=>setQty(v=>Math.min(stock,v+1))} disabled={qty>=stock}><Plus size={14}/></button></div></div>
    <div className="detail-actions"><button className="primary-btn" onClick={addToBag} disabled={stock<=0}>Add to bag <ShoppingBag size={16}/></button><button className={saved?"detail-save saved":"detail-save"} onClick={toggleSaved}><Heart size={17} fill={saved?"currentColor":"none"}/>{saved?"Saved":"Save item"}</button></div>
    {added&&<p className="detail-added"><Check size={15}/> Added to your bag. <Link href="/">Continue shopping</Link> or open your bag on the store page.</p>}
    <div className="detail-assurance"><div><b>Cash on Delivery</b><small>Pay when your parcel arrives</small></div><div><b>Order tracking</b><small>Track your order online</small></div><div><b>Need help?</b><small><Link href="/faq">Read our FAQs</Link></small></div></div>
   </section>
  </div>
 </main>;
}
