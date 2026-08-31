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
const ref = db.collection("crown-schedules");
const snapshot = await ref.where("date", ">=", "2026-09-01").where("date", "<=", "2026-12-31").get();
const backup = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
const snapshot2027 = await ref.where("date", ">=", "2027-01-01").where("date", "<=", "2027-12-31").get();
const backup2027 = snapshot2027.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
const backupPath = `backups/crown-schedules-2026-09-11-${Date.now()}.json`;
fs.mkdirSync("backups", { recursive: true });
fs.writeFileSync(backupPath, JSON.stringify({ schedules2026: backup, schedules2027: backup2027 }, null, 2));

const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const wanted = [];
for (let month = 8; month <= 11; month++) {
  let firstSaturday = true;
  let firstSunday = true;
  const days = new Date(2026, month + 1, 0).getDate();
  for (let day = 1; day <= days; day++) {
    const date = new Date(2026, month, day);
    const dow = date.getDay();
    if (![0, 3, 6].includes(dow)) continue;
    const dateStr = `2026-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const base = {
      date: dateStr,
      dayName: dayNames[dow],
      isRegular: true,
      status: "latihan",
      timeStart: dow === 0 ? "10:00" : "19:00",
      timeEnd: dow === 0 ? "13:00" : "22:00",
      note: "",
    };
    if ((dow === 6 && firstSaturday) || (dow === 0 && firstSunday)) {
      wanted.push({ ...base, city: "Gabungan" });
      if (dow === 6) firstSaturday = false;
      if (dow === 0) firstSunday = false;
    } else if (dow === 0) {
      wanted.push({ ...base, status: "libur", note: "Latihan ditiadakan" });
    } else {
      wanted.push({ ...base, city: "Bandung" }, { ...base, city: "Jakarta", isRegular: false });
    }
  }
}

let batch = db.batch();
for (const doc of snapshot.docs) batch.delete(doc.ref);
for (const doc of snapshot2027.docs) batch.delete(doc.ref);
await batch.commit();
for (let i = 0; i < wanted.length; i += 400) {
  batch = db.batch();
  for (const row of wanted.slice(i, i + 400)) batch.set(ref.doc(), row);
  await batch.commit();
}
console.log(JSON.stringify({ backupPath, deleted2026: snapshot.size, deleted2027: snapshot2027.size, created: wanted.length }, null, 2));
