import type { Metadata } from "next";
import { Rosette } from "@/components/guilloche";
import { MintPanel } from "@/components/mint-panel";

export const metadata: Metadata = {
  title: "Banda | Get test USDG",
  robots: { index: false, follow: false },
};

export default function Mint() {
  return (
    <main id="main">
      <section className="detail-note">
        <Rosette className="hero-rosette" />
        <div className="wrap detail-hero">
          <h1>Get test USDG.</h1>
          <p>Get free test USDG to try buying and withdrawing. It is test money with no real value.</p>
        </div>
      </section>
      <div className="wrap mint">
        <MintPanel />
      </div>
    </main>
  );
}
