import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "His & Hers Mart | Modern Shopping · For Him & Her",
  description: "Discover everyday style and essentials at His & Hers Mart.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
