import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: "Cloud Momos Kitchen | Admin",
  description: "Manage Cloud Momos orders, kitchen stock, menu items, Sylhet delivery and customer care.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
