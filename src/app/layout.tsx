import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mogul — Investor assistant",
  description: "A clear, secure view of your real-estate portfolio, property documents, and account activity.",
  applicationName: "Mogul",
};

export const viewport: Viewport = {
  themeColor: "#f5f5f1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
