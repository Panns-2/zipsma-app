import { NextRequest, NextResponse } from 'next/server';
import { generateFinanceReport } from '@/ai/flows/admin-finance-analytics-flow';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            totalIncome,
            totalOutstanding,
            expendituresThisMonth,
            dailyFeesIncome,
            dailyFeesOutstanding,
            recentExpenditures,
            totalStudentsWithDebt
        } = body;

        if (
            totalIncome === undefined ||
            totalOutstanding === undefined ||
            expendituresThisMonth === undefined ||
            dailyFeesIncome === undefined ||
            dailyFeesOutstanding === undefined ||
            totalStudentsWithDebt === undefined
        ) {
            return NextResponse.json({ error: 'Missing required financial data' }, { status: 400 });
        }

        const report = await generateFinanceReport({
            totalIncome,
            totalOutstanding,
            expendituresThisMonth,
            dailyFeesIncome,
            dailyFeesOutstanding,
            recentExpenditures: recentExpenditures || [],
            totalStudentsWithDebt
        });

        return NextResponse.json(report);

    } catch (error: any) {
        console.error('Error generating finance report:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate report' }, { status: 500 });
    }
}
