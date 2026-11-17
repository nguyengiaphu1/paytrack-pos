import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PayTrack POS — Sổ bán hàng & Công nợ",
  description:
    "Ứng dụng bán hàng POS, sổ ghi nợ, nhắc thu tiền, VietQR động và hóa đơn điện tử đồng bộ cloud cho cửa hàng bán lẻ.",
  applicationName: "PayTrack POS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PayTrack POS",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0E6B4E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-dvh bg-[var(--bg-canvas)] text-[var(--text-primary)] antialiased selection:bg-[#CCFBF1] selection:text-[#0E6B4E]">
        {children}
      </body>
    </html>
  );
}
