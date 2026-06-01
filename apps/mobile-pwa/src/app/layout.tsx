import type { Metadata, Viewport } from "next";
import "./globals.css";
import "../../../../design-system.css";

export const metadata: Metadata = {
  title: "Kynovia Mobile",
  description: "Kynovia Access mobile PWA",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#635bff"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
