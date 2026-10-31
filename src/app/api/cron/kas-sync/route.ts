import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { bearerMatches } from "@/lib/cron-auth";
import { athleteJoinDate, chunkList, jakartaDateString, KAS_START, KAS_SYNC_BATCH } from "@/lib/jakarta-date";
import { addIsoDays, listTrainingSessions, type StoredSchedule } from "@/lib/team-schedule";

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
    const dates = [...new Set(
      listTrainingSessions(stored, KAS_START, yesterday).map((session) => session.date),
    )].sort();

    // 2. Non-exempt athletes (tanggal join diterapkan pada langkah 4)
    const athSnap = await db.collection("crown-athletes").get();
    const athletes = athSnap.docs
      .map((d: any) => ({ id: d.id, createTime: d.createTime, ...d.data() }))
      .filter((a: any) => !a.kasExempt);

    // Kas hanya berjalan sejak athlete join: tanggal join = createTime dokumen
    // (fallback: field createdAt), dalam zona Asia/Jakarta. Tanpa sinyal tanggal,
    // pakai KAS_START seperti sebelumnya.
    const joinDateByAthlete = new Map(athletes.map((a: any) => [a.id, athleteJoinDate(a)]));

    // 3. Existing kas records for these dates
    const kasSnap = await db.collection("crown-kas-daily").get();
    const existing = new Set<string>();
    kasSnap.docs.forEach((d: any) => {
      const data = d.data();
      if (data.date && data.athleteId) {
        existing.add(`${data.date}|${data.athleteId}`);
      }
    });

    // 4. Create missing records (alpa: Rp 26.000) for sessions on/after each
    //    athlete's join date. Never update an existing row.
    const recordsRef = db.collection("crown-kas-daily");
    const pending: Array<{ ref: ReturnType<typeof recordsRef.doc>; data: Record<string, unknown> }> = [];

    for (const date of dates) {
      for (const athlete of athletes) {
        // Lewati sesi sebelum athlete join — kas masuk dari latihan pertama sejak join.
        if (date < (joinDateByAthlete.get(athlete.id) ?? KAS_START)) continue;
        const key = `${date}|${athlete.id}`;
        if (existing.has(key)) continue;

        pending.push({
          ref: recordsRef.doc(),
          data: {
            date,
            athleteId: athlete.id,
            name: athlete.name,
            division: Array.isArray(athlete.divisions) ? athlete.divisions.join(", ") : athlete.division || "",
            paidKas: true,
            isLate: false,
            noNews: true,
            isExcused: false,
            isExcusedWork: false,
            isExcusedOther: false,
            totalBilled: 26000,
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

    return NextResponse.json({
      ok: true,
      trainingDates: dates.length,
      athletes: athletes.length,
      created: count,
    });
  } catch (error: any) {
    console.error("Kas sync cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}