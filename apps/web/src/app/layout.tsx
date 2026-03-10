import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Footer } from "@/components/footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "RustRanked - Competitive Rust Gaming",
  description:
    "The premier Rust server platform. Verified players, active moderation, and fair play.",
  keywords: ["Rust", "competitive", "verified", "anti-cheat", "moderated", "gaming"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-dark-950">
        <Providers>
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
