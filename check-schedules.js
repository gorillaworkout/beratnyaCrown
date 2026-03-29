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
  console.log("Total custom schedules:", snapshot.size);
  snapshot.forEach(doc => {
    console.log(doc.id, "=>", doc.data());
  });
}

main().catch(console.error);
