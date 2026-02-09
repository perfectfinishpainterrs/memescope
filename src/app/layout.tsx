import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "MEMESCOPE — Wallet Scanner + Scam Detector",
  description:
    "Scan wallets, detect scams, track holders, and research meme coins with X/Twitter sentiment analysis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="scanlines min-h-screen bg-bg-deep text-text-primary font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
