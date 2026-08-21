const admin = require('firebase-admin');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/'/g, "") 
    : undefined;

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        })
    });
}

const db = admin.firestore();

async function checkClasses() {
    const snapshot = await db.collection('students').get();
    const classCounts = {};
    let count = 0;
    snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.isArchived) {
            const cls = data.className;
            classCounts[cls] = (classCounts[cls] || 0) + 1;
            count++;
        }
    });
    console.log(`Total active students: ${count}`);
    console.log('Students per class:', classCounts);
}

checkClasses().catch(console.error);
