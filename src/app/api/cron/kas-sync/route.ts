import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { bearerMatches } from "@/lib/cron-auth";
import { chunkList, isBillableTrainingDate, jakartaDateString, KAS_SYNC_BATCH } from "@/lib/jakarta-date";

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
    const schedSnap = await db.collection("crown-schedules").get();

    const trainingDates = new Set<string>();
    schedSnap.docs.forEach((d: any) => {
      const s = d.data();
      if (
        (s.status === "latihan" || s.status === "tambahan") &&
        typeof s.date === "string" &&
        isBillableTrainingDate(s.date, today)
      ) {
        trainingDates.add(s.date);
      }
    });
    const dates = [...trainingDates].sort();

    // 2. Non-exempt athletes
    const athSnap = await db.collection("crown-athletes").get();
    const athletes = athSnap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((a: any) => !a.kasExempt);

    // 3. Existing kas records for these dates
    const kasSnap = await db.collection("crown-kas-daily").get();
    const existing = new Set<string>();
    kasSnap.docs.forEach((d: any) => {
      const data = d.data();
      if (data.date && data.athleteId) {
        existing.add(`${data.date}|${data.athleteId}`);
      }
    });

    // 4. Create missing records (alpa: Rp 26.000). Never update an existing row.
    const recordsRef = db.collection("crown-kas-daily");
    const pending: Array<{ ref: ReturnType<typeof recordsRef.doc>; data: Record<string, unknown> }> = [];

    for (const date of dates) {
      for (const athlete of athletes) {
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