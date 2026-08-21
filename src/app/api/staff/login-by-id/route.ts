import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const { schoolId, staffId } = await request.json();

        if (!schoolId || !staffId) {
            return NextResponse.json({ error: 'Missing schoolId or staffId' }, { status: 400 });
        }

        const db = getAdminDb();
        const upperSchoolId = schoolId.trim().toUpperCase();
        const upperStaffId = staffId.trim().toUpperCase();

        // Try direct lookup by document ID first
        let staffRef = db.collection('staff').doc(upperStaffId);
        let staffSnap = await staffRef.get();
        
        let staffData: any = null;
        let actualStaffId = '';

        if (staffSnap.exists) {
            staffData = staffSnap.data();
            actualStaffId = staffSnap.id;
        } else {
            // Try query
            const snapshot = await db.collection('staff')
                .where('schoolId', '==', upperSchoolId)
                .where('staffId', '==', upperStaffId)
                .limit(1)
                .get();
                
            if (!snapshot.empty) {
                staffData = snapshot.docs[0].data();
                actualStaffId = snapshot.docs[0].id;
            }
        }

        if (!staffData) {
            return NextResponse.json({ error: 'Invalid Staff ID.' }, { status: 404 });
        }

        if (staffData.schoolId !== upperSchoolId) {
            return NextResponse.json({ error: 'Invalid credentials or school ID mismatch.' }, { status: 403 });
        }

        if (staffData.isArchived) {
            return NextResponse.json({ error: 'This account has been archived.' }, { status: 403 });
        }

        return NextResponse.json({
            success: true,
            id: actualStaffId,
            name: staffData.name,
            role: staffData.role,
            schoolId: staffData.schoolId
        });

    } catch (error: any) {
        console.error('Login API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
