import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { bearerMatches } from "@/lib/cron-auth";
import { athleteJoinDate, chunkList, jakartaDateString, KAS_START, KAS_SYNC_BATCH } from "@/lib/jakarta-date";
import { addIsoDays, listTrainingSessions, type StoredSchedule } from "@/lib/team-schedule";
import { athletesForSession, hasSessionForAthlete, nextUnpaidTrainingDates } from "@/lib/kas-city";
import { excusedNamesByDate, isExcusedOn } from "@/lib/kas-payment";

// Dynamic import to avoid build issues
let adminDb: any = null;
async function getAdminDb() {
  if (!adminDb) {
    const { adminDb: db } = await import("@/lib/firebase-admin");
    adminDb = db;
  }
  return adminDb;
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // 5 min timeout for backfill

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("Kas sync: CRON_SECRET is not set.");
    return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 500 });
  }
  if (!bearerMatches(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Firebase admin not available" }, { status: 500 });
    }

    // 1. Past training dates from crown-schedules (status=latihan/tambahan).
    //    Only dates that have already ended in Asia/Jakarta are billed.
    //    Existing kas rows are never rewritten.
    // Fetch all + filter in memory — avoids needing a composite index (status+date)
    const today = jakartaDateString();
    const yesterday = addIsoDays(today, -1);
    const schedSnap = await db.collection("crown-schedules").get();
    const stored: StoredSchedule[] = schedSnap.docs.map((d: { id: string; data: () => StoredSchedule }) => ({
      ...d.data(),
      id: d.id,
    }));
    // Sesi dipertahankan beserta kotanya: satu tanggal bisa punya dua sesi
    // (mis. Bandung + Jakarta di hari yang sama), dan tiap sesi hanya menagih
    // atlet kotanya sendiri. Sesi Gabungan menagih semua kota.
    const sessions = listTrainingSessions(stored, KAS_START, yesterday);
    const dates = [...new Set(sessions.map((session) => session.date))].sort();

    // 2. Non-exempt athletes (tanggal join diterapkan pada langkah 4).
    //    Atlet vakum juga dilewati — tidak ditagih kas selama vakum.
    const athSnap = await db.collection("crown-athletes").get();
    type SyncAthlete = {
      id: string;
      city?: string | null;
      name: string;
      division?: string | null;
      divisions?: string[];
      createTime: any;
    };
    const athletes: SyncAthlete[] = athSnap.docs
      .map((d: any) => ({ id: d.id, createTime: d.createTime, ...d.data() }))
      .filter((a: any) => !a.kasExempt && !a.vakum);

    // Kas hanya berjalan sejak athlete join: tanggal join = createTime dokumen
    // (fallback: field createdAt), dalam zona Asia/Jakarta. Tanpa sinyal tanggal,
    // pakai KAS_START seperti sebelumnya.
    const joinDateByAthlete = new Map(athletes.map((a: any) => [a.id, athleteJoinDate(a)]));

    // Bundel A: izin jadwal diteruskan ke kas — atlet yang izin pada suatu
    // tanggal tidak dibuatkan baris Alpa Rp26.000, melainkan Kas Rp13.000.
    // crown-absences: satu dokumen per tanggal, berisi daftar nama yang izin.
    const absSnap = await db.collection("crown-absences").get();
    const excusedByDate = excusedNamesByDate(
      absSnap.docs.map((d: any) => ({
        date: (d.data().date as string | undefined) ?? d.id,
        absences: (d.data().absences ?? []) as { name: string }[],
      })),
    );

    // 3. Existing kas records for these dates
    const kasSnap = await db.collection("crown-kas-daily").get();
    const existing = new Set<string>();
    kasSnap.docs.forEach((d: any) => {
      const data = d.data();
      if (data.date && data.athleteId) {
        existing.add(`${data.date}|${data.athleteId}`);
      }
    });

    // 4. Create missing records (alpa: Rp 26.000; izin: Kas Rp 13.000,
    //    Bundel A) for sessions on/after each athlete's join date.
    //    Never update an existing row.
    const recordsRef = db.collection("crown-kas-daily");
    const pending: Array<{ ref: ReturnType<typeof recordsRef.doc>; data: Record<string, unknown> }> = [];

    // Satu tanggal bisa muncul di dua sesi (mis. Bandung + Jakarta); planned
    // mencegah atlet yang sama dibuatkan dua baris untuk tanggal itu.
    const planned = new Set<string>();
    for (const session of sessions) {
      const date = session.date;
      for (const athlete of athletesForSession(session.city, athletes)) {
        // Lewati sesi sebelum athlete join — kas masuk dari latihan pertama sejak join.
        if (date < (joinDateByAthlete.get(athlete.id) ?? KAS_START)) continue;
        const key = `${date}|${athlete.id}`;
        if (existing.has(key) || planned.has(key)) continue;
        planned.add(key);

        // Izin (Bundel A): atlet yang izin tetap bayar kas Rp13.000, tanpa
        // denda Alpa Rp26.000 — sama seperti status "hadir" di Kas Harian.
        const excused = isExcusedOn(date, athlete.name, excusedByDate);
        pending.push({
          ref: recordsRef.doc(),
          data: {
            date,
            athleteId: athlete.id,
            name: athlete.name,
            division: Array.isArray(athlete.divisions) ? athlete.divisions.join(", ") : athlete.division || "",
            paidKas: true,
            isLate: false,
            noNews: !excused,
            isExcused: false,
            isExcusedWork: false,
            isExcusedOther: false,
            totalBilled: excused ? 13000 : 26000,
            isSettled: false,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
        });
      }
    }

    for (const group of chunkList(pending, KAS_SYNC_BATCH)) {
      const batch = db.batch();
      for (const item of group) batch.set(item.ref, item.data);
      await batch.commit();
    }
    const count = pending.length;

    // 5. Bersihkan tagihan tanggal yang belakangan diubah jadi libur.
    //    Kas-sync selama ini hanya membuat baris, tidak pernah menghapus —
    //    jadi kalau jadwal diubah jadi libur SETELAH sync membuat baris
    //    alpa, tagihannya tetap menempel. Hapus hanya baris default-alpa
    //    yang belum disentuh admin (belum lunas, belum dibayar sebagian,
    //    masih Rp26.000 apa adanya). Baris yang sudah lunas, sudah dibayar
    //    sebagian, atau sudah diubah manual tidak disentuh.
    const cityByAthlete = new Map<string, string>(
      athSnap.docs.map((d: any) => [d.id, ((d.data().city as string | undefined) ?? "").trim()]),
    );
    const toDelete: Array<{ ref: ReturnType<typeof recordsRef.doc> }> = [];
    for (const d of kasSnap.docs) {
      const data = d.data();
      if (!data.date || !data.athleteId) continue;
      if (data.date < KAS_START || data.date > yesterday) continue;
      if (data.isSettled || (data.paidAmount ?? 0) > 0) continue;
      if (
        data.totalBilled !== 26000 ||
        data.paidKas !== true ||
        data.isLate !== false ||
        data.noNews !== true ||
        data.isExcused !== false ||
        data.isExcusedWork !== false ||
        data.isExcusedOther !== false
      ) continue;
      const athleteCity = cityByAthlete.get(data.athleteId);
      if (athleteCity === undefined) continue; // atlet sudah dihapus: jangan sentuh
      if (hasSessionForAthlete(sessions, data.date, athleteCity)) continue;
      toDelete.push({ ref: d.ref });
    }
    for (const group of chunkList(toDelete, KAS_SYNC_BATCH)) {
      const batch = db.batch();
      for (const item of group) batch.delete(item.ref);
      await batch.commit();
    }
    const deletedCount = toDelete.length;

    // 6. Rollover bayar di muka: tanggal yang sudah dibayar lalu jadi libur.
    //    Atlet membeli N sesi latihan, bukan N tanggal — jadi pembayaran yang
    //    menempel di tanggal tanpa sesi dipindah ke latihan berikutnya untuk
    //    kota atlet itu (satu baris lunas Rp13.000 per sesi). Hanya baris
    //    lunas Rp13.000/Rp26.000 yang rapi (bayar di muka); pembayaran
    //    sebagian atau nominal lain dibiarkan untuk ditangani manual.
    //    Kalau tidak ada tanggal latihan berikutnya dalam jendela 120 hari,
    //    baris dibiarkan utuh (tidak dihapus). Hapus + buat digabung dalam
    //    satu batch per kelompok, supaya tidak ada pembayaran yang ganda
    //    atau hilang di tengah jalan (maks 150 pindah per batch: 2 buat +
    //    1 hapus = 450 operasi, di bawah batas 500 Firestore).
    const futureSessions = listTrainingSessions(stored, today, addIsoDays(today, 120));
    const athleteById = new Map(athletes.map((a) => [a.id, a]));
    const datesByAthlete = new Map<string, Set<string>>();
    for (const d of kasSnap.docs) {
      const data = d.data();
      if (!data.date || !data.athleteId) continue;
      let dates = datesByAthlete.get(data.athleteId);
      if (!dates) {
        dates = new Set<string>();
        datesByAthlete.set(data.athleteId, dates);
      }
      dates.add(data.date);
    }
    const moves: Array<{
      deleteRef: ReturnType<typeof recordsRef.doc>;
      creates: Array<{ ref: ReturnType<typeof recordsRef.doc>; data: Record<string, unknown> }>;
    }> = [];
    for (const d of kasSnap.docs) {
      const data = d.data();
      if (!data.date || !data.athleteId) continue;
      if (data.date < KAS_START || data.date > yesterday) continue;
      if (data.isSettled !== true || data.paidKas !== true) continue;
      if (data.paidAmount !== 13000 && data.paidAmount !== 26000) continue;
      const athlete = athleteById.get(data.athleteId);
      if (!athlete) continue; // bukan atlet yang masih ditagih (bebas kas / vakum / dihapus)
      const athleteCity = (athlete.city ?? "").trim();
      if (hasSessionForAthlete(sessions, data.date, athleteCity)) continue;
      const sessionsToRoll = Math.floor(data.paidAmount / 13000);
      const ownedDates = datesByAthlete.get(data.athleteId) ?? new Set<string>();
      const targets = nextUnpaidTrainingDates(futureSessions, athleteCity, ownedDates, yesterday, sessionsToRoll);
      if (targets.length < sessionsToRoll) continue; // tanggal berikutnya tidak cukup: biarkan utuh
      const creates = targets.map((target) => ({
        ref: recordsRef.doc(`${data.athleteId}_${target}`),
        data: {
          date: target,
          athleteId: data.athleteId,
          name: athlete.name,
          division: Array.isArray(athlete.divisions) ? athlete.divisions.join(", ") : athlete.division || "",
          paidKas: true,
          paidAmount: 13000,
          totalBilled: 13000,
          isSettled: true,
          isLate: false,
          noNews: false,
          isExcused: false,
          isExcusedWork: false,
          isExcusedOther: false,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
      }));
      for (const target of targets) ownedDates.add(target);
      moves.push({ deleteRef: d.ref, creates });
    }
    for (const group of chunkList(moves, 150)) {
      const batch = db.batch();
      for (const move of group) {
        for (const item of move.creates) batch.set(item.ref, item.data);
        batch.delete(move.deleteRef);
      }
      await batch.commit();
    }
    const rolledCount = moves.reduce((total, move) => total + move.creates.length, 0);

    return NextResponse.json({
      ok: true,
      trainingDates: dates.length,
      sessions: sessions.length,
      athletes: athletes.length,
      created: count,
      deleted: deletedCount,
      rolled: rolledCount,
    });
  } catch (error: any) {
    console.error("Kas sync cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}