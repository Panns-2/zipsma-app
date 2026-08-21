import { NextRequest, NextResponse } from 'next/server';
import { categorizeExpenditureFlow } from '@/ai/flows/categorize-expenditure-flow';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { description } = body;

        if (!description) {
            return NextResponse.json({ error: 'Missing description' }, { status: 400 });
        }

        const report = await categorizeExpenditureFlow({ description });

        return NextResponse.json(report);

    } catch (error: any) {
        console.error('Error categorizing expenditure:', error);
        return NextResponse.json({ error: error.message || 'Failed to categorize expenditure' }, { status: 500 });
    }
}
