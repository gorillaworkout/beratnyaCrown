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

const snap = await db.collection("crown-kas-daily").where("date", "==", "2026-08-26").get();
console.log(`Deleting ${snap.size} records for 2026-08-26...`);
const batch = db.batch();
snap.docs.forEach(d => batch.delete(d.ref));
await batch.commit();
console.log("Done. Deleted:", snap.size);