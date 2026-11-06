import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://his-and-her-mart.vercel.app",
  "https://his-and-her-mart-his-ans-her-mart.vercel.app",
  "https://his-and-her-mart-git-main-his-ans-her-mart.vercel.app",
  "http://localhost:3000",
]);

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
function json(data: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    if (!origin || !allowedOrigins.has(origin)) return new Response("Forbidden", { status: 403 });
    return new Response("ok", { headers: cors(origin) });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405, origin);
  if (!origin || !allowedOrigins.has(origin)) return json({ error: "This website is not allowed to track orders." }, 403, origin);
  const length = Number(req.headers.get("content-length") || "0");
  if (length > 5000) return json({ error: "The request is too large." }, 413, origin);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid tracking request." }, 400, origin); }
  const orderNumber = typeof body.order_number === "string" ? body.order_number.trim().toUpperCase() : "";
  const phoneRaw = typeof body.customer_phone === "string" ? body.customer_phone.trim() : "";
  const phone = phoneRaw.replace(/[\s()-]/g, "");
  if (!/^HHM-[0-9]{6}-[A-F0-9]{6}$/.test(orderNumber)) {
    return json({ error: "Enter the order number exactly as shown in your confirmation." }, 400, origin);
  }
  if (!/^(?:\+?88)?01[3-9][0-9]{8}$/.test(phone)) {
    return json({ error: "Enter the Bangladesh mobile number used at checkout." }, 400, origin);
  }

  const url = Deno.env.get("SUPABASE_URL");
  let key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const rawKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (rawKeys) {
    try { key = JSON.parse(rawKeys).default || key; } catch { /* Retain legacy fallback. */ }
  }
  if (!url || !key) return json({ error: "Order tracking is temporarily unavailable." }, 503, origin);

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await admin.rpc("track_guest_order", {
    p_order_number: orderNumber,
    p_customer_phone: phone,
  });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("too many") || message.includes("rate limit")) {
      return json({ error: "Too many attempts. Please try again in 15 minutes." }, 429, origin);
    }
    return json({ error: "We could not find an order matching those details." }, 404, origin);
  }
  if (!data || data.found !== true) {
    return json({ error: "We could not find an order matching those details. Check the order number and phone number." }, 404, origin);
  }
  return json({ order: data }, 200, origin);
});
