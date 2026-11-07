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
  if (!origin || !allowedOrigins.has(origin)) return json({ error: "This website is not allowed to place orders." }, 403, origin);

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > 15000) return json({ error: "The checkout request is too large." }, 413, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid checkout request." }, 400, origin);
  }

  // Honeypot field for basic bot filtering. Real customers leave it empty.
  if (typeof body.website === "string" && body.website.trim()) {
    return json({ error: "Unable to process this request." }, 400, origin);
  }

  const customerName = typeof body.customer_name === "string" ? body.customer_name.trim() : "";
  const customerPhone = typeof body.customer_phone === "string" ? body.customer_phone.trim() : "";
  const customerEmail = typeof body.customer_email === "string" ? body.customer_email.trim() : null;
  const shippingAddress = body.shipping_address;
  const items = body.items;
  const accepted = body.accept_unboxing_policy === true;

  const phonePattern = /^(?:\+?88)?01[3-9][0-9]{8}$/;
  const normalizedPhone = customerPhone.replace(/[\s()-]/g, "");

  if (customerName.length < 2 || customerName.length > 100) {
    return json({ error: "Please enter a valid customer name." }, 400, origin);
  }
  if (!phonePattern.test(normalizedPhone)) {
    return json({ error: "Please enter a valid Bangladesh mobile number." }, 400, origin);
  }
  if (customerEmail && (customerEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))) {
    return json({ error: "Please enter a valid email address." }, 400, origin);
  }
  if (!shippingAddress || typeof shippingAddress !== "object" || Array.isArray(shippingAddress)) {
    return json({ error: "Please provide your delivery address." }, 400, origin);
  }
  const address = shippingAddress as Record<string, unknown>;
  if (address.delivery_zone !== "inside_dhaka" && address.delivery_zone !== "outside_dhaka") {
    return json({ error: "Please select Inside Dhaka (৳80) or Outside Dhaka (৳150)." }, 400, origin);
  }
  if (typeof address.district !== "string" || address.district.trim().length < 2 ||
      typeof address.address_line !== "string" || address.address_line.trim().length < 5 ||
      (typeof address.area !== "string" && address.area !== undefined)) {
    return json({ error: "Please provide a district and complete delivery address." }, 400, origin);
  }
  if (!Array.isArray(items) || items.length < 1 || items.length > 15) {
    return json({ error: "Your cart is empty or contains too many different products." }, 400, origin);
  }
  const isOptionalSelection = (value: unknown) =>
    value === undefined || value === null || (typeof value === "string" && value.length <= 64);
  const validItems = items.every((item) => {
    if (!item || typeof item !== "object") return false;
    const line = item as Record<string, unknown>;
    return typeof line.product_id === "string" &&
      /^[0-9a-f-]{36}$/i.test(line.product_id) &&
      Number.isInteger(line.quantity) &&
      Number(line.quantity) >= 1 &&
      Number(line.quantity) <= 10 &&
      isOptionalSelection(line.selected_size) &&
      isOptionalSelection(line.selected_color);
  });
  if (!validItems) {
    return json({ error: "Your cart contains an invalid product or quantity." }, 400, origin);
  }
  if (!accepted) return json({ error: "Please accept the unboxing video notice to continue." }, 400, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  let secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeysRaw) {
    try {
      secretKey = JSON.parse(secretKeysRaw).default || secretKey;
    } catch {
      // Fall back to the legacy server-side key when available.
    }
  }
  if (!supabaseUrl || !secretKey) {
    return json({ error: "Secure order processing is temporarily unavailable." }, 503, origin);
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.rpc("create_guest_order", {
    p_customer_name: customerName,
    p_customer_phone: normalizedPhone,
    p_customer_email: customerEmail || null,
    p_shipping_address: {
      district: address.district.trim(),
      delivery_zone: address.delivery_zone,
      area: typeof address.area === "string" ? address.area.trim() : "",
      address_line: address.address_line.trim(),
    },
    p_items: items,
    p_accept_unboxing_policy: true,
  });

  if (error) {
    const limited = error.message.toLowerCase().includes("too many orders");
    return json(
      { error: error.message },
      limited ? 429 : 400,
      origin,
    );
  }

  const created = data as Record<string, unknown>;
  const orderNumber = typeof created.order_number === "string" ? created.order_number : "";
  const subtotal = Number(created.subtotal || 0);
  if (!orderNumber || !Number.isFinite(subtotal)) {
    return json({ error: "The order was created but its confirmation could not be verified. Please contact WhatsApp support before placing another order." }, 500, origin);
  }

  const freeShippingApplied = created.free_shipping_applied === true;
  const deliveryCharge = Number(created.delivery_charge);
  const total = Number(created.total);
  if (!Number.isFinite(deliveryCharge) || !Number.isFinite(total)) {
    console.error("Order RPC returned invalid totals", orderNumber);
    return json({
      error: "Your order " + orderNumber + " was received, but its total could not be verified. Please WhatsApp +8801969419302 and do not place the order again.",
      order_received: true,
      order_number: orderNumber,
    }, 200, origin);
  }

  return json({
    order: {
      ...created,
      delivery_charge: deliveryCharge,
      total,
      free_shipping_applied: freeShippingApplied,
    },
  }, 200, origin);
});
