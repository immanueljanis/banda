"use client";
import { useWallet } from "./wallet";
import { WaveBand } from "./guilloche";
import { ROBINHOOD_TESTNET } from "@/lib/chain/config";

export function MintPanel() {
  const wallet = useWallet();
  return (
    <div className="buy-panel mint-panel">
      <WaveBand className="terms-wave" />
      <span className="certificate-kind">Free testnet USDG</span>
      <h2>Get USDG to try Banda</h2>
      <p>The Paxos faucet sends 100 testnet USDG per wallet each day, enough for several Baskets. It has no real value.</p>
      <ol className="mint-steps">
        <li>Copy your wallet address{wallet.address ? <>: <span className="mono">{wallet.address}</span></> : " after you connect."}</li>
        <li>On the Paxos faucet, choose Robinhood Chain Testnet and request USDG.</li>
        <li>If your wallet has no ETH for network fees, get a little from the Robinhood faucet.</li>
      </ol>
      <p>
        {wallet.connected ? (
          <>Your balance: <span className="mono">{wallet.balanceLabel} USDG</span></>
        ) : (
          <button type="button" className="text-link" onClick={wallet.connect}>Connect wallet</button>
        )}
      </p>
      <a className="primary-button" href={ROBINHOOD_TESTNET.usdgFaucet} target="_blank" rel="noreferrer">
        Open the Paxos USDG faucet <span aria-hidden="true">↗</span>
      </a>
      <a className="text-link mint-secondary" href="https://faucet.testnet.chain.robinhood.com/" target="_blank" rel="noreferrer">
        Get testnet ETH for fees <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
