import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
    try {
        const adminDb = getAdminDb();
        const studentsSnap = await adminDb.collection('students').get();
        const parentsSnap = await adminDb.collection('parents').get();

        const batch = adminDb.batch();
        let count = 0;
        let batchCount = 0;
        let totalCount = 0;

        for (const doc of studentsSnap.docs) {
            batch.update(doc.ref, { pin: '1234', pinChangeRequired: true });
            count++;
            batchCount++;
            if (count >= 400) {
                await batch.commit();
                count = 0;
            }
        }

        for (const doc of parentsSnap.docs) {
            batch.update(doc.ref, { pin: '1234', pinChangeRequired: true });
            count++;
            batchCount++;
            if (count >= 400) {
                await batch.commit();
                count = 0;
            }
        }

        if (count > 0) {
            await batch.commit();
        }

        return NextResponse.json({ success: true, message: `Migrated ${batchCount} records successfully.` });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
