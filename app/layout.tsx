import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./storefront-upgrade.css";
import PwaInstallManager from "../components/PwaInstallManager";
export const viewport: Viewport={width:"device-width",initialScale:1,themeColor:"#173f30"};
export const metadata: Metadata={
 metadataBase:new URL("https://cloud-momos-two.vercel.app"),
 title:{default:"Miss Can Cake | A Little Cup of Joy.",template:"%s | Miss Can Cake"},
 applicationName:"Miss Can Cake",
 description:"Chilled desserts made with care and delivered in selected areas of Sylhet City.",
 openGraph:{title:"Miss Can Cake",description:"A little cup of joy. Chilled desserts in Sylhet.",siteName:"Miss Can Cake",locale:"en_BD",type:"website"},
 icons:{icon:"/miss-can-cake-app-icon.svg"},robots:{index:true,follow:true}
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><PwaInstallManager/>{children}</body></html>}
