const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// We need a service account key. 
// Alternatively, can we just use the firebase client SDK? We don't have the service account key easily accessible.
