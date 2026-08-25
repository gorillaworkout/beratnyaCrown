import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

// Admin SDK: catatan login ditulis server-side, dan koleksi crown-logins
// tertutup untuk klien lewat Firestore rules.
import { adminDb } from "@/lib/firebase-admin";

/**
 * Catat login anggota. Dipanggil dari auth-context setiap kali sesi Firebase
 * terbentuk (login baru maupun tab dibuka ulang).
 *
 * Lokasi sengaja dibatasi level KOTA dari alamat IP — bukan alamat presisi.
 * Tim ini punya anggota di bawah umur, jadi koordinat GPS hanya disimpan bila
 * anggota menekan tombol izin secara sadar (dikirim lewat body `coords`).
 *
 * IP mentah tidak disimpan, hanya hasil pembacaan kotanya.
 */
type Body = {
  uid?: string;
  email?: string;
  name?: string;
  coords?: { lat: number; lng: number; accuracy?: number } | null;
};

// Header kota dari CDN. Vercel mengisi ini otomatis, tanpa panggilan API.
function readCity(request: Request): string {
  const h = request.headers;
  const city = h.get("x-vercel-ip-city");
  const country = h.get("x-vercel-ip-country");
  if (!city && !country) return "";
  return [city ? decodeURIComponent(city) : "", country ?? ""].filter(Boolean).join(", ");
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  if (!body.uid) {
    return NextResponse.json({ ok: false, message: "uid wajib." }, { status: 400 });
  }

  const coords =
    body.coords &&
    Number.isFinite(body.coords.lat) &&
    Number.isFinite(body.coords.lng)
      ? {
          lat: Number(body.coords.lat),
          lng: Number(body.coords.lng),
          accuracy: Number.isFinite(body.coords.accuracy) ? Number(body.coords.accuracy) : null,
        }
      : null;

  await adminDb.collection("crown-logins").add({
    uid: body.uid,
    email: body.email ?? "",
    name: body.name ?? "",
    city: readCity(request),
    // Diisi hanya kalau anggota menyetujui GPS lewat tombol di dashboard.
    coords,
    userAgent: (request.headers.get("user-agent") ?? "").slice(0, 200),
    loginAt: FieldValue.serverTimestamp()
  });

  return NextResponse.json({ ok: true });
}
