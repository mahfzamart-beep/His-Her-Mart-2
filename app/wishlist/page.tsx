"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
type Product={id:string;slug:string;name:string;price:number;image_url:string|null;stock_quantity:number;size_options:string[]|null;color_options:string[]|null;category?:{name:string}|null};
const money=(n:number)=>new Intl.NumberFormat("en-BD",{style:"currency",currency:"BDT",maximumFractionDigits:0}).format(n);
export default function WishlistPage(){
 const [ids,setIds]=useState<string[]>([]);const [items,setItems]=useState<Product[]>([]);const [loading,setLoading]=useState(true);const [notice,setNotice]=useState("");
 useEffect(()=>{try{setIds(JSON.parse(localStorage.getItem("hhm-wishlist-v1")||"[]"))}catch{setIds([])}},[]);
 useEffect(()=>{let active=true;async function load(){if(!supabase||ids.length===0){setItems([]);setLoading(false);return}
 const {data}=await supabase.from("products").select("id,slug,name,price,image_url,stock_quantity,size_options,color_options,category:categories(name)").in("id",ids).eq("is_active",true);
 if(active)setItems((data||[]) as unknown as Product[]);if(active)setLoading(false)}
 void load();return()=>{active=false}},[ids]);
 function remove(id:string){const next=ids.filter(x=>x!==id);setIds(next);localStorage.setItem("hhm-wishlist-v1",JSON.stringify(next));window.dispatchEvent(new Event("hhm-storage-updated"))}
 function addToBag(product:Product){
  if(product.size_options?.length||product.color_options?.length){window.location.assign("/products/"+product.slug);return}
  const stock=Math.max(0,Number(product.stock_quantity||0));
  if(stock<=0){setNotice(product.name+" is currently out of stock.");return}
  let cart:Record<string,number>={};try{cart=JSON.parse(localStorage.getItem("hhm-cart-v1")||"{}")}catch{cart={}}
  const current=Math.max(0,Number(cart[product.id]||0));
  const next=Math.min(stock,10,current+1);
  if(next<=current){setNotice("You already have the maximum available quantity of "+product.name+" in your bag.");return}
  cart[product.id]=next;localStorage.setItem("hhm-cart-v1",JSON.stringify(cart));window.dispatchEvent(new Event("hhm-storage-updated"));window.location.assign("/?openBag=1");
 }
 function orderNow(product:Product){
  if(product.size_options?.length||product.color_options?.length){window.location.assign("/products/"+product.slug);return}
  if(!/^[0-9a-f-]{36}$/i.test(product.id)){setNotice("Please open the product page to order this item.");return}
  window.location.assign("/?buyNow="+encodeURIComponent(product.id));
 }
 return <main className="wishlist-shell"><header className="detail-top"><Link href="/" className="detail-back"><ArrowLeft size={16}/> Back to store</Link><Link href="/track-order" className="detail-wishlist">Track order</Link></header>
 <section className="wishlist-heading"><Heart size={23}/><p className="eyebrow">YOUR PERSONAL EDIT</p><h1>Saved <em>favourites.</em></h1><p>Keep the pieces you love in one place while you browse.</p></section>
 {notice&&<p className="wishlist-notice" role="status">{notice}</p>}
 {loading?<p className="wishlist-empty">Loading your saved items…</p>:items.length===0?<div className="wishlist-empty"><ShoppingBag size={34}/><h2>Your wishlist is waiting.</h2><p>Tap the heart on any product to save it here.</p><Link className="primary-btn" href="/">Explore the collection</Link></div>:
 <div className="wishlist-grid">{items.map(p=><article className="wishlist-card" key={p.id}><Link href={"/products/"+p.slug}><img src={p.image_url||""} alt={p.name}/></Link><div><small>{p.category?.name||"Collection"}</small><Link href={"/products/"+p.slug}><b>{p.name}</b></Link><strong>{money(Number(p.price))}</strong><small className={Number(p.stock_quantity)>0?"wishlist-stock-in":"wishlist-stock-out"}>{Number(p.stock_quantity)>0?"In stock":"Out of stock"}</small><div className="wishlist-card-purchase"><button type="button" disabled={Number(p.stock_quantity)<=0} onClick={()=>addToBag(p)}>Add to bag <ShoppingBag size={13}/></button><button type="button" disabled={Number(p.stock_quantity)<=0} onClick={()=>orderNow(p)}>Order now <ArrowRight size={13}/></button></div><div className="wishlist-card-actions"><Link href={"/products/"+p.slug}>View product</Link><button onClick={()=>remove(p.id)} aria-label={"Remove "+p.name+" from wishlist"}><Trash2 size={15}/> Remove</button></div></div></article>)}</div>}
 </main>;
}
