import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import nodeFetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

export async function POST(req: Request) {
    try {
        const { schoolId, studentId, amount, momoNumber, channel, feeType, description, periodId, isBulk, parentId, bulkDistribution } = await req.json();

        if (!schoolId || !amount || !momoNumber || !channel) {
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
            studentId: studentId || (isBulk ? parentId : ''),
            amount: Number(amount),
            periodId: periodId || 'U',
            description: description || 'Smart Payment Mobile Money Request',
            feeType: feeType || 'main', // 'daily' | 'main' | 'mixed'
            status: 'pending',
            createdAt: new Date().toISOString(),
            momoNumber,
            channel,
            paymentMethod: 'stk-push'
        };

        if (isBulk && bulkDistribution) {
            pendingData.isBulk = true;
            pendingData.parentId = parentId;
            pendingData.bulkDistribution = bulkDistribution;
        }

        await db.collection('pending_payments').doc(clientReference).set(pendingData);

        // 4. Prepare Hubtel Request
        const host = req.headers.get('host') || '';
        const protocol = (host.includes('localhost') || host.includes('127.0.0.1')) ? 'http' : 'https';
        const cleanBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`).replace(/\/$/, '');
        
        let callbackUrl = `${cleanBaseUrl}/api/hubtel?payRef=${clientReference}`;
        
        // Hubtel's legacy receive money API crashes (returns 520) if the callbackUrl is localhost or unresolvable
        if (callbackUrl.includes('localhost') || callbackUrl.includes('127.0.0.1')) {
            callbackUrl = `https://webhook.site/dummy-hubtel-webhook?payRef=${clientReference}`;
        }

        const payload = {
            CustomerName: 'Parent',
            CustomerMsisdn: momoNumber,
            CustomerEmail: `${schoolId.toLowerCase()}@noemail.com`,
            Channel: channel,
            Amount: Number(amount),
            PrimaryCallbackUrl: callbackUrl,
            Description: (description || 'Fee Payment').substring(0, 100),
            ClientReference: clientReference
        };

        // 5. Call Hubtel API (Mocked in development due to Hubtel IP whitelisting / Cloudflare 520 errors)
        const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
        
        let result;
        if (isLocal) {
            console.log('Local environment detected: Mocking Hubtel STK Push API Response...');
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            result = {
                ResponseCode: '0000',
                Status: 'Success',
                Message: 'Mock payment prompt sent successfully',
                Data: { TransactionId: `MOCK-${clientReference}` }
            };
        } else {
            const authHeader = 'Basic ' + Buffer.from(`${hubtelPaymentClientId.trim()}:${hubtelPaymentClientSecret.trim()}`).toString('base64');
            
            console.log(`Calling Hubtel Receive Mobile Money API for ${clientReference}...`);
            
            const proxyUrl = process.env.HUBTEL_PROXY_URL || 'http://fixie:KqCpeb3INLXBllq@criterium.usefixie.com:80';
            const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
            
            const response = await nodeFetch(`https://api.hubtel.com/v1/merchantaccount/merchants/${hubtelMerchantNumber.trim()}/receive/mobilemoney`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'ZipSMA/1.0',
                    'Authorization': authHeader
                },
                body: JSON.stringify(payload),
                agent: agent
            });

            const responseText = await response.text();
            console.log('Hubtel Receive Money API Response:', responseText);

            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse Hubtel JSON:', responseText);
                return NextResponse.json({ 
                    error: 'Invalid response from Hubtel', 
                    status: response.status 
                }, { status: 500 });
            }
        }

        if (result.ResponseCode === '0000' || result.Status === 'Success') {
            return NextResponse.json({ 
                success: true,
                message: 'Payment prompt sent successfully. Waiting for parent to authorize.',
                clientReference: clientReference,
                transactionId: result.Data?.TransactionId
            });
        } else {
            console.error('Hubtel API Error Detail:', result);
            return NextResponse.json({ 
                error: result.Message || 'Failed to send mobile money prompt',
                detail: result 
            }, { status: 400 });
        }

    } catch (error: any) {
        console.error('STK Push initiation error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
