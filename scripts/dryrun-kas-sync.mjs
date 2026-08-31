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

// --- dry-run: replicate cron logic without writing ---
const today = new Date().toISOString().split("T")[0];
const KAS_START = "2026-08-26";

const schedSnap = await db.collection("crown-schedules").get();
const trainingDates = [...new Set(
  schedSnap.docs
    .map(d => d.data())
    .filter(s => (s.status === "latihan" || s.status === "tambahan") && s.date >= KAS_START && s.date <= today)
    .map(s => s.date)
)].sort();
console.log("Past training dates:", trainingDates.length, "|", trainingDates.join(", "));

const athSnap = await db.collection("crown-athletes").get();
const athletes = athSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(a => !a.kasExempt);
console.log("Active athletes (non-exempt):", athletes.length);

const kasSnap = await db.collection("crown-kas-daily").get();
const existing = new Set(kasSnap.docs.map(d => `${d.data().date}|${d.data().athleteId}`));
console.log("Existing kas records:", kasSnap.size);

let count = 0;
const byDate = {};
for (const date of trainingDates) {
  let missing = 0;
  for (const a of athletes) {
    if (!existing.has(`${date}|${a.id}`)) {
      missing++;
      count++;
    }
  }
  byDate[date] = missing;
}
console.log("Would create:", count, "records");
console.log("Per date:", JSON.stringify(byDate, null, 0));
console.log("Today:", today);
