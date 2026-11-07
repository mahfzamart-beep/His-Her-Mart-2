import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_HTML_LENGTH = 4 * 1024 * 1024;
const SHOPBASE_HOST = "shopbasebd.com";
const AI_MODEL = "gemini-3.8-flash";

type JsonRecord = Record<string, unknown>;

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

function isShopBaseUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      (hostname !== SHOPBASE_HOST && !hostname.endsWith("." + SHOPBASE_HOST)) ||
      (url.port && url.port !== "443") ||
      url.username ||
      url.password
    ) return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#x([\da-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—");
}

function stripMarkup(value: unknown): string {
  const safeValue = typeof value === "string" ? value : "";
  return decodeHtml(safeValue.replace(/<\/?[^>]+>/g, " "))
    .replace(/[\t\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function tagAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const body = tag.replace(/^<[a-z0-9:-]+/i, "").replace(/>$/, "");
  const regex = /([a-z_:][-a-z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body))) {
    attributes[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function metaValues(html: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attrs = tagAttributes(tag);
    const key = (attrs.property || attrs.name || attrs.itemprop || "").toLowerCase();
    if (key && attrs.content) values[key] = attrs.content.trim();
  }
  return values;
}

function flattenStrings(value: unknown): string[] {
  if (typeof value === "string") return [stripMarkup(value)].filter(Boolean);
  if (Array.isArray(value)) return value.flatMap(flattenStrings);
  if (value && typeof value === "object") {
    const obj = value as JsonRecord;
    const candidate = obj.name ?? obj.value ?? obj.url;
    return candidate === undefined ? [] : flattenStrings(candidate);
  }
  return [];
}

function walkObjects(value: unknown, visit: (obj: JsonRecord) => void, depth = 0): void {
  if (depth > 12 || !value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) walkObjects(item, visit, depth + 1);
    return;
  }
  const obj = value as JsonRecord;
  visit(obj);
  for (const child of Object.values(obj)) walkObjects(child, visit, depth + 1);
}

function isProductObject(value: JsonRecord): boolean {
  const rawType = value["@type"];
  const types = Array.isArray(rawType) ? rawType : [rawType];
  return types.some(type => typeof type === "string" && /product/i.test(type));
}

function toImageUrl(value: string, base: URL): string | null {
  try {
    const url = new URL(value, base);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isGenericShopBaseHeading(value: string): boolean {
  const text = value.toLowerCase().replace(/\s+/g, " ").trim();
  return !text ||
    /^(shopbase\s*bd|largest drop.?shipping platform in bangladesh|home|products|product|our products|about us|services|contact us|login|registration|sign in|sign up|হোম|আমাদের সম্পর্কে|প্রোডাক্টস|সার্ভিস সমূহ|যোগাযোগ|লগইন|রেজিস্ট্রেশন)$/i.test(text) ||
    /^(?:bdt|৳|tk\.?)\s*[\d,]+$/i.test(text) ||
    /(?:wholesale price|হোলসেল প্রাইস|suggested sale price|সাজেস্টেড বিক্রয়মূল্য)/i.test(text);
}

function extractHeadingText(html: string): string[] {
  const values: string[] = [];
  for (const match of html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi)) {
    const value = stripMarkup(match[2]).slice(0, 140);
    if (!isGenericShopBaseHeading(value) && value.length >= 2) values.push(value);
  }
  return Array.from(new Set(values));
}

function extractImageCandidates(html: string, pageUrl: URL, productName: string, meta: Record<string, string>): string[] {
  const matching: string[] = [];
  const other: string[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const attrs = tagAttributes(match[0]);
    const raw = attrs.src || attrs["data-src"] || attrs["data-lazy-src"] || attrs["data-original"] || attrs["data-image"];
    const alt = (attrs.alt || attrs.title || "").toLowerCase();
    if (!raw) continue;
    const imageUrl = toImageUrl(raw.split(",")[0].trim().split(/\s+/)[0], pageUrl);
    if (!imageUrl || seen.has(imageUrl)) continue;
    if (/(?:logo|favicon|icon|avatar|profile|placeholder|banner)/i.test(imageUrl)) continue;
    seen.add(imageUrl);
    if (productName && alt.includes(productName.toLowerCase())) matching.push(imageUrl);
    else other.push(imageUrl);
  }
  const primaryMetaImage = meta["og:image"] || meta["twitter:image"] || meta["image"] || "";
  const resolvedMetaImage = primaryMetaImage ? toImageUrl(primaryMetaImage, pageUrl) : null;
  const all = [...matching, ...(resolvedMetaImage && !seen.has(resolvedMetaImage) ? [resolvedMetaImage] : []), ...other];
  return Array.from(new Set(all)).slice(0, 12);
}

function extractWholesalePrice(pageText: string): number | null {
  const patterns = [
    /(?:হোলসেল\s*প্রাইস|wholesale\s*price)\s*[:ঃ]?\s*(?:৳|BDT\s*)?([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:টাকা|৳|BDT)?/i,
    /(?:wholesale|হোলসেল)[\s\S]{0,50}?(?:৳|BDT|Tk\.?)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i
  ];
  for (const pattern of patterns) {
    const match = pageText.match(pattern);
    if (!match?.[1]) continue;
    const value = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return null;
}

function extractProduct(html: string, pageUrl: URL) {
  const meta = metaValues(html);
  const titleTag = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  const pageText = stripMarkup(html
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, " ")
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, " "));
  const headingNames = extractHeadingText(html);
  const safeMetaTitle = [meta["og:title"], meta["twitter:title"], stripMarkup(titleTag)]
    .map(value => stripMarkup(value).replace(/\s*[|–-]\s*ShopBase BD.*$/i, "").trim())
    .find(value => value.length >= 2 && !/shopbase\s*bd|largest drop.?shipping platform/i.test(value) && !isGenericShopBaseHeading(value));
  const name = headingNames[0] || safeMetaTitle || "";

  const jsonLdObjects: JsonRecord[] = [];
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1].trim()) as unknown;
      walkObjects(parsed, obj => { if (isProductObject(obj)) jsonLdObjects.push(obj); });
    } catch {
      // Ignore malformed structured-data blocks and use the visible product detail page.
    }
  }
  const product = jsonLdObjects[0] || {};
  const offersValue = product.offers;
  const offer = (Array.isArray(offersValue) ? offersValue[0] : offersValue) as JsonRecord | undefined;
  const jsonPrice = offer && (offer.price ?? offer.lowPrice ?? offer.highPrice);
  const currency = String(offer?.priceCurrency ?? meta["product:price:currency"] ?? "BDT").toUpperCase();
  const wholesalePrice = extractWholesalePrice(pageText);
  const visiblePrice = pageText.match(/(?:৳|BDT\s*|Tk\.?\s*)([0-9][0-9,]*(?:\.\d{1,2})?)/i)
    ?? pageText.match(/([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:৳|BDT|Tk\.?)/i);
  const rawPrice = wholesalePrice ?? jsonPrice ?? meta["product:price:amount"] ?? meta["og:price:amount"] ?? visiblePrice?.[1];
  const numericPrice = typeof rawPrice === "number" || typeof rawPrice === "string"
    ? Number(String(rawPrice).replace(/,/g, ""))
    : NaN;
  const supplierPrice = currency === "BDT" && Number.isFinite(numericPrice) && numericPrice >= 0
    ? numericPrice
    : null;

  const imageValues = [
    ...flattenStrings(product.image),
    ...flattenStrings(product.images),
  ];
  const images = Array.from(new Set([
    ...imageValues.map(value => toImageUrl(value, pageUrl)).filter((value): value is string => Boolean(value)),
    ...extractImageCandidates(html, pageUrl, name, meta),
  ])).slice(0, 12);

  const colors = new Set<string>();
  const sizes = new Set<string>();
  walkObjects(product, obj => {
    for (const value of flattenStrings(obj.color ?? obj.colors)) {
      if (value.length <= 60) colors.add(value);
    }
    for (const value of flattenStrings(obj.size ?? obj.sizes)) {
      if (value.length <= 40) sizes.add(value);
    }
  });
  const category = flattenStrings(product.category)[0] || meta["product:category"] || "";
  const sku = flattenStrings(product.sku ?? product.mpn)[0] || meta["product:retailer_item_id"] || "";
  const availabilityText = String(offer?.availability ?? "");
  const explicitStock = product.inventoryLevel ?? product.inventoryQuantity;
  const stockNumber = Number(explicitStock);
  const stockQuantity = Number.isInteger(stockNumber) && stockNumber >= 0
    ? stockNumber
    : /outofstock|soldout/i.test(availabilityText) ? 0 : null;

  const nameIndex = name ? pageText.toLowerCase().indexOf(name.toLowerCase()) : -1;
  const descriptionText = nameIndex >= 0
    ? pageText.slice(nameIndex + name.length).split(/largest drop.?shipping platform in bangladesh|legal\s*&\s*information/i)[0].trim()
    : "";
  const originalDescription = flattenStrings(product.description)[0]
    || descriptionText.slice(0, 5000)
    || meta["og:description"] || meta["description"] || meta["twitter:description"];

  const canonicalTag = html.match(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/i)?.[0] || "";
  const canonical = canonicalTag ? tagAttributes(canonicalTag).href : "";
  const canonicalUrl = canonical ? toImageUrl(canonical, pageUrl) : null;

  return {
    name: stripMarkup(name).slice(0, 140),
    originalDescription: stripMarkup(originalDescription).slice(0, 5000),
    images,
    supplierPrice,
    currency,
    sku: stripMarkup(sku).slice(0, 80),
    colors: Array.from(colors).slice(0, 50),
    sizes: Array.from(sizes).slice(0, 50),
    category: stripMarkup(category).slice(0, 100),
    stockQuantity,
    sourceUrl: canonicalUrl && isShopBaseUrl(canonicalUrl) ? canonicalUrl.toString() : pageUrl.toString(),
  };
}

async function fetchShopBasePage(startUrl: URL): Promise<{ html: string; finalUrl: URL }> {
  let current = startUrl;
  for (let hop = 0; hop <= 3; hop++) {
    const response = await fetch(current, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(12000),
      headers: {
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "bn-BD,bn;q=0.9,en;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; HisAndHerMartProductImporter/1.0)",
      },
      cache: "no-store",
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || hop === 3) throw new Error("ShopBase BD redirected too many times. Open the product link in your browser and try its final URL.");
      const nextUrl = isShopBaseUrl(new URL(location, current).toString());
      if (!nextUrl) throw new Error("The ShopBase BD product link redirected outside the allowed ShopBase BD domain.");
      current = nextUrl;
      continue;
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("This ShopBase BD page requires login or blocks server access. Try a public product link, or provide the product details manually.");
    }
    if (!response.ok) throw new Error("ShopBase BD could not load this page (HTTP " + response.status + ").");
    const contentType = response.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      throw new Error("That link did not return a readable product webpage.");
    }
    const length = Number(response.headers.get("content-length") || 0);
    if (length > MAX_HTML_LENGTH) throw new Error("The product page is too large to scan.");
    const html = await response.text();
    if (html.length > MAX_HTML_LENGTH) throw new Error("The product page is too large to scan.");
    return { html, finalUrl: current };
  }
  throw new Error("Unable to follow the ShopBase BD product link.");
}

async function writePremiumEnglishDescription(input: {
  name: string;
  originalDescription: string;
  category: string;
  colors: string[];
  sizes: string[];
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINIAPIKEY;
  if (!apiKey) {
    throw new Error("Gemini AI is not connected to this deployment. Add GEMINI_API_KEY in Vercel Project Environment Variables and redeploy the Preview.");
  }

  const systemInstruction = [
    "You are the product copywriter for His & Her Mart, a premium, modern Bangladesh online store.",
    "Rewrite the supplier's product description into polished, natural English only.",
    "Do not invent, assume, exaggerate, or guarantee any product feature, material, dimension, quality, warranty, origin, certification, stock status, or benefit.",
    "Use only facts explicitly present in the supplied product information. Preserve important factual details. Omit details that are unclear.",
    "Use a refined, concise, customer-friendly tone. Do not mention the supplier, source website, wholesale cost, or AI.",
    "Return plain text only, with short paragraphs and simple bullet points only when the source contains multiple factual specifications.",
    "If the source description is empty, write only a brief neutral description based on the product name and supplied options, without claiming features."
  ].join(" ");

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    signal: AbortSignal.timeout(20000),
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      input: JSON.stringify(input),
      system_instruction: systemInstruction,
      store: false,
      generation_config: {
        max_output_tokens: 650
      }
    }),
  });

  const result = await response.json().catch(() => null) as {
    error?: { message?: string; status?: string };
    status?: string;
    steps?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  } | null;

  if (!response.ok) {
    const message = result?.error?.message || "Gemini did not respond successfully.";
    throw new Error(response.status === 401 || response.status === 403
      ? "Gemini API authentication failed. Check that GEMINI_API_KEY is correct and enabled in Vercel."
      : response.status === 429
        ? "Gemini API rate limit or quota reached. Check your Google AI Studio usage and billing limits."
        : message.slice(0, 220));
  }

  const description = (result?.steps || [])
    .filter(step => step.type === "model_output")
    .flatMap(step => step.content || [])
    .filter(part => part.type === "text" && typeof part.text === "string")
    .map(part => part.text || "")
    .join("\n")
    .trim();

  if (cleanedDescription(description).length < 20) {
    throw new Error("Gemini returned an empty description. Please retry the import.");
  }
  return cleanedDescription(description).slice(0, 5000);
}

function cleanedDescription(value: string): string {
  return value.replace(/\x60{3}[a-z]*\n?/gi, "").trim();
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!supabaseUrl || !publishableKey || !accessToken) {
      return json({ error: "Sign in to the admin panel before importing a product." }, 401);
    }

    const supabase = createClient(supabaseUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: "Bearer " + accessToken } },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) return json({ error: "Your admin session has expired. Please sign in again." }, 401);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (profileError || profile?.role !== "admin") return json({ error: "Administrator access is required." }, 403);

    const body = await request.json().catch(() => null) as { url?: unknown } | null;
    const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
    const productUrl = isShopBaseUrl(rawUrl);
    if (!productUrl) {
      return json({ error: "Paste a valid HTTPS product URL from shopbasebd.com." }, 400);
    }
    // ShopBase BD product URLs include /store/products/details/{id}
    // as well as storefront variants ending in /product/details/{id}.
    if (!/(?:\/store\/products\/details\/\d+|\/product\/details\/\d+)\/?$/i.test(productUrl.pathname)) {
      return json({ error: "This link does not appear to be a ShopBase BD product details page. Copy the Share / Product Details link from the selected product and try again." }, 400);
    }

    const { data: duplicate, error: duplicateError } = await supabase
      .from("products")
      .select("id,name")
      .eq("supplier_product_url", productUrl.toString())
      .maybeSingle();
    if (duplicateError) return json({ error: "Could not check for duplicate products. Please retry." }, 500);
    if (duplicate) {
      return json({ error: "This supplier link is already imported as: " + duplicate.name, duplicateProductId: duplicate.id }, 409);
    }

    const { html, finalUrl } = await fetchShopBasePage(productUrl);
    const extracted = extractProduct(html, finalUrl);
    if (
      extracted.name.length < 2 ||
      isGenericShopBaseHeading(extracted.name) ||
      /shopbase\s*bd|largest drop.?shipping platform/i.test(extracted.name) ||
      extracted.images.length === 0
    ) {
      return json({
        error: "ShopBase BD opened, but the exact product name or product photos could not be identified. No draft was created. Copy the link from the specific product's Details page, not the ShopBase BD home, category, or seller dashboard.",
      }, 422);
    }

    const premiumDescription = await writePremiumEnglishDescription({
      name: extracted.name,
      originalDescription: extracted.originalDescription,
      category: extracted.category,
      colors: extracted.colors,
      sizes: extracted.sizes,
    });

    return json({
      product: {
        ...extracted,
        sourceUrl: finalUrl.toString(),
        premiumDescription,
        aiModel: AI_MODEL,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product import failed. Please retry.";
    const status = /timed out|timeout/i.test(message) ? 504 : 400;
    return json({ error: message.slice(0, 320) }, status);
  }
}
