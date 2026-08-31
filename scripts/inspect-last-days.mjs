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

// Check records for 2026-08-26 and 2026-08-29
for (const date of ["2026-08-26", "2026-08-29"]) {
  const snap = await db.collection("crown-kas-daily").where("date", "==", date).get();
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`\n${date}: ${docs.length} records`);
  const settled = docs.filter(d => d.isSettled).length;
  const billed = docs.filter(d => d.totalBilled > 0).length;
  console.log(`  settled: ${settled}, billed>0: ${billed}`);
  if (docs.length > 0) {
    console.log("  sample:", JSON.stringify({ name: docs[0].name, totalBilled: docs[0].totalBilled, noNews: docs[0].noNews, createdAt: docs[0].createdAt?._seconds || docs[0].createdAt }));
  }
}
