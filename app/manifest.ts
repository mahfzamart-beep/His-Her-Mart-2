import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Miss Can Cake",
    short_name: "Miss Can Cake",
    description: "Small-batch chilled desserts delivered in selected areas of Sylhet City.",
    start_url: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#f8f2e9",
    theme_color: "#2c1c19",
    categories: ["food", "food-and-drink"],
    icons: [
      { src: "/miss-can-cake-app-icon.svg?v=2", sizes: "any", type: "image/svg+xml", purpose: "any" }
    ]
  };
}
