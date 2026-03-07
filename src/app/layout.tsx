import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { ClientOnly } from "@/components/layout/client-only";
import { PriceTicker } from "@/components/layout/price-ticker";
import { WalletProvider } from "@/components/layout/wallet-provider";
import "@/styles/globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "MEMESCOPE — Solana Wallet Scanner & Scam Detector",
    template: "%s | MEMESCOPE",
  },
  description:
    "Research meme coins. Detect rugs. Track wallets. SOL-native intelligence for the degen era.",
  keywords: [
    "solana",
    "meme coin",
    "wallet scanner",
    "scam detector",
    "rug pull",
    "token research",
    "crypto",
  ],
  authors: [{ name: "MEMESCOPE" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "MEMESCOPE",
    title: "MEMESCOPE — Solana Wallet Scanner & Scam Detector",
    description: "Research meme coins. Detect rugs. Track wallets.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MEMESCOPE",
    description: "Solana Wallet Scanner & Scam Detector",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${outfit.variable} ${jetbrainsMono.variable} font-sans scanlines min-h-screen bg-bg-deep text-text-primary antialiased pb-10`}
      >
        <ClientOnly>
          <WalletProvider>
            {children}
            <PriceTicker />
          </WalletProvider>
        </ClientOnly>
      </body>
    </html>
  );
}
