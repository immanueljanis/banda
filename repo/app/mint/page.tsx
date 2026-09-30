import type { Metadata } from "next";
import { Rosette } from "@/components/guilloche";
import { MintPanel } from "@/components/mint-panel";

export const metadata: Metadata = {
  title: "Banda | Test USDG faucet",
  robots: { index: false, follow: false },
};

export default function Mint() {
  return (
    <main id="main">
      <section className="detail-note">
        <Rosette className="hero-rosette" />
        <div className="wrap detail-hero">
          <h1>Test USDG faucet.</h1>
          <p>Mint test USDG on Robinhood Chain testnet to try deposits and redemptions.</p>
        </div>
      </section>
      <div className="wrap mint">
        <MintPanel />
      </div>
    </main>
  );
}
