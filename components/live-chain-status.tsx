"use client";

import { useEffect, useState } from "react";

type Snapshot = {
  blockNumber: string;
  paused: boolean;
  navMaxAgeSeconds: number;
  navMaxBlockLag: number;
  fetchedAt: string;
};

export function LiveChainStatus() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/chain/status", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("RPC unavailable");
        return (await response.json()) as Snapshot;
      })
      .then((value) => { if (!cancelled) setSnapshot(value); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return <p className="chain-status muted">Live status is unavailable right now.</p>;
  }
  if (!snapshot) {
    return <p className="chain-status muted" aria-live="polite">Checking live status…</p>;
  }
  return (
    <div className="chain-status" aria-label="Live Banda status">
      <span className={`status-dot ${snapshot.paused ? "status-dot-paused" : "status-dot-live"}`} aria-hidden="true" />
      <span>{snapshot.paused ? "Deposits are paused right now. You can still withdraw." : "Deposits open"}</span>
      <span className="muted">Block {snapshot.blockNumber}</span>
      <span className="muted">Prices must be under {Math.round(snapshot.navMaxAgeSeconds / 60)} min old</span>
    </div>
  );
}

