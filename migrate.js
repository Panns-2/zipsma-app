const admin = require('firebase-admin');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// handle escaped newlines in private key
const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/'/g, "") 
    : undefined;

if (!projectId || !clientEmail || !privateKey) {
  console.error('Firebase admin credentials missing from .env.local');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/'/g, "")
  })
});

const db = admin.firestore();

async function migrate() {
    console.log('Starting migration...');
    const studentsSnap = await db.collection('students').get();
    const parentsSnap = await db.collection('parents').get();

    let batch = db.batch();
    let count = 0;
    let totalCount = 0;

    for (const doc of studentsSnap.docs) {
        batch.update(doc.ref, { pin: '1234', pinChangeRequired: true });
        count++;
        totalCount++;
        if (count >= 400) {
            await batch.commit();
            console.log(`Committed ${totalCount} records`);
            batch = db.batch();
            count = 0;
        }
    }

    for (const doc of parentsSnap.docs) {
        batch.update(doc.ref, { pin: '1234', pinChangeRequired: true });
        count++;
        totalCount++;
        if (count >= 400) {
            await batch.commit();
            console.log(`Committed ${totalCount} records`);
            batch = db.batch();
            count = 0;
        }
    }

    if (count > 0) {
        await batch.commit();
        console.log(`Committed ${totalCount} records`);
    }

    console.log(`Migration complete. Total updated: ${totalCount}`);
    process.exit(0);
}

migrate().catch(console.error);
