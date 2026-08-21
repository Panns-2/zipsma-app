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
        let found = false;
        
        for (const studentDoc of studentsSnapshot.docs) {
            const data = studentDoc.data();
            const name = data.name || '';
            
            if (name.toLowerCase().includes('adorye otubea')) {
                found = true;
                console.log(`Found student: ${name} (${studentDoc.id})`);
                
                await updateDoc(doc(db, 'students', studentDoc.id), {
                    dailyFees: []
                });
                console.log('Successfully cleared daily fees for this student.');
            }
        }
        
        if (!found) {
            console.log('Could not find student with name containing "adorye otubea"');
        }
    } catch (err) {
        console.error(err);
    }
};

run();
