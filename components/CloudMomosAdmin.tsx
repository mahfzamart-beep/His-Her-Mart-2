"use client";

import { useCallback, useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import { supabase } from "../lib/supabase";
import { MapPin, Megaphone, Plus, RefreshCw, Upload, Pencil, Power, Trash2 } from "lucide-react";

type Area = { id: string; name: string; city: string; delivery_charge: number; is_active: boolean; sort_order: number };
type Ad = { id: string; title: string; description: string | null; image_url: string; button_text: string; target_url: string | null; product_id: string | null; starts_at: string | null; ends_at: string | null; is_active: boolean; display_order: number };
type Product = { id: string; name: string };
const money = (n: number) => new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(Number(n || 0));

export default function CloudMomosAdmin() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [areaDraft, setAreaDraft] = useState<{id:string|null;name:string;charge:string;active:boolean;sort:string}>({id:null,name:"",charge:"",active:false,sort:"0"});
  const [adDraft, setAdDraft] = useState<{id:string|null;title:string;description:string;image_url:string;button_text:string;target_url:string;product_id:string;area_ids:string[];active:boolean;sort:string}>({id:null,title:"",description:"",image_url:"",button_text:"Explore menu",target_url:"",product_id:"",area_ids:[],active:false,sort:"0"});
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabase) { setError("Supabase is not configured."); setLoading(false); return; }
    setLoading(true); setError("");
    const [a, b, p] = await Promise.all([
      supabase.from("delivery_areas").select("id,name,city,delivery_charge,is_active,sort_order").order("sort_order").order("name"),
      supabase.from("advertisements").select("id,title,description,image_url,button_text,target_url,product_id,starts_at,ends_at,is_active,display_order").order("display_order"),
      supabase.from("products").select("id,name").order("name")
    ]);
    if (a.error || b.error || p.error) setError([a.error?.message,b.error?.message,p.error?.message].filter(Boolean).join(" · "));
    setAreas((a.data || []) as Area[]); setAds((b.data || []) as Ad[]); setProducts((p.data || []) as Product[]);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const saveArea = async (event: FormEvent) => {
    event.preventDefault(); if (!supabase) return;
    const charge = Number(areaDraft.charge), sort = Number(areaDraft.sort), name = areaDraft.name.trim();
    if (name.length < 2 || !Number.isFinite(charge) || charge < 0 || !Number.isInteger(sort) || sort < 0) { setError("Enter a valid area name, delivery charge and display order."); return; }
    setSaving(true); setError(""); setNotice("");
    const payload = { name, city: "Sylhet", delivery_charge: charge, is_active: areaDraft.active, sort_order: sort, updated_at: new Date().toISOString() };
    const result = areaDraft.id ? await supabase.from("delivery_areas").update(payload).eq("id",areaDraft.id) : await supabase.from("delivery_areas").insert(payload);
    if (result.error) setError(result.error.message); else { setNotice("Delivery area saved."); setAreaDraft({id:null,name:"",charge:"",active:false,sort:String(areas.length)}); await refresh(); }
    setSaving(false);
  };

  const editArea = (area: Area) => setAreaDraft({id:area.id,name:area.name,charge:String(area.delivery_charge),active:area.is_active,sort:String(area.sort_order)});
  const toggleArea = async (area: Area) => { if (!supabase) return; const {error:e}=await supabase.from("delivery_areas").update({is_active:!area.is_active,updated_at:new Date().toISOString()}).eq("id",area.id); if(e)setError(e.message); else await refresh(); };
  const deleteArea = async (area: Area) => { if (!supabase || !window.confirm("Delete "+area.name+"? Existing orders keep their saved delivery charge.")) return; const {error:e}=await supabase.from("delivery_areas").delete().eq("id",area.id); if(e)setError(e.message); else await refresh(); };

  const editAd = async (ad: Ad) => {
    if (!supabase) return;
    const {data,error:e}=await supabase.from("advertisement_delivery_areas").select("delivery_area_id").eq("advertisement_id",ad.id);
    if(e){setError(e.message);return;}
    setAdDraft({id:ad.id,title:ad.title,description:ad.description||"",image_url:ad.image_url,button_text:ad.button_text,target_url:ad.target_url||"",product_id:ad.product_id||"",area_ids:(data||[]).map(x=>x.delivery_area_id),active:ad.is_active,sort:String(ad.display_order)});
  };

  const uploadAdImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file=event.target.files?.[0]; event.target.value="";
    if(!file||!supabase)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){setError("Choose a JPG, PNG or WebP image up to 5 MB.");return;}
    setUploading(true);setError("");
    const ext=file.type==="image/jpeg"?"jpg":file.type==="image/png"?"png":"webp";
    const path="advertisements/"+crypto.randomUUID()+"."+ext;
    const {error:e}=await supabase.storage.from("product-images").upload(path,file,{cacheControl:"3600",contentType:file.type,upsert:false});
    if(e)setError(e.message);else{const {data}=supabase.storage.from("product-images").getPublicUrl(path);setAdDraft(v=>({...v,image_url:data.publicUrl}));}
    setUploading(false);
  };

  const saveAd = async (event: FormEvent) => {
    event.preventDefault();if(!supabase)return;
    if(adDraft.title.trim().length<2||!/^https?:\/\//i.test(adDraft.image_url)||adDraft.area_ids.length===0){setError("Add a title, upload an image and select at least one delivery area.");return;}
    const sort=Number(adDraft.sort);if(!Number.isInteger(sort)||sort<0){setError("Enter a valid display order.");return;}
    setSaving(true);setError("");setNotice("");
    const payload={title:adDraft.title.trim(),description:adDraft.description.trim()||null,image_url:adDraft.image_url,button_text:adDraft.button_text.trim()||"Explore",target_url:adDraft.target_url.trim()||null,product_id:adDraft.product_id||null,is_active:adDraft.active,display_order:sort,updated_at:new Date().toISOString()};
    const result=adDraft.id?await supabase.from("advertisements").update(payload).eq("id",adDraft.id).select("id").single():await supabase.from("advertisements").insert(payload).select("id").single();
    if(result.error){setError(result.error.message);setSaving(false);return;}
    const adId=adDraft.id||result.data.id;
    const removed=await supabase.from("advertisement_delivery_areas").delete().eq("advertisement_id",adId);
    const inserted=await supabase.from("advertisement_delivery_areas").insert(adDraft.area_ids.map(delivery_area_id=>({advertisement_id:adId,delivery_area_id})));
    if(removed.error||inserted.error)setError(removed.error?.message||inserted.error?.message||"Could not save area targeting.");
    else{setNotice("Advertisement saved.");setAdDraft({id:null,title:"",description:"",image_url:"",button_text:"Explore menu",target_url:"",product_id:"",area_ids:[],active:false,sort:String(ads.length)});await refresh();}
    setSaving(false);
  };

  const toggleAd = async (ad: Ad) => {if(!supabase)return;const {error:e}=await supabase.from("advertisements").update({is_active:!ad.is_active,updated_at:new Date().toISOString()}).eq("id",ad.id);if(e)setError(e.message);else await refresh();};
  const deleteAd = async (ad: Ad) => {if(!supabase||!window.confirm("Delete advertisement “"+ad.title+"”?"))return;const {error:e}=await supabase.from("advertisements").delete().eq("id",ad.id);if(e)setError(e.message);else await refresh();};

  return <section className="admin-orders-card admin-products-card" style={{marginTop:24}}>
    <div className="admin-orders-toolbar"><div><p className="eyebrow">CLOUD MOMOS OPERATIONS</p><h2>Delivery areas & advertisements</h2><p>Start with selected Sylhet areas and expand whenever you are ready.</p></div><button className="admin-refresh" onClick={()=>void refresh()}><RefreshCw size={15}/> Refresh</button></div>
    {error&&<p className="admin-error" role="alert">{error}</p>}{notice&&<p className="admin-product-success" role="status">{notice}</p>}
    <div className="admin-product-form-grid" style={{alignItems:"start"}}>
      <form className="admin-product-form" onSubmit={saveArea} style={{border:"1px solid #e6dfd1",borderRadius:16,padding:16}}>
        <h3><MapPin size={17}/> Sylhet delivery area</h3>
        <label>Area name<input required minLength={2} maxLength={100} value={areaDraft.name} onChange={e=>setAreaDraft(v=>({...v,name:e.target.value}))} placeholder="e.g. Zindabazar"/></label>
        <div className="admin-product-form-grid"><label>Delivery charge (৳)<input required type="number" min="0" step="1" value={areaDraft.charge} onChange={e=>setAreaDraft(v=>({...v,charge:e.target.value}))}/></label><label>Display order<input type="number" min="0" step="1" value={areaDraft.sort} onChange={e=>setAreaDraft(v=>({...v,sort:e.target.value}))}/></label></div>
        <label className="admin-product-flags"><input type="checkbox" checked={areaDraft.active} onChange={e=>setAreaDraft(v=>({...v,active:e.target.checked}))}/> Enable customer checkout for this area</label>
        <div className="admin-product-form-actions">{areaDraft.id&&<button type="button" className="admin-secondary-btn" onClick={()=>setAreaDraft({id:null,name:"",charge:"",active:false,sort:String(areas.length)})}>Cancel edit</button>}<button className="admin-product-add" disabled={saving}>{saving?"Saving…":areaDraft.id?"Save area":"Add delivery area"}</button></div>
        <div className="admin-product-list">{areas.map(area=><article className="admin-product-row" key={area.id}><div className="admin-product-row-copy"><b>{area.name}</b><small>{money(Number(area.delivery_charge))} · Sylhet</small><span className={area.is_active?"admin-product-live":"admin-product-inactive"}>{area.is_active?"Active for checkout":"Disabled"}</span></div><div className="admin-product-row-actions"><button type="button" className="admin-product-edit" onClick={()=>editArea(area)}><Pencil size={13}/> Edit</button><button type="button" className="admin-product-edit" onClick={()=>void toggleArea(area)}><Power size={13}/> {area.is_active?"Disable":"Enable"}</button><button type="button" className="admin-product-delete" onClick={()=>void deleteArea(area)}><Trash2 size={13}/></button></div></article>)}</div>
      </form>
      <form className="admin-product-form" onSubmit={saveAd} style={{border:"1px solid #e6dfd1",borderRadius:16,padding:16}}>
        <h3><Megaphone size={17}/> Homepage advertisement</h3>
        <label>Advertisement title<input required minLength={2} maxLength={120} value={adDraft.title} onChange={e=>setAdDraft(v=>({...v,title:e.target.value}))} placeholder="Fresh Momos now in Zindabazar"/></label>
        <label>Description<textarea rows={2} maxLength={1000} value={adDraft.description} onChange={e=>setAdDraft(v=>({...v,description:e.target.value}))}/></label>
        <label>Banner image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAdImage} disabled={uploading}/><small>{uploading?"Uploading…":"JPG, PNG or WebP · up to 5 MB"}</small></label>
        {adDraft.image_url&&<img src={adDraft.image_url} alt="Advertisement preview" style={{width:"100%",maxHeight:150,objectFit:"cover",borderRadius:12}}/>}
        <label>Button text<input maxLength={40} value={adDraft.button_text} onChange={e=>setAdDraft(v=>({...v,button_text:e.target.value}))}/></label>
        <label>Destination URL (optional)<input value={adDraft.target_url} onChange={e=>setAdDraft(v=>({...v,target_url:e.target.value}))} placeholder="/#menu or https://…"/></label>
        <label>Related product (optional)<select value={adDraft.product_id} onChange={e=>setAdDraft(v=>({...v,product_id:e.target.value}))}><option value="">No specific product</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Available delivery areas<select multiple size={Math.min(5,Math.max(2,areas.length))} value={adDraft.area_ids} onChange={e=>setAdDraft(v=>({...v,area_ids:Array.from(e.target.selectedOptions).map(o=>o.value)}))}>{areas.filter(a=>a.is_active).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><small>Hold Ctrl (desktop) to select multiple areas. At least one active area is required.</small></label>
        <div className="admin-product-form-grid"><label>Display order<input type="number" min="0" step="1" value={adDraft.sort} onChange={e=>setAdDraft(v=>({...v,sort:e.target.value}))}/></label><label className="admin-product-flags"><input type="checkbox" checked={adDraft.active} onChange={e=>setAdDraft(v=>({...v,active:e.target.checked}))}/> Publish advertisement</label></div>
        <div className="admin-product-form-actions">{adDraft.id&&<button type="button" className="admin-secondary-btn" onClick={()=>setAdDraft({id:null,title:"",description:"",image_url:"",button_text:"Explore menu",target_url:"",product_id:"",area_ids:[],active:false,sort:String(ads.length)})}>Cancel edit</button>}<button className="admin-product-add" disabled={saving||uploading}>{saving?"Saving…":adDraft.id?"Save advertisement":"Create advertisement"}</button></div>
        <div className="admin-product-list">{ads.map(ad=><article className="admin-product-row" key={ad.id}><div className="admin-product-row-copy"><b>{ad.title}</b><small>{ad.is_active?"Published":"Paused"} · {ad.button_text}</small></div><div className="admin-product-row-actions"><button type="button" className="admin-product-edit" onClick={()=>void editAd(ad)}>Edit</button><button type="button" className="admin-product-edit" onClick={()=>void toggleAd(ad)}>{ad.is_active?"Pause":"Publish"}</button><button type="button" className="admin-product-delete" onClick={()=>void deleteAd(ad)}><Trash2 size={13}/></button></div></article>)}</div>
      </form>
    </div>
    {loading&&<p className="admin-muted"><RefreshCw className="spin" size={14}/> Loading Cloud Momos settings…</p>}
  </section>;
}
