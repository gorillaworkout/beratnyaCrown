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
  try {
    const docRef = db.collection('crown-kas-daily').doc('test-id');
    await docRef.set({
      athleteId: 'test',
      name: 'Test',
      paidKas: true,
      totalBilled: 13000
    });
    console.log("Save success via admin sdk");
  } catch(e) {
    console.error("Save failed", e);
  }
}

main();
