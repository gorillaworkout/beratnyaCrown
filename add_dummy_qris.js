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
  await db.collection('crown-kas-transactions').add({
    type: "IN_OTHER",
    amount: 13000,
    description: "QRIS GoPay - Pembayaran Kas",
    date: new Date().toISOString().split('T')[0],
    source: "gobiz_webhook",
    raw_payload: { order: { order_number: "F-1234567890" } },
    createdAt: new Date()
  });
  await db.collection('crown-kas-transactions').add({
    type: "IN_OTHER",
    amount: 26000,
    description: "QRIS GoPay - Bayar Denda",
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    source: "gobiz_webhook",
    raw_payload: { order: { order_number: "F-0987654321" } },
    createdAt: new Date()
  });
  console.log("Dummy QRIS data added");
}

main().catch(console.error);
