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
const KAS_START = "2026-08-29";

const schedSnap = await db.collection("crown-schedules").get();
// Sesi beserta kotanya (cerminan cityOf di team-schedule: selain Jakarta/Gabungan = Bandung).
// Catatan: dry-run ini hanya menghitung jadwal tersimpan, tanpa sesi virtual Bandung
// yang dipakai cron asli lewat listTrainingSessions.
const cityOf = (city) => (city === "Jakarta" || city === "Gabungan" ? city : "Bandung");
const sessions = schedSnap.docs
  .map(d => d.data())
  .filter(s => (s.status === "latihan" || s.status === "tambahan") && s.date >= KAS_START && s.date <= today)
  .map(s => ({ date: s.date, city: cityOf(s.city) }));
const trainingDates = [...new Set(sessions.map(s => s.date))].sort();
console.log("Past training dates:", trainingDates.length, "|", trainingDates.join(", "));
console.log("Past training sessions:", sessions.length);

const athSnap = await db.collection("crown-athletes").get();
const jakarta = (d) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(d);
const toJakartaDate = (v) => {
  if (!v) return null;
  if (typeof v === "string") { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : jakarta(d); }
  if (typeof v.toDate === "function") return jakarta(v.toDate());
  if (typeof v.seconds === "number") return jakarta(new Date(v.seconds * 1000));
  return null;
};
const joinDateOf = (a, createTime) => toJakartaDate(createTime) ?? toJakartaDate(a.createdAt) ?? KAS_START;
const athletes = athSnap.docs.map(d => ({ id: d.id, ...d.data(), joinDate: joinDateOf(d.data(), d.createTime) })).filter(a => !a.kasExempt);
console.log("Active athletes (non-exempt):", athletes.length);

const kasSnap = await db.collection("crown-kas-daily").get();
const existing = new Set(kasSnap.docs.map(d => `${d.data().date}|${d.data().athleteId}`));
console.log("Existing kas records:", kasSnap.size);

// Aturan kota (cerminan athletesForSession di src/lib/kas-city.ts): sesi kota X
// hanya menagih atlet kota X; sesi Gabungan menagih semua kota; atlet tanpa kota
// tetap ditagih di semua sesi. Satu tanggal bisa punya dua sesi — planned
// mencegah atlet yang sama dihitung dua kali untuk tanggal itu.
let count = 0;
const byDate = {};
const byCity = {};
const planned = new Set();
for (const session of sessions) {
  for (const a of athletes) {
    const aCity = (a.city || "").trim();
    if (session.city !== "Gabungan" && aCity && aCity !== session.city) continue;
    if (session.date < a.joinDate) continue; // belum join: kas mulai dari latihan pertama sejak join
    const key = `${session.date}|${a.id}`;
    if (existing.has(key) || planned.has(key)) continue;
    planned.add(key);
    count++;
    byDate[session.date] = (byDate[session.date] || 0) + 1;
    const bucket = aCity || "tanpa kota";
    byCity[bucket] = (byCity[bucket] || 0) + 1;
  }
}
console.log("Would create:", count, "records");
console.log("Per date:", JSON.stringify(byDate, null, 0));
console.log("Per city:", JSON.stringify(byCity, null, 0));
console.log("Today:", today);
