import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { SITE_URL } from "@/lib/utils";
import "./globals.css";

// Self-hosted variable Montserrat (no third-party font requests, works offline, CSP-friendly).
const montserrat = localFont({
  src: [
    { path: "../fonts/montserrat-latin-wght-normal.woff2", style: "normal" },
    { path: "../fonts/montserrat-latin-ext-wght-normal.woff2", style: "normal" },
  ],
  variable: "--font-montserrat",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "KOL Wire Mesh MFG Ltd — Wire mesh, nails & hardware made in Ghana", template: "%s · KOL Wire Mesh" },
  description:
    "Manufacturer of galvanised and PVC-coated wire mesh, fencing, nails and building hardware in Ghana since 2010. Request a quote for your project.",
  openGraph: { type: "website", siteName: "KOL Wire Mesh MFG Ltd", locale: "en_GH" },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = { themeColor: "#196ba3", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="font-sans min-h-dvh flex flex-col">
        {children}
        <Toaster position="top-center" toastOptions={{ className: "font-sans", style: { fontFamily: "var(--font-montserrat)" } }} richColors closeButton />
      </body>
    </html>
  );
}
