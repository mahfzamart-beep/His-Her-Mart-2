import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="pwa-offline-page">
      <img src="/app-icon-v3.svg" alt="Cloud Momos" />
      <p className="eyebrow">CONNECTION PAUSED</p>
      <h1>You’re <em>offline.</em></h1>
      <p>Reconnect to the internet to browse the momo menu, check live availability, place an order or track your delivery.</p>
      <Link href="/">Try again</Link>
    </main>
  );
}
