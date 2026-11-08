import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "His & Hers Mart",
    short_name: "H&H Mart",
    description: "Thoughtfully selected shopping for him and her across Bangladesh.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F4EE",
    theme_color: "#20231F",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
    ]
  };
}
