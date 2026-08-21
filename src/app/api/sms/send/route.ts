import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/index';
import { getFirebaseConfig } from '@/firebase/config';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { sendNotificationToUser, sendNotificationToAllParents } from '@/lib/notification-utils';

export async function POST(request: Request) {
    try {
        // Initialize Firebase lazily inside the handler to prevent deployment timeouts
        const { db } = initializeFirebase(getFirebaseConfig());
        const body = await request.json();
        const { schoolId, message, recipient, specificParent, notificationOnly } = body;

        if (!schoolId || !message || !recipient) {
            return NextResponse.json({ error: 'Missing required parameters: schoolId, message, or recipient' }, { status: 400 });
        }

        // 1. Fetch Hubtel credentials from the specific school
        const normalizedSchoolId = schoolId.toUpperCase();
        const schoolDocRef = doc(db, 'schools', normalizedSchoolId);
        const schoolDoc = await getDoc(schoolDocRef);
        
        if (!schoolDoc.exists()) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }
        
        const schoolData = schoolDoc.data();
        const hubtelClientId = schoolData?.hubtelSmsClientId?.trim();
        const hubtelClientSecret = schoolData?.hubtelSmsClientSecret?.trim();
        let hubtelSenderId = schoolData?.hubtelSenderId?.trim() || schoolData?.name || 'ZipSMA';
        
        // Clean sender ID: Alphanumeric only, max 11 chars as per Hubtel requirements
        hubtelSenderId = hubtelSenderId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 11);

        if (!hubtelClientId || !hubtelClientSecret) {
            return NextResponse.json({ error: 'Missing Hubtel setup for this school. Please ensure Client ID and Client Secret are saved in Hubtel settings.' }, { status: 400 });
        }

        // 2. Fetch recipients (only parents of this specific school)
        let targetPhones = new Set<string>();

        if (recipient === 'all') {
            const parentsRef = collection(db, 'parents');
            const pq = query(parentsRef, where('schoolId', '==', schoolId.toUpperCase()));
            const parentsSnapshot = await getDocs(pq);
            parentsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.phone && data.phone.trim() !== '') {
                    targetPhones.add(data.phone.trim());
                }
            });

            const studentsRef = collection(db, 'students');
            const q = query(studentsRef, where('schoolId', '==', schoolId.toUpperCase()));
            const studentsSnapshot = await getDocs(q);
            studentsSnapshot.forEach(doc => {
                const data = doc.data();
                if (!data.parentId && data.parentPhone && data.parentPhone.trim() !== '') {
                    targetPhones.add(data.parentPhone.trim());
                }
            });
        } else if (recipient === 'specific' && specificParent) {
            const parentDocRef = doc(db, 'parents', specificParent);
            const parentDoc = await getDoc(parentDocRef);
            
            if (parentDoc.exists()) {
                const data = parentDoc.data();
                if (data.schoolId === schoolId.toUpperCase() && data.phone) {
                    targetPhones.add(data.phone.trim());
                }
            } else {
                const studentDocRef = doc(db, 'students', specificParent);
                const studentDoc = await getDoc(studentDocRef);
                
                if (studentDoc.exists()) {
                    const data = studentDoc.data();
                    if (data.schoolId === schoolId.toUpperCase()) {
                        if (data.parentId) {
                            const pDoc = await getDoc(doc(db, 'parents', data.parentId));
                            if (pDoc.exists() && pDoc.data().phone) {
                                targetPhones.add(pDoc.data().phone.trim());
                            }
                        } else if (data.parentPhone) {
                            targetPhones.add(data.parentPhone.trim());
                        }
                    }
                } else {
                     const studentsRef = collection(db, 'students');
                     const q = query(studentsRef, 
                         where('schoolId', '==', schoolId.toUpperCase()), 
                         where('parentId', '==', specificParent)
                     );
                     const parentStudentsSnapshot = await getDocs(q);
                     parentStudentsSnapshot.forEach(doc => {
                         const data = doc.data();
                         if (!data.parentId && data.parentPhone) {
                             targetPhones.add(data.parentPhone.trim());
                         }
                     });
                }
            }
        } else if (recipient === 'custom' && body.customPhone) {
            targetPhones.add(body.customPhone.trim());
        }

        let successfulSends = 0;
        let errors: string[] = [];

        // Hubtel credentials for Basic Auth
        const authHeader = Buffer.from(`${hubtelClientId}:${hubtelClientSecret}`).toString('base64');

        const isNotificationOnly = notificationOnly === true || notificationOnly === 'true';

        // 3. Send SMS to all valid phones via Hubtel (Skip if notificationOnly is true)
        if (!isNotificationOnly) {
            for (const phone of targetPhones) {
                try {
                    // Ensure phone is in international format if needed, but Hubtel handles local Ghanaian formats well
                    const formattedPhone = phone.startsWith('0') ? '233' + phone.substring(1) : phone;

                    const response = await fetch('https://api.hubtel.com/v1/messages/send', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json', 
                            'Authorization': `Basic ${authHeader}`
                        },
                        body: JSON.stringify({ 
                            From: hubtelSenderId, 
                            To: formattedPhone, 
                            Content: message,
                            Type: 0,
                            clientid: hubtelClientId, // Explicitly include clientid in body for Status 12 resolution
                            ClientReference: `sms_${Date.now()}_${Math.floor(Math.random() * 1000)}`
                        }),
                    });

                    if (response.ok) {
                        successfulSends++;
                    } else {
                        const responseText = await response.text();
                        let errorMessage = 'Unknown Hubtel error';
                        try {
                            const errorData = JSON.parse(responseText);
                            // Hubtel uses different fields for errors depending on the version (message, Message, Errors, etc)
                            errorMessage = errorData.message || errorData.Message || errorData.Errors?.[0]?.Message || responseText;
                        } catch (e) {
                            errorMessage = responseText || 'Unknown Hubtel error';
                        }
                        errors.push(`Status ${response.status}: ${errorMessage}`);
                    }
                } catch (err: any) {
                    errors.push(`Network error: ${err.message}`);
                }
            }
        }
        
        // 4. Trigger Push Notifications (FCM) in parallel
        try {
            const notificationPayload = {
                title: schoolData?.name || 'School Update',
                body: message,
                data: { schoolId: normalizedSchoolId, type: 'announcement' }
            };

            if (recipient === 'all') {
                sendNotificationToAllParents(normalizedSchoolId, notificationPayload);
            } else if (recipient === 'specific' && specificParent) {
                // If specificParent is a studentId, we might need to find their parentId
                // However, the register route uses whatever id is in the URL (urlId),
                // and the dashboard pass urlId to useFCM.
                // In parents dashboard, urlId is either parentId or studentId.
                sendNotificationToUser(specificParent, notificationPayload);
            }
        } catch (fcmError) {
            console.error('FCM sending failed but SMS was processed:', fcmError);
        }

        if (isNotificationOnly || successfulSends > 0) {
            return NextResponse.json({ 
                success: true, 
                message: isNotificationOnly 
                    ? "Push notification sent successfully."
                    : `Successfully sent SMS to ${successfulSends} recipient(s). ${errors.length > 0 ? `Failed: ${errors.length}` : ''}`
            });
        } else {
            return NextResponse.json({ 
                error: `SMS sending failed: ${errors[0] || 'Unknown error'}. Check Hubtel credentials/balance.` 
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('API /sms/send exception:', error);
        return NextResponse.json({ error: error.message || 'Internal server error while processing SMS.' }, { status: 500 });
    }
}
