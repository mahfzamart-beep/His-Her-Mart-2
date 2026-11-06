import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import ProductDetailsClient from "./ProductDetailsClient";

const SITE_URL = "https://his-and-her-mart.vercel.app";
type PageProps = { params: Promise<{ slug: string }> };

async function getProduct(slug: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !slug) return null;
  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("products")
    .select("name,description,image_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    return {
      title: "Product not found",
      robots: { index: false, follow: true },
    };
  }
  const title = `${product.name} | His & Her Mart`;
  const description = (product.description || `Shop ${product.name} at His & Her Mart, Bangladesh. Discover thoughtfully selected everyday essentials.`).slice(0, 160);
  const image = product.image_url && /^https?:\/\//i.test(product.image_url) ? product.image_url : undefined;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/products/${encodeURIComponent(slug)}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/products/${encodeURIComponent(slug)}`,
      siteName: "His & Her Mart",
      locale: "en_BD",
      type: "website",
      ...(image ? { images: [{ url: image, alt: product.name }] } : {}),
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  return <ProductDetailsClient slug={slug} />;
}
