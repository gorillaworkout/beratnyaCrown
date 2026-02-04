import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BeratnyaCrown",
  description: "Pencatatan berat athlete untuk admin"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
