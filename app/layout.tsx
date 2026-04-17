import { ConditionalShell } from "@/components/layout/ConditionalShell";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const FAVICON_SVG = "/logo.svg";
const APPLE_PNG = "/logo.png";

export const metadata: Metadata = {
  title: "SIAKAD 969",
  description: "Dashboard akademik & modul SPK — EWS, clustering, peminatan.",
  icons: {
    icon: [{ url: FAVICON_SVG, type: "image/svg+xml", sizes: "any" }],
    apple: [{ url: APPLE_PNG, type: "image/png", sizes: "180x180" }],
    shortcut: FAVICON_SVG,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen antialiased">
        <ConditionalShell>{children}</ConditionalShell>
      </body>
    </html>
  );
}
