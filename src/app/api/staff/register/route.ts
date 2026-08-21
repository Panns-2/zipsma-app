import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { schoolId, email, password, name, role, phone, className, staffId, legacyStaffId } = body;

        if (!schoolId || !name || !role) {
            return NextResponse.json({ error: 'Missing required fields: schoolId, name, role' }, { status: 400 });
        }

        const isGatekeeper = role === 'Gatekeeper' || role === 'Security';

        if (!isGatekeeper && !email) {
            return NextResponse.json({ error: 'Email is required for this role.' }, { status: 400 });
        }

        const db = getAdminDb();
        const auth = getAdminAuth();

        let uid = '';
        let originalDateAdded = null;

        if (!isGatekeeper) {
            // 1. Check if user already exists in Firebase Auth
            let userRecord;
            try {
                userRecord = await auth.getUserByEmail(email);
                // If they exist and a password was provided, update their password
                if (password) {
                    userRecord = await auth.updateUser(userRecord.uid, {
                        password: password,
                        displayName: name
                    });
                }
            } catch (authError: any) {
                // User does not exist, create a new one
                if (authError.code === 'auth/user-not-found') {
                    if (!password) {
                        return NextResponse.json({ error: 'Password is required for new staff accounts.' }, { status: 400 });
                    }
                    userRecord = await auth.createUser({
                        email,
                        password,
                        displayName: name,
                    });
                } else {
                    throw authError;
                }
            }
            uid = userRecord.uid;
        } else {
            // Gatekeepers do not use Firebase Auth
            uid = legacyStaffId || staffId || db.collection('staff').doc().id;
        }
        // 2. If migrating a legacy account (where doc ID was the Staff ID), fetch existing data and delete old doc
        if (legacyStaffId) {
            const legacyRef = db.collection('staff').doc(legacyStaffId.toUpperCase());
            const legacySnap = await legacyRef.get();
            if (legacySnap.exists) {
                const legacyData = legacySnap.data();
                if (legacyData?.dateAdded) {
                    originalDateAdded = legacyData.dateAdded;
                }
                // Delete legacy document to avoid duplicates
                await legacyRef.delete();

                // Also delete salary details associated with legacy ID and move to new UID
                const legacySalaryRef = db.collection('staffDetails').doc(legacyStaffId.toUpperCase());
                const legacySalarySnap = await legacySalaryRef.get();
                if (legacySalarySnap.exists) {
                    const salaryData = legacySalarySnap.data();
                    await db.collection('staffDetails').doc(uid).set({
                        schoolId: schoolId.toUpperCase(),
                        salary: salaryData?.salary || 0
                    });
                    await legacySalaryRef.delete();
                }
            }
        }

        // 3. Save the new staff document at /staff/{uid}
        const staffRef = db.collection('staff').doc(uid);
        const staffDocData: Record<string, any> = {
            uid: uid,
            email: email,
            name: name,
            role: role,
            schoolId: schoolId.toUpperCase(),
            phone: phone || '',
            isArchived: false,
            staffId: staffId || legacyStaffId || '',
            dateAdded: originalDateAdded || FieldValue.serverTimestamp()
        };

        if (className && (role === 'Teacher' || role === 'Assistant Teacher')) {
            staffDocData.className = className;
        }

        await staffRef.set(staffDocData, { merge: true });

        return NextResponse.json({ success: true, uid });
    } catch (error: any) {
        console.error('Staff Registration API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
