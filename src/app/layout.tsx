import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const siteUrl =
  process.env.NEXT_PUBLIC_BASE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const ogImageUrl = new URL("/crown-logo.jpg", siteUrl);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Crown Allstar Cheerleading",
  description: "Platform Manajemen Tim & Atlet Crown Allstar - Track Jadwal, Absensi, Progress Latihan, dan Informasi Tim secara Real-time.",
  icons: {
    icon: [{ url: "/crown-logo.jpg", type: "image/jpeg" }],
    shortcut: "/crown-logo.jpg",
    apple: "/crown-logo.jpg"
  },
  openGraph: {
    title: "Crown Allstar Cheerleading",
    description: "Platform Manajemen Tim & Atlet Crown Allstar - Track Jadwal, Absensi, Progress Latihan, dan Informasi Tim secara Real-time.",
    type: "website",
    locale: "id_ID",
    url: "/",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Crown Allstar"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Crown Allstar",
    description: "Platform Manajemen Tim & Atlet Crown Allstar - Track Jadwal, Absensi, Progress Latihan, dan Informasi Tim secara Real-time.",
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
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
