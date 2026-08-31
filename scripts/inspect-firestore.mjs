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
for (const coll of ["crown-schedules", "crown-events", "crown-kas-daily", "crown-athletes", "crown-kas-transactions"]) {
  const snap = await db.collection(coll).get();
  out[coll] = snap.size;
}
// schedule detail
const sched = await db.collection("crown-schedules").get();
const dates = sched.docs.map(d => d.data().date).sort();
out.schedDates = { min: dates[0], max: dates[dates.length - 1], count: dates.length };
const statuses = {};
sched.docs.forEach(d => { const s = d.data().status; statuses[s] = (statuses[s] || 0) + 1; });
out.schedStatuses = statuses;
out.schedLast8 = sched.docs.map(d => `${d.data().date}:${d.data().status}${d.data().city ? ":" + d.data().city : ""}`).sort().slice(-8);
// athletes
const ath = await db.collection("crown-athletes").get();
out.athletes = ath.docs.slice(0, 10).map(d => d.data().name);
// kas daily
const kas = await db.collection("crown-kas-daily").get();
out.kasDates = [...new Set(kas.docs.map(d => d.data().date))].sort();

process.stdout.write(JSON.stringify(out));
