import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SMART BUILDING DIGITAL TWIN",
  description: "Real-time building simulation and control twin"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}