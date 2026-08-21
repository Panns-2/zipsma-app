'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import { FinanceAnalyticsInput, FinanceAnalyticsOutput } from '@/ai/flows/admin-finance-analytics-flow';

interface FinanceAiInsightsTabProps {
    totalIncome: number;
    totalOutstanding: number;
    expendituresThisMonth: number;
    dailyFeesIncome: number;
    dailyFeesOutstanding: number;
    recentExpenditures: { category: string, amount: number }[];
    totalStudentsWithDebt: number;
}

export function FinanceAiInsightsTab(props: FinanceAiInsightsTabProps) {
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<FinanceAnalyticsOutput | null>(null);
    const [error, setError] = useState('');

    const generateReport = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/ai/finance-analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(props)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to generate report');
            
            setReport(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {!report && (
                <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100 overflow-hidden relative">
                    <div className="absolute -right-10 -top-10 opacity-10">
                        <Sparkles className="w-64 h-64 text-indigo-500" />
                    </div>
                    <CardHeader className="relative z-10">
                        <CardTitle className="text-2xl text-indigo-900 flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-indigo-600" /> AI Financial Analyst
                        </CardTitle>
                        <CardDescription className="text-indigo-700 max-w-lg">
                            Get an intelligent, narrative breakdown of your school's financial health, complete with actionable insights for debt recovery and expenditure management.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <Button 
                            onClick={generateReport} 
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 px-8 rounded-xl shadow-md transition-all hover:scale-[1.02]"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                    Analyzing Data...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Generate AI Report
                                </span>
                            )}
                        </Button>
                        {error && <p className="text-destructive mt-4 font-medium">{error}</p>}
                    </CardContent>
                </Card>
            )}

            {report && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-black font-sans text-indigo-950 flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-indigo-600" /> Financial Intelligence Report
                        </h2>
                        <Button variant="outline" size="sm" onClick={generateReport} disabled={loading}>
                            {loading ? 'Refreshing...' : 'Refresh Analysis'}
                        </Button>
                    </div>

                    <Card className="border-l-4 border-l-blue-500 shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
                                <TrendingUp className="w-5 h-5 text-blue-500" /> Executive Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground leading-relaxed">
                                {report.healthSummary}
                            </p>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-t-4 border-t-emerald-500 shadow-md">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2 text-emerald-900">
                                    <Lightbulb className="w-5 h-5 text-emerald-500" /> Actionable Insights
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {report.actionableInsights.map((insight, idx) => (
                                        <li key={idx} className="flex gap-3 items-start">
                                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                                                {idx + 1}
                                            </div>
                                            <span className="text-sm text-slate-700 leading-tight">{insight}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className="border-t-4 border-t-amber-500 shadow-md">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2 text-amber-900">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" /> Risk Warnings
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {report.warnings.map((warning, idx) => (
                                        <li key={idx} className="flex gap-3 items-start">
                                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                            <span className="text-sm text-slate-700 leading-tight">{warning}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
