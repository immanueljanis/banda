import type { Metadata } from "next";
import { PitchDeck } from "@/components/pitch-deck";
import "./pitch.css";

export const metadata: Metadata = {
  title: "Banda | Pitch",
  description: "Composable ETFs on Robinhood Chain. One token, every asset inside.",
};

export default function PitchPage() {
  return <PitchDeck />;
}
