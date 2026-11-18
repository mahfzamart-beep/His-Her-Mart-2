import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./storefront-upgrade.css";
import PwaInstallManager from "../components/PwaInstallManager";
export const viewport: Viewport={width:"device-width",initialScale:1,themeColor:"#173f30"};
export const metadata: Metadata={
 metadataBase:new URL("https://cloudmomos.vercel.app"),
 title:{default:"Cloud Momos | Little Clouds. Big Comfort.",template:"%s | Cloud Momos"},
 applicationName:"Cloud Momos",
 description:"Freshly cooked and frozen momos delivered in selected areas of Sylhet City.",
 openGraph:{title:"Cloud Momos",description:"Little clouds. Big comfort. Fresh momos in Sylhet.",siteName:"Cloud Momos",locale:"en_BD",type:"website"},
 icons:{icon:"/favicon.ico"},robots:{index:true,follow:true}
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><PwaInstallManager/>{children}</body></html>}
