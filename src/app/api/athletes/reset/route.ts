import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";

/**
 * Reset sesi latihan: hapus permanen seluruh riwayat log berat (subcollection
 * `weights`) untuk semua athlete. Data athlete, currentWeight, dan goalWeight
 * dipertahankan sebagai titik awal sesi baru; previousWeight dikosongkan agar
 * kolom perbandingan mulai dari nol lagi.
 *
 * Destruktif dan tidak bisa dibatalkan. Client wajib mengirim confirm: "RESET".
 *
 * Memakai Admin SDK: route ini berjalan tanpa sesi login pengguna, jadi harus
 * melewati Firestore rules yang menutup akses tulis dari klien.
 *
 * ponytail: delete berurutan, cukup untuk skala tim (puluhan athlete).
 * Kalau nanti ribuan doc, naikkan ke writeBatch (500 doc per batch).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { confirm?: string };
  if (body.confirm !== "RESET") {
    return NextResponse.json(
      { ok: false, message: "Konfirmasi tidak valid." },
      { status: 400 }
    );
  }

  const athletesSnap = await adminDb.collection("athletes").get();
  let deletedLogs = 0;

  for (const athleteDoc of athletesSnap.docs) {
    const logsSnap = await athleteDoc.ref.collection("weights").get();
    for (const logDoc of logsSnap.docs) {
      await logDoc.ref.delete();
      deletedLogs += 1;
    }
    await athleteDoc.ref.update({ previousWeight: null });
  }

  return NextResponse.json({
    ok: true,
    athletes: athletesSnap.size,
    deletedLogs
  });
}
