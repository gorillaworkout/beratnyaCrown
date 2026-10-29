import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

/**
 * Catat login anggota. Identitas diambil dari token Firebase, bukan dari body,
 * supaya orang lain tidak bisa menulis catatan atas nama anggota.
 *
 * Lokasi sengaja dibatasi level KOTA dari alamat IP — bukan alamat presisi.
 * Koordinat GPS hanya disimpan bila anggota menekan tombol izin secara sadar.
 * IP mentah tidak disimpan, hanya hasil pembacaan kotanya.
 */
type Body = {
  coords?: { lat: number; lng: number; accuracy?: number } | null;
};

function readCity(request: Request): string {
  const h = request.headers;
  const city = h.get("x-vercel-ip-city");
  const country = h.get("x-vercel-ip-country");
  if (!city && !country) return "";
  return [city ? decodeURIComponent(city) : "", country ?? ""].filter(Boolean).join(", ");
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer (.+)$/);
  if (!match) {
    return NextResponse.json({ ok: false, message: "Silakan login kembali." }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(match[1], true);
  } catch {
    return NextResponse.json({ ok: false, message: "Silakan login kembali." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
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
    uid: decoded.uid,
    email: decoded.email ?? "",
    name: decoded.name ?? "",
    city: readCity(request),
    coords,
    userAgent: (request.headers.get("user-agent") ?? "").slice(0, 200),
    loginAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
