import { createClient } from "npm:@supabase/supabase-js@2";
function allowedOrigin(origin:string|null){if(!origin)return false;try{const u=new URL(origin);return u.protocol==="https:"&&/^his-and-her-mart(?:-[a-z0-9-]+)?\.vercel\.app$/.test(u.hostname)}catch{return false}}
function cors(origin:string|null){return {"Access-Control-Allow-Origin":allowedOrigin(origin)?origin:"null","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"}}
function json(data:unknown,status:number,origin:string|null){return new Response(JSON.stringify(data),{status,headers:{...cors(origin),"Content-Type":"application/json"}})}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");
 if(req.method==="OPTIONS"){if(!allowedOrigin(origin))return new Response("Forbidden",{status:403});return new Response("ok",{headers:cors(origin)})}
 if(req.method!=="POST")return json({error:"Method not allowed."},405,origin);
 if(!allowedOrigin(origin))return json({error:"This website is not allowed to place orders."},403,origin);
 if(Number(req.headers.get("content-length")||"0")>15000)return json({error:"The checkout request is too large."},413,origin);
 let body:Record<string,unknown>;try{body=await req.json()}catch{return json({error:"Invalid checkout request."},400,origin)}
 if(typeof body.website==="string"&&body.website.trim())return json({error:"Unable to process this request."},400,origin);
 const name=typeof body.customer_name==="string"?body.customer_name.trim():"";
 const phone=typeof body.customer_phone==="string"?body.customer_phone.trim():"";
 const email=typeof body.customer_email==="string"?body.customer_email.trim():null;
 const a=body.shipping_address as Record<string,unknown>|null;const items=body.items;
 const accepted=body.accept_unboxing_policy===true;const normalizedPhone=phone.replace(/[\s()-]/g,"");
 if(name.length<2||name.length>100)return json({error:"Please enter a valid customer name."},400,origin);
 if(!/^(?:\+?88)?01[3-9][0-9]{8}$/.test(normalizedPhone))return json({error:"Please enter a valid Bangladesh mobile number."},400,origin);
 if(email&&(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))return json({error:"Please enter a valid email address."},400,origin);
 if(!a||typeof a!=="object"||Array.isArray(a)||typeof a.delivery_area_id!=="string"||!/^[0-9a-f-]{36}$/i.test(a.delivery_area_id)||typeof a.address_line!=="string"||a.address_line.trim().length<5)return json({error:"Please select an active Sylhet delivery area and enter your full address."},400,origin);
 if(!Array.isArray(items)||items.length<1||items.length>15)return json({error:"Your box is empty or contains too many products."},400,origin);
 if(!items.every(item=>{if(!item||typeof item!=="object")return false;const l=item as Record<string,unknown>;return typeof l.product_id==="string"&&/^[0-9a-f-]{36}$/i.test(l.product_id)&&Number.isInteger(l.quantity)&&Number(l.quantity)>=1&&Number(l.quantity)<=10}))return json({error:"Your box contains an invalid product or quantity."},400,origin);
 if(!accepted)return json({error:"Please accept the unboxing video notice."},400,origin);
 const url=Deno.env.get("SUPABASE_URL");let key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");const keys=Deno.env.get("SUPABASE_SECRET_KEYS");
 if(keys){try{key=JSON.parse(keys).default||key}catch{}}
 if(!url||!key)return json({error:"Secure order processing is temporarily unavailable."},503,origin);
 const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data,error}=await admin.rpc("create_guest_order",{p_customer_name:name,p_customer_phone:normalizedPhone,p_customer_email:email||null,p_shipping_address:{delivery_area_id:a.delivery_area_id,address_line:a.address_line.trim(),city:"Sylhet"},p_items:items,p_accept_unboxing_policy:true});
 if(error)return json({error:error.message},error.message.toLowerCase().includes("too many orders")?429:400,origin);
 const order=data as Record<string,unknown>;
 if(typeof order.order_number!=="string"||!Number.isFinite(Number(order.total)))return json({error:"The order confirmation could not be verified. Please contact Cloud Momos before trying again."},500,origin);
 return json({order},200,origin);
});