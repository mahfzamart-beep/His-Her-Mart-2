import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "His & Her Mart | Modern Shopping · For Him & Her",
  description: "Discover everyday style and essentials at His & Her Mart.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
