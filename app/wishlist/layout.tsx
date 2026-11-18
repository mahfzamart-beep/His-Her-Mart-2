import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cloud Momos Menu",
  robots: { index: false, follow: false },
};

export default function WishlistLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
