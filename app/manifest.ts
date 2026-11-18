import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Cloud Momos",
    short_name: "Cloud Momos",
    description: "Freshly cooked and frozen momos delivered in selected areas of Sylhet City.",
    start_url: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#f7f1e5",
    theme_color: "#173f30",
    categories: ["food", "food-and-drink"],
    icons: [
      { src: "/cloud-momos-app-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
    ]
  };
}
