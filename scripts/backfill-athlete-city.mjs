import fs from "node:fs";
import dotenv from "dotenv";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const env = dotenv.parse(fs.readFileSync("/home/ubuntu/apps/beratnyaCrown/.env"));
initializeApp({ credential: cert({ projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") }) });
const db = getFirestore();
const snap = await db.collection("crown-athletes").get();
const targets = snap.docs.filter((d) => !d.data().city);
console.log(JSON.stringify({ total: snap.size, missingCity: targets.length }));
if (process.argv.includes("--write")) {
  const batch = db.batch();
  for (const d of targets) batch.update(d.ref, { city: "Bandung", updatedAt: FieldValue.serverTimestamp() });
  if (targets.length) await batch.commit();
  console.log(JSON.stringify({ updated: targets.length, city: "Bandung" }));
}
