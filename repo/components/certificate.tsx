"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { animate, motion } from "motion/react";
import { type Basket, money } from "@/constants/baskets";
import { AssetLabel, AssetLogo } from "./asset-label";
import { Microtext, Rosette, WaveBand } from "./guilloche";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
// ponytail: motion's useReducedMotion snapshots the preference once and never
// re-renders when it flips; useSyncExternalStore on matchMedia does.
function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(REDUCE_QUERY);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false,
  );
}
export function NavNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const animation = animate(0, value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (n) => {
        if (ref.current) ref.current.textContent = money(n);
      },
    });
    return () => animation.stop();
  }, [value, reduced]);
  return (
    <span ref={ref} className="mono">
      {money(value)}
    </span>
  );
}
export function Sparkline({ basket }: { basket: Basket }) {
  const values = basket.history.map((x) => x.value);
  const min = Math.min(...values),
    max = Math.max(...values);
  return (
    <svg
      className="sparkline"
      viewBox="0 0 250 65"
      role="img"
      aria-label={`Hypothetical $10,000 Basket, ${basket.change.toFixed(2)}% over thirty days on real prices`}
    >
      <path className="spark-baseline" d="M0 60H250" />
      <polyline
        pathLength="1"
        points={values
          .map(
            (v, i) =>
              `${(i * 250) / (values.length - 1)},${max === min ? 33 : 57 - ((v - min) / (max - min)) * 48}`,
          )
          .join(" ")}
      />
    </svg>
  );
}
export function Allocation({ basket }: { basket: Basket }) {
  return (
    <>
      <div className="allocation" aria-label="Asset allocation">
        {basket.allocation.map((allocation, i) => (
          <span
            key={allocation.label}
            className={`category-${i}`}
            style={{ flexBasis: `${allocation.weight}%` }}
          />
        ))}
      </div>
      <div className="allocation-legend">
        {basket.allocation.map((allocation, i) => (
          <div key={allocation.label}>
            <span>
              <i className={`category-${i}`} />
              {allocation.label}
            </span>
            <b className="mono">{allocation.weight}%</b>
          </div>
        ))}
      </div>
    </>
  );
}
export function Certificate({
  basket,
  hero = false,
}: {
  basket: Basket;
  hero?: boolean;
}) {
  const reduced = useReducedMotion();
  const [intro, setIntro] = useState(false);
  useEffect(() => {
    if (!hero || reduced) return;
    setIntro(true);
    const timer = setTimeout(() => setIntro(false), 3200);
    return () => clearTimeout(timer);
  }, [hero, reduced]);
  return (
    <div className={`certificate ${hero ? "hero-certificate" : ""}`}>
      <WaveBand className="certificate-wave" />
      <div className="certificate-top">
        <span className="certificate-kind">Basket certificate</span>
        <span className="example-tag">Illustrative</span>
      </div>
      <div className="certificate-title">
        <h3>{basket.name}</h3>
        <span className="certificate-serial mono">No. {basket.id}</span>
      </div>
      <p className="certificate-thesis">{basket.thesis} · {basket.character}</p>
      {hero && (
        <PortfolioAssembly basket={basket} animateIntro={intro && !reduced} />
      )}
      <div className="certificate-value">
        <Rosette className="certificate-rosette" />
        <span className="eyebrow">Hypothetical $10,000 Basket</span>
        <strong>
          <NavNumber value={basket.nav} />
        </strong>
        <div className="performance">
          <span className={`${basket.change >= 0 ? "positive" : "negative"} mono`}>
            {basket.change >= 0 ? "↗ +" : "↘ "}
            {basket.change.toFixed(2)}%
          </span>
          <span className="muted">
            <span className="mono">30</span>d, real prices
          </span>
        </div>
      </div>
      {!hero && <Sparkline basket={basket} />}
      <div className="certificate-allocation">
        <span className="eyebrow">One basket. Multiple asset classes.</span>
        <Allocation basket={basket} />
      </div>
      {!hero && (
        <div className="certificate-footer certificate-assets">
          {basket.holdings.map((h) => (
            <AssetLabel key={h.ticker} ticker={h.ticker} compact />
          ))}
        </div>
      )}
      <Microtext text={`BANDA ${basket.name} ONE TOKEN WHOLE PORTFOLIO`} />
      <WaveBand className="certificate-wave" />
    </div>
  );
}

function PortfolioAssembly({
  basket,
  animateIntro,
}: {
  basket: Basket;
  animateIntro: boolean;
}) {
  const reduced = useReducedMotion();
  const [replay, setReplay] = useState(0);
  const moving = !reduced && (animateIntro || replay > 0);
  const positions = basket.holdings.map((_, index) => {
    const angle = (Math.PI * 2 * index) / basket.holdings.length - Math.PI / 2;
    return [Math.cos(angle) * 92, Math.sin(angle) * 50];
  });
  return (
    <div className="portfolio-assembly">
      <div
        className="assembly-scene"
        aria-hidden="true"
        key={`${animateIntro}-${replay}`}
      >
        <svg className="assembly-paths" viewBox="0 0 260 150" fill="none">
          <ellipse
            cx="130"
            cy="75"
            rx="100"
            ry="55"
            stroke="var(--rule)"
            strokeDasharray="2 6"
          />
          {basket.holdings.map((h, i) => (
            <motion.path
              key={h.ticker}
              d={`M${130 + positions[i][0]} ${75 + positions[i][1]} Q130 ${75 + positions[i][1]} 130 75`}
              stroke="var(--accent)"
              strokeWidth="1"
              initial={moving ? { pathLength: 0, opacity: 0 } : false}
              animate={{ pathLength: 1, opacity: 0.35 }}
              transition={{ delay: 0.7 + i * 0.12, duration: 0.9 }}
            />
          ))}
        </svg>
        <motion.div
          className="assembly-hub"
          initial={moving ? { scale: 0.8, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <img src="/icon.svg" width="22" height="22" alt="" />
          <span>One basket</span>
        </motion.div>
        {basket.holdings.map((h, i) => (
          <motion.div
            className="assembly-asset"
            key={h.ticker}
            style={{
              left: `calc(50% + ${positions[i][0]}px)`,
              top: `calc(50% + ${positions[i][1]}px)`,
            }}
            initial={
              moving
                ? {
                    x: positions[i][0] * 0.22,
                    y: -18,
                    opacity: 0,
                    scale: 0.7,
                    rotate: i % 2 ? -12 : 12,
                  }
                : false
            }
            animate={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
            transition={{
              delay: 0.15 + i * 0.14,
              type: "spring",
              stiffness: 120,
              damping: 17,
            }}
          >
            <AssetLogo ticker={h.ticker} />
            <span className="mono">{h.weight}%</span>
          </motion.div>
        ))}
      </div>
      {!reduced && (
        <button
          className="assembly-replay"
          type="button"
          onClick={() => setReplay((n) => n + 1)}
          aria-label="Replay portfolio animation"
        >
          ↻
        </button>
      )}
    </div>
  );
}
