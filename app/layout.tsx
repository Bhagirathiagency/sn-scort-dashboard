import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PV+ | Intelligent Pharmacovigilance & Drug Safety Platform",
  description: "From Safety Data to Safety Intelligence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
