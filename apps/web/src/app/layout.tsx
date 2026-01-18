import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "RustRanked - Competitive Rust Gaming",
  description:
    "The premier competitive platform for Rust. Verified players, ranked matches, and fair play.",
  keywords: ["Rust", "competitive", "ranked", "FACEIT", "gaming", "esports"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-dark-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
