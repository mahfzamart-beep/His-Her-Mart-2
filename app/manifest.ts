import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "His & Hers Mart",
    short_name: "H&H Mart",
    description: "Thoughtfully selected shopping for him and her across Bangladesh.",
    start_url: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    id: "/",
    background_color: "#F7F4EE",
    theme_color: "#20231F",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/app-icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
