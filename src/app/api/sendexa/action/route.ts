import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    return handleActionRequest(request);
}

export async function POST(request: Request) {
    return handleActionRequest(request);
}

import { getAdminDb } from '@/lib/firebase-admin';

async function handleActionRequest(request: Request) {
    const { searchParams } = new URL(request.url);
    const message = searchParams.get('message') || 'No message provided.';
    const lang = searchParams.get('lang') || 'en-US'; // Changed to en-US for safety

    // Log to Firestore to prove Sendexa actually called our Webhook
    try {
        const db = getAdminDb();
        await db.collection('cron_logs').add({
            timestamp: new Date().toISOString(),
            type: 'webhook_triggered',
            schoolId: 'global',
            details: `Sendexa hit actionUrl with message: ${message}`
        });
    } catch (e) {
        console.error("Failed to log webhook", e);
    }

    // The Sendexa instruction payload required to play Text-to-Speech
    const instructions = [
        {
            action: 'Say',
            text: message,
            voice: 'female',
            language: lang
        }
    ];

    return NextResponse.json(instructions);
}
