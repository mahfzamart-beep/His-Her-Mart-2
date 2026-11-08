import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="pwa-offline-page">
      <img src="/brand/his-and-hers-logo.png" alt="His & Hers Mart" />
      <p className="eyebrow">CONNECTION PAUSED</p>
      <h1>You’re <em>offline.</em></h1>
      <p>Reconnect to the internet to browse products, check live stock, place orders or track a parcel.</p>
      <Link href="/">Try again</Link>
    </main>
  );
}
