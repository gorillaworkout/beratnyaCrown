import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

// Dynamic import to avoid build issues
let adminDb: any = null;
async function getAdminDb() {
  if (!adminDb) {
    const { adminDb: db } = await import("@/lib/firebase-admin");
    adminDb = db;
  }
  return adminDb;
}

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min timeout for backfill

// Kas counting resumed on this date (first training back). Anything before
// this is historical/manual — never backfill phantom alpa debt for it.
const KAS_START = "2026-08-26";

export async function GET() {
  try {
    const db = await getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Firebase admin not available" }, { status: 500 });
    }

    // 1. Past training dates from crown-schedules (status=latihan/tambahan,
    //    date >= KAS_START and <= today)
    // Fetch all + filter in memory — avoids needing a composite index (status+date)
    const today = new Date().toISOString().split("T")[0];
    const schedSnap = await db.collection("crown-schedules").get();

    const trainingDates = new Set<string>();
    schedSnap.docs.forEach((d: any) => {
      const s = d.data();
      if (
        (s.status === "latihan" || s.status === "tambahan") &&
        s.date >= KAS_START &&
        s.date <= today
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

    // 4. Create missing records (alpa: Rp 26.000)
    const batch = db.batch();
    const recordsRef = db.collection("crown-kas-daily");
    let count = 0;

    for (const date of dates) {
      for (const athlete of athletes) {
        const key = `${date}|${athlete.id}`;
        if (existing.has(key)) continue;

        const newRef = recordsRef.doc();
        batch.set(newRef, {
          date,
          athleteId: athlete.id,
          name: athlete.name,
          division: athlete.division || "",
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
        });
        count++;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

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