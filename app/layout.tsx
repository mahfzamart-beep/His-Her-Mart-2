import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./storefront-upgrade.css";
import PwaInstallManager from "../components/PwaInstallManager";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F7F4EE"
};

export const metadata: Metadata = {
  metadataBase: new URL("https://his-and-her-mart.vercel.app"),
  title: { default: "His & Hers Mart | Modern Shopping · For Him & Her", template: "%s | His & Hers Mart" },
  applicationName: "His & Hers Mart",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "His & Hers Mart" },
  formatDetection: { telephone: false },
  description: "Shop thoughtfully selected fashion, beauty, shoes, accessories and everyday essentials at His & Hers Mart, Bangladesh.",
  openGraph: { title: "His & Hers Mart", description: "Modern Shopping · For Him & Her", url: "https://his-and-her-mart.vercel.app", siteName: "His & Hers Mart", locale: "en_BD", type: "website" },
  icons: {
    icon: [
      { url: "/app-icon-v3.svg?v=4", sizes: "any", type: "image/svg+xml" },
      { url: "/app-icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/app-icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/app-icons/icon-192.png", sizes: "192x192", type: "image/png" }]
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><PwaInstallManager />{children}</body></html>;
}
