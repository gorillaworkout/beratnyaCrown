const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('/home/ubuntu/apps/beratnyaCrown/.env'))

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = {
  projectId: envConfig.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: envConfig.FIREBASE_CLIENT_EMAIL,
  privateKey: envConfig.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function main() {
  const snapshot = await db.collection('crown-schedules').get();
  console.log("Looking for schedule records with shirtColor...");
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.date === "2026-04-03" || data.shirtColor) {
      console.log(doc.id, "=> Date:", data.date, "Shirt:", JSON.stringify(data.shirtColor), "Status:", data.status);
    }
  });
}

main().catch(console.error);
