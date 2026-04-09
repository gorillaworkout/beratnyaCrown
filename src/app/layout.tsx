import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const siteUrl =
  process.env.NEXT_PUBLIC_BASE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const ogImageUrl = new URL("/crown-logo.png", siteUrl);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Crown Allstar Cheerleading",
  description: "Platform Manajemen Tim & Atlet Crown Allstar - Track Jadwal, Absensi, Progress Latihan, dan Informasi Tim secara Real-time.",
  icons: {
    icon: [{ url: "/crown-logo.png", type: "image/png" }],
    shortcut: "/crown-logo.png",
    apple: "/crown-logo.png"
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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#D4AF37" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CrownHub" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('SW registered:', reg.scope))
                    .catch(err => console.log('SW registration failed:', err));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
