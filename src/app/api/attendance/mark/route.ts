import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { schoolId, studentId, parentPhone, studentName } = body;

        if (!schoolId || !studentId || !parentPhone) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = getAdminDb();
        const schoolDoc = await db.collection('schools').doc(schoolId).get();

        if (!schoolDoc.exists) {
             return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        const schoolData = schoolDoc.data();
        const clientId = schoolData?.hubtelSmsClientId;
        const clientSecret = schoolData?.hubtelSmsClientSecret;
        const senderId = schoolData?.hubtelSenderId || 'ZipSMA';

        if (!clientId || !clientSecret) {
            // Silently fail if not configured, as to not break the app flow
            console.warn(`Hubtel SMS not configured for school ${schoolId}`);
            return NextResponse.json({ success: true, ignored: true, message: 'Hubtel SMS not configured for this school' });
        }

        // Format phone number
        let phone = parentPhone.replace(/\s+/g, '');
        if (phone.startsWith('0')) {
             phone = '233' + phone.substring(1);
        } else if (!phone.startsWith('233') && !phone.startsWith('+')) {
             // Basic fallback for Ghana
             phone = '233' + phone;
        }

        const message = `ZipSMA Alert: ${studentName || 'Your child'} has arrived safely at school today.`;

        // Call Hubtel SMS API
        const url = `https://smsc.hubtel.com/v1/messages/send?clientid=${clientId}&clientsecret=${clientSecret}&from=${encodeURIComponent(senderId)}&to=${encodeURIComponent(phone)}&content=${encodeURIComponent(message)}`;

        const response = await fetch(url, {
            method: 'GET', // Hubtel's simple SMS API uses GET
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            console.error("Hubtel SMS Error:", data || response.statusText);
            return NextResponse.json({ error: 'Failed to send SMS via Hubtel', details: data }, { status: response.status });
        }

        return NextResponse.json({ success: true, message: 'Attendance SMS sent successfully', data });

    } catch (error: any) {
        console.error("Attendance SMS API Error:", error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
