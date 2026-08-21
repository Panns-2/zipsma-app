import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const { schoolId, studentId, amount, email, studentName, description, periodId, feeType, isBulk, parentId, bulkDistribution } = await req.json();

        if (!schoolId || !studentId || !amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = getAdminDb();
        
        // 1. Fetch school's Hubtel credentials from Firestore
        const schoolDoc = await db.collection('schools').doc(schoolId.toUpperCase()).get();

        if (!schoolDoc.exists) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        const schoolData = schoolDoc.data();
        const { hubtelMerchantNumber, hubtelPaymentClientId, hubtelPaymentClientSecret } = schoolData || {};

        if (!hubtelMerchantNumber || !hubtelPaymentClientId || !hubtelPaymentClientSecret) {
            return NextResponse.json({ error: 'Hubtel Payment Gateway is not configured for this school. Please update settings in the Admin Dashboard.' }, { status: 400 });
        }

        // 2. Generate a clean Payment Reference (Anonymized)
        // Hubtel ClientReference must be <= 32 chars.
        const randomStr = Math.random().toString(36).substring(2, 10).toUpperCase();
        const clientReference = `PAY-${randomStr}`;

        // 3. Store the mapping in a pending_payments collection
        const pendingData: any = {
            schoolId,
            studentId,
            studentName,
            amount: Number(amount),
            periodId: periodId || 'U',
            description: description || 'School Fee Payment',
            feeType: feeType || 'main', // 'daily' | 'main' | 'mixed'
            status: 'pending',
            createdAt: new Date().toISOString(),
            email: email || `${studentId}@noemail.com`
        };

        if (isBulk && bulkDistribution) {
            pendingData.isBulk = true;
            pendingData.parentId = parentId;
            pendingData.bulkDistribution = bulkDistribution;
        }

        await db.collection('pending_payments').doc(clientReference).set(pendingData);

        // 4. Prepare Hubtel Invoice request
        const host = req.headers.get('host') || '';
        const protocol = (host.includes('localhost') || host.includes('127.0.0.1')) ? 'http' : 'https';
        const cleanBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`).replace(/\/$/, '');
        
        // We now only send the payRef in the callback, keeping the studentId private
        const callbackUrl = `${cleanBaseUrl}/api/hubtel?payRef=${clientReference}`;
        const returnUrl = `${cleanBaseUrl}/parent/dashboard?payment=success&ref=${clientReference}`;
        const cancellationUrl = `${cleanBaseUrl}/parent/dashboard?payment=cancelled`;

        const payload = {
            totalAmount: Number(amount),
            title: `Fee Payment - ${studentName}`,
            description: description || 'School Fee Payment',
            callbackUrl,
            returnUrl,
            cancellationUrl,
            merchantAccountNumber: hubtelMerchantNumber,
            clientReference,
            payeeName: studentName,
            payeeEmail: email || `${studentId}@noemail.com`,
            // Using PaymentChannels for PayProxy compatibility
            PaymentChannels: 'mobilemoney,card,bankaccount',
            items: [
                {
                    name: (isBulk ? 'Family Bulk Fees' : `Fee - ${studentName}`).substring(0, 30),
                    quantity: 1,
                    unitPrice: Number(amount),
                    totalPrice: Number(amount),
                    description: (description || `Payment for ${studentName}`).substring(0, 100)
                }
            ]
        };

        // 3. Call Hubtel API
        // 3. Initiate payment request to Hubtel
        const authHeader = 'Basic ' + Buffer.from(`${hubtelPaymentClientId.trim()}:${hubtelPaymentClientSecret.trim()}`).toString('base64');
        
        console.log('Calling Hubtel PayProxy API (Reverted)...');
        const response = await fetch(`https://payproxyapi.hubtel.com/items/initiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        console.log('Hubtel API Raw Response:', responseText);

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse Hubtel JSON:', responseText);
            return NextResponse.json({ 
                error: 'Invalid response from Hubtel', 
                status: response.status 
            }, { status: 500 });
        }

        if (result.status === 'Success' || result.responseCode === '0000') {
            const checkoutUrl = result.data.checkoutUrl || result.data.checkoutDirectUrl;
            
            return NextResponse.json({ 
                checkoutUrl: checkoutUrl,
                transactionId: result.data.checkoutId || result.data.transactionId,
                clientReference: clientReference
            });
        } else {
            console.error('Hubtel API Error Detail:', result);
            return NextResponse.json({ 
                error: result.message || result.errors?.[0]?.message || 'Hubtel initiation failed',
                detail: result 
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Checkout initiation error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
