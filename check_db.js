import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf-8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function check() {
  const snap = await db.collection('crown-events').get();
  console.log("Found", snap.size, "events");
  snap.forEach(doc => {
    console.log(doc.id, doc.data().start);
  });
}
check();
