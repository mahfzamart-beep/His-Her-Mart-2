import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "His & Hers Mart",
    short_name: "H&H Mart",
    description: "Thoughtfully selected shopping for him and her across Bangladesh.",
    start_url: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#F7F4EE",
    theme_color: "#F7F4EE",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/app-icons/hhm-pwa-192-v2.jpg", sizes: "192x192", type: "image/jpeg", purpose: "any" },
      { src: "/app-icons/hhm-pwa-512-v2.jpg", sizes: "512x512", type: "image/jpeg", purpose: "any" }
    ]
  };
}
