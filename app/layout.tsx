import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./storefront-upgrade.css";
import "./miss-can-cake-redesign.css";
import PwaInstallManager from "../components/PwaInstallManager";
export const viewport: Viewport={width:"device-width",initialScale:1,themeColor:"#2c1c19"};
export const metadata: Metadata={
 title:{default:"Miss Can Cake | A Little Cup of Joy.",template:"%s | Miss Can Cake"},
 applicationName:"Miss Can Cake",
 description:"Miss Tiramisu: a small-batch 120ml chilled coffee dessert with four small Dry Cake pieces, made with care in Sylhet.",
 openGraph:{title:"Miss Can Cake",description:"A little cup of joy. Small-batch chilled desserts in Sylhet.",siteName:"Miss Can Cake",locale:"en_BD",type:"website"},
 icons:{icon:"/miss-can-cake-app-icon.svg"},robots:{index:true,follow:true}
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><PwaInstallManager/>{children}</body></html>}
