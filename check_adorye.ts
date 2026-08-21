import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.env.local' });
import { getFirebaseConfig } from './src/firebase/config';
import { initializeFirebase } from './src/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { calculateStudentTotalBalance, Student, AcademicPeriod, FeeCategory } from './src/lib/data-store';

const run = async () => {
    try {
        const config = getFirebaseConfig();
        const { db } = initializeFirebase(config);
        
        const studentsSnapshot = await getDocs(collection(db, 'students'));
        const periodsSnapshot = await getDocs(collection(db, 'academicPeriods'));
        const feeCategoriesSnapshot = await getDocs(collection(db, 'feeCategories'));

        const periods = periodsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as AcademicPeriod));
        const feeCategories = feeCategoriesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as FeeCategory));
        
        for (const studentDoc of studentsSnapshot.docs) {
            const data = studentDoc.data() as Student;
            const name = data.name || '';
            
            if (name.toLowerCase().includes('adorye otubea')) {
                console.log(`Found student: ${name} (${studentDoc.id})`);
                
                const currentPeriod = periods.find(p => p.isCurrent);
                const balanceInfo = calculateStudentTotalBalance(data, periods, currentPeriod?.id, feeCategories);

                console.log("Main Balance Data:", JSON.stringify(balanceInfo.mainData, null, 2));
                console.log("Daily Balance Data:", JSON.stringify(balanceInfo.dailyData, null, 2));
                console.log("Total Outstanding:", balanceInfo.totalOutstanding);
                console.log("\nLedger:", JSON.stringify(data.ledger, null, 2));
            }
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
};

run();
