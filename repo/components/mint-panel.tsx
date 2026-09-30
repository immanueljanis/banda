"use client";
import { useWallet } from "./wallet";
import { WaveBand } from "./guilloche";
import { ROBINHOOD_TESTNET } from "@/lib/chain/config";

export function MintPanel() {
  const wallet = useWallet();
  return (
    <div className="buy-panel mint-panel">
      <WaveBand className="terms-wave" />
      <span className="certificate-kind">Testnet faucet</span>
      <h2>Get test USDG</h2>
      <p>
        Banda settles in Paxos’ official USDG on Robinhood Chain testnet. The Paxos faucet sends 100 USDG
        per wallet each day, enough for several Basket deposits.
      </p>
      <ol className="mint-steps">
        <li>Copy your wallet address{wallet.address ? <>: <span className="mono">{wallet.address}</span></> : " after connecting."}</li>
        <li>Choose Robinhood Chain Testnet on the Paxos faucet and request USDG.</li>
        <li>Add a little testnet ETH for gas from the Robinhood faucet if you need it.</li>
      </ol>
      <p>
        {wallet.connected ? (
          <>Wallet balance: <span className="mono">{wallet.balanceLabel} USDG</span></>
        ) : (
          <button type="button" className="text-link" onClick={wallet.connect}>Connect wallet</button>
        )}
      </p>
      <a className="primary-button" href={ROBINHOOD_TESTNET.usdgFaucet} target="_blank" rel="noreferrer">
        Open Paxos USDG faucet <span aria-hidden="true">↗</span>
      </a>
      <a className="text-link mint-secondary" href="https://faucet.testnet.chain.robinhood.com/" target="_blank" rel="noreferrer">
        Get testnet ETH <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
