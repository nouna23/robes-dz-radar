import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "robes-dz-radar",
  description: "Suivi de la demande et du marché des robes algériennes en Europe",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <header className="border-b border-neutral-200 bg-white">
          <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-6 px-6 py-4">
            <span className="font-semibold">robes-dz-radar</span>
            <Link href="/" className="text-sm text-neutral-600 hover:text-neutral-900">
              Vue d&apos;ensemble
            </Link>
            <Link href="/signals" className="text-sm text-neutral-600 hover:text-neutral-900">
              Signaux
            </Link>
            <Link href="/problems" className="text-sm text-neutral-600 hover:text-neutral-900">
              Problèmes
            </Link>
            <Link href="/listings" className="text-sm text-neutral-600 hover:text-neutral-900">
              Annonces
            </Link>
            <Link href="/sellers" className="text-sm text-neutral-600 hover:text-neutral-900">
              Vendeurs
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
