import type { MetadataRoute } from "next";

const SITE_URL = "https://cloudmomos.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/wishlist", "/track-order"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
