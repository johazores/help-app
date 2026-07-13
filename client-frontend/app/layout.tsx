import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Mulish } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Mulish({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sagip — money set aside for the people you love",
  description:
    "Set money aside for your family. As long as you check in, it stays yours. If you ever can't, your family can receive it.",
};

export const viewport: Viewport = {
  themeColor: "#0c3b3a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
