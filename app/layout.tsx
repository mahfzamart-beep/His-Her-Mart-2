import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
 metadataBase: new URL("https://his-and-her-mart.vercel.app"),
 title: { default: "His & Her Mart | Modern Shopping · For Him & Her", template: "%s | His & Her Mart" },
 description: "Shop thoughtfully selected fashion, beauty, shoes, accessories and everyday essentials at His & Her Mart, Bangladesh.",
 openGraph: { title: "His & Her Mart", description: "Modern Shopping · For Him & Her", url: "https://his-and-her-mart.vercel.app", siteName: "His & Her Mart", locale: "en_BD", type: "website" },
 robots: { index: true, follow: true },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
 return <html lang="en"><body>{children}</body></html>;
}