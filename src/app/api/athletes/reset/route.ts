import { NextResponse } from "next/server";
import { collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";

/**
 * Reset sesi latihan: hapus permanen seluruh riwayat log berat (subcollection
 * `weights`) untuk semua athlete. Data athlete, currentWeight, dan goalWeight
 * dipertahankan sebagai titik awal sesi baru; previousWeight dikosongkan agar
 * kolom perbandingan mulai dari nol lagi.
 *
 * Destruktif dan tidak bisa dibatalkan. Client wajib mengirim confirm: "RESET".
 *
 * ponytail: delete berurutan pakai client SDK — mengikuti pola route lain di
 * repo ini. Cukup untuk skala tim (puluhan athlete). Kalau nanti ribuan doc,
 * naikkan ke firebase-admin writeBatch (500 doc per batch).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { confirm?: string };
  if (body.confirm !== "RESET") {
    return NextResponse.json(
      { ok: false, message: "Konfirmasi tidak valid." },
      { status: 400 }
    );
  }

  const athletesSnap = await getDocs(collection(db, "athletes"));
  let deletedLogs = 0;

  for (const athleteDoc of athletesSnap.docs) {
    const logsSnap = await getDocs(collection(db, "athletes", athleteDoc.id, "weights"));
    for (const logDoc of logsSnap.docs) {
      await deleteDoc(doc(db, "athletes", athleteDoc.id, "weights", logDoc.id));
      deletedLogs += 1;
    }
    await updateDoc(doc(db, "athletes", athleteDoc.id), { previousWeight: null });
  }

  return NextResponse.json({
    ok: true,
    athletes: athletesSnap.size,
    deletedLogs
  });
}
