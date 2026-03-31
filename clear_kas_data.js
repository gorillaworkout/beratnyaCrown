const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env'));

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

async function clearCollection(name) {
  const snapshot = await db.collection(name).get();
  if (snapshot.empty) {
    console.log(`  ${name}: already empty`);
    return 0;
  }
  
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`  ${name}: deleted ${snapshot.size} documents`);
  return snapshot.size;
}

async function main() {
  console.log("Clearing kas data to start fresh...\n");
  
  const daily = await clearCollection('crown-kas-daily');
  const trx = await clearCollection('crown-kas-transactions');
  
  console.log(`\nDone. Removed ${daily + trx} total documents.`);
  console.log("Saldo kas sekarang: Rp 0");
}

main().catch(console.error);
