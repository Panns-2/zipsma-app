import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

let app;
if (getApps().length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        app = initializeApp({
            credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
        });
    } else {
        console.error("No service account key found in .env.local");
        process.exit(1);
    }
} else {
    app = getApps()[0];
}

const db = getFirestore(app);

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
