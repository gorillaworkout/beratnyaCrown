import fs from "node:fs";
import dotenv from "dotenv";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const env = dotenv.parse(fs.readFileSync(".env"));
initializeApp({ credential: cert({
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: env.FIREBASE_CLIENT_EMAIL,
  privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
}) });
const db = getFirestore();

const out = {};

// All kas records in August 2026
const kasSnap = await db.collection("crown-kas-daily")
  .where("date", ">=", "2026-08-01").where("date", "<=", "2026-08-31").get();
const byDate = {};
kasSnap.docs.forEach(d => {
  const data = d.data();
  if (!byDate[data.date]) byDate[data.date] = [];
  byDate[data.date].push({
    athleteId: d.id,
    totalBilled: data.totalBilled,
    isSettled: !!data.isSettled,
    paidKas: !!data.paidKas,
    noNews: !!data.noNews,
    isExcusedWork: !!data.isExcusedWork,
    isExcusedOther: !!data.isExcusedOther,
  });
});
out.augustKas = Object.keys(byDate).sort().map(d => ({ date: d, count: byDate[d].length, settled: byDate[d].filter(r => r.isSettled).length, unpaid: byDate[d].filter(r => !r.isSettled && r.totalBilled > 0).length, sample: byDate[d][0] }));

// schedules in August
const schedSnap = await db.collection("crown-schedules")
  .where("date", ">=", "2026-08-01").where("date", "<=", "2026-08-31").get();
out.augustSchedules = schedSnap.docs.map(d => `${d.data().date}:${d.data().status}:${d.data().city || "?"}`).sort();

// absences in August
const absSnap = await db.collection("crown-absences").get();
const augAbs = absSnap.docs.filter(d => (d.data().date || "").startsWith("2026-08"));
out.augustAbsences = augAbs.map(d => ({ date: d.data().date, count: (d.data().absences || []).length }));

process.stdout.write(JSON.stringify(out, null, 1));
