import type { CSSProperties } from "react";

const TAU = Math.PI * 2;
const round = (n: number) => Math.round(n * 100) / 100;

function closedPath(points: [number, number][]) {
  return `M${points.map(([x, y]) => `${round(x)} ${round(y)}`).join("L")}Z`;
}

/** Interwoven rosette curves, the engraved centrepiece of security-printed notes. */
function rosettePaths(lines: number, petals: number, inner: number, outer: number) {
  const mid = (inner + outer) / 2;
  const amp = (outer - inner) / 2;
  return Array.from({ length: lines }, (_, line) => {
    const phase = (line / lines) * TAU;
    const points: [number, number][] = [];
    for (let step = 0; step < 360; step++) {
      const t = (step / 360) * TAU;
      const radius = mid + amp * Math.sin(petals * t + phase / petals) * 0.7 + amp * 0.3 * Math.cos((petals + 1) * t - phase);
      points.push([100 + radius * Math.cos(t), 100 + radius * Math.sin(t)]);
    }
    return closedPath(points);
  });
}

const ROSETTE = rosettePaths(40, 14, 58, 97);
const CORE = rosettePaths(28, 9, 20, 50);

/** Wave band used as a certificate border; lines are phase-shifted sine strands. */
function wavePaths(strands: number) {
  return Array.from({ length: strands }, (_, strand) => {
    const phase = (strand / strands) * Math.PI;
    const points: string[] = [];
    for (let x = 0; x <= 400; x += 2) {
      const y = 12 + 9 * Math.sin((x / 400) * TAU * 6 + phase) * Math.cos((x / 400) * TAU + phase * 2);
      points.push(`${x} ${round(y)}`);
    }
    return `M${points.join("L")}`;
  });
}

const WAVES = wavePaths(9);

export function Rosette({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 200 200" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="0.6" vectorEffect="non-scaling-stroke">
        {ROSETTE.map((d, index) => <path key={index} d={d} />)}
      </g>
      <g stroke="currentColor" strokeWidth="0.5" vectorEffect="non-scaling-stroke" opacity="0.8">
        {CORE.map((d, index) => <path key={index} d={d} />)}
      </g>
    </svg>
  );
}

export function WaveBand({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 24" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="0.5" vectorEffect="non-scaling-stroke">
        {WAVES.map((d, index) => <path key={index} d={d} />)}
      </g>
    </svg>
  );
}

/** Repeated microprint line; decorative, so hidden from assistive technology. */
export function Microtext({ text, className }: { text: string; className?: string }) {
  return (
    <div className={`microtext ${className ?? ""}`} aria-hidden="true">
      {`${text} · `.repeat(24)}
    </div>
  );
}
