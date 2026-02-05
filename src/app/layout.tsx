import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "BeratnyaCrown",
  description: "Pencatatan berat flyer flyer gendut q",
  icons: {
    icon: "/logo_flyer.png",
    shortcut: "/logo_flyer.png",
    apple: "/logo_flyer.png"
  },
  openGraph: {
    title: "BeratnyaCrown",
    description: "Pencatatan berat flyer flyer gendut q",
    type: "website",
    locale: "id_ID",
    url: "/",
    images: [
      {
        url: "/logo_flyer.png",
        alt: "BeratnyaCrown"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "BeratnyaCrown",
    description: "Pencatatan berat flyer flyer gendut q",
    images: ["/logo_flyer.png"]
  }
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
