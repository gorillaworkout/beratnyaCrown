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
  const snapshot = await db.collection('crown-kas-daily').get();
  console.log("Looking for unpaid records in DB...");
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.totalBilled > 0 && !data.isSettled) {
      console.log(doc.id, "=>", data.name, data.date, data.totalBilled, "Athlete ID:", data.athleteId);
    }
  });
}

main().catch(console.error);
