import type { Metadata } from "next";
import "./globals.css";
import "../../../../design-system.css";

export const metadata: Metadata = {
  title: "Kynovia Condo Admin",
  description: "Kynovia Access administration console"
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
