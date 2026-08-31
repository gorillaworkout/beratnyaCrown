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

// max kas date
const kasSnap = await db.collection("crown-kas-daily").get();
const kasDates = [...new Set(kasSnap.docs.map(d => d.data().date))].sort();
out.maxKasDate = kasDates[kasDates.length - 1];
out.minKasDate = kasDates[0];
out.totalKasRecords = kasSnap.size;

// records for 2026-08-26
const aug26 = kasSnap.docs.filter(d => d.data().date === "2026-08-26");
out.aug26records = aug26.length;

// full August schedules detail
const schedSnap = await db.collection("crown-schedules")
  .where("date", ">=", "2026-08-20").where("date", "<=", "2026-08-31").get();
out.schedulesAug20_31 = schedSnap.docs.map(d => ({
  date: d.data().date,
  status: d.data().status,
  city: d.data().city || "(no city=Bandung)",
  note: d.data().note || ""
}));

// athletes count non-exempt
const ath = await db.collection("crown-athletes").get();
out.totalAthletes = ath.size;
out.exempt = ath.docs.filter(d => d.data().kasExempt).length;

process.stdout.write(JSON.stringify(out, null, 1));
