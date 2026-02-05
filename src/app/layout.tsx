import type { Metadata } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_BASE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const ogImageUrl = new URL("/logo_flyer.png", siteUrl);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "BeratnyaCrown",
  description: "Pencatatan berat flyer flyer gendut q",
  icons: {
    icon: [{ url: "/logo_flyer.png", type: "image/png" }],
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
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "BeratnyaCrown"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "BeratnyaCrown",
    description: "Pencatatan berat flyer flyer gendut q",
    images: [ogImageUrl.toString()]
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
