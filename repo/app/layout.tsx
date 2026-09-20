import type { Metadata } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import { WalletProvider } from "@/components/wallet";
import { Header, Footer } from "@/components/shell";
import "./globals.css";
const sans = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
export const metadata: Metadata = {
  title: "Banda | Your DeFi portfolio. Simpler to manage.",
  description:
    "A simpler way to own and manage a DeFi portfolio. Explore basket strategies, understand their costs and risks, and explore your portfolio in one place.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable}`}>
        <WalletProvider>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <Header />
          {children}
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
