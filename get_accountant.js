const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'zip-sma',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function getAccountant() {
  try {
      const staffRef = db.collection('staff');
      const snapshot = await staffRef.where('role', '==', 'Accountant').get();
      if (snapshot.empty) {
          console.log('No accountant found.');
      } else {
          snapshot.forEach(doc => {
              console.log(doc.id, '=>', doc.data());
          });
      }
  } catch(err) {
      console.error('Error:', err);
  }
}

getAccountant();
