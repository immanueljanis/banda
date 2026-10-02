import type { Metadata } from "next";
import { Rosette } from "@/components/guilloche";
import { MintPanel } from "@/components/mint-panel";

export const metadata: Metadata = {
  title: "Banda | Get testnet USDG",
  robots: { index: false, follow: false },
};

export default function Mint() {
  return (
    <main id="main">
      <section className="detail-note">
        <Rosette className="hero-rosette" />
        <div className="wrap detail-hero">
          <h1>Get testnet USDG.</h1>
          <p>Banda uses Paxos’ official USDG on the Robinhood Chain test network. Get free testnet USDG to try buying and withdrawing. It has no real value.</p>
        </div>
      </section>
      <div className="wrap mint">
        <MintPanel />
      </div>
    </main>
  );
}
