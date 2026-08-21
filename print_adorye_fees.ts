import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.env.local' });
import { getFirebaseConfig } from './src/firebase/config';
import { initializeFirebase } from './src/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const run = async () => {
    try {
        const config = getFirebaseConfig();
        const { db } = initializeFirebase(config);
        
        const studentsSnapshot = await getDocs(collection(db, 'students'));
        
        for (const studentDoc of studentsSnapshot.docs) {
            const data = studentDoc.data();
            const name = data.name || '';
            
            if (name.toLowerCase().includes('adorye otubea')) {
                console.log(`Found student: ${name} (${studentDoc.id})`);
                console.log('dailyFees:', JSON.stringify(data.dailyFees, null, 2));
            }
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
};

run();
