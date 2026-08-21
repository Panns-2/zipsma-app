'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useAuth } from '@/firebase/client-provider';
import { Expenditure, Budget, BudgetCategory, getBudgetForPeriod, saveBudget } from '@/lib/data-store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';
import { PlusCircle, Trash2, Save, Wallet } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { allExpenditureCategories } from '@/lib/constants';

interface BudgetingTabProps {
    schoolId: string;
    periodId: string;
    expenditures: Expenditure[];
}

export function BudgetingTab({ schoolId, periodId, expenditures }: BudgetingTabProps) {
    const { toast } = useToast();
    const { db, auth } = useFirebase();
    const { user } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [budget, setBudget] = useState<Budget | null>(null);
    const [categories, setCategories] = useState<BudgetCategory[]>([]);
    const [totalIncomeExpected, setTotalIncomeExpected] = useState<number>(0);

    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryAmount, setNewCategoryAmount] = useState('');

    useEffect(() => {
        const fetchBudget = async () => {
            if (!db || !schoolId || !periodId) return;
            setLoading(true);
            try {
                const b = await getBudgetForPeriod(db, schoolId, periodId);
                if (b) {
                    setBudget(b);
                    setCategories(b.categories || []);
                    setTotalIncomeExpected(b.totalIncomeExpected || 0);
                } else {
                    setBudget(null);
                    setCategories([]);
                    setTotalIncomeExpected(0);
                }
            } catch (error: any) {
                toast({ title: 'Error fetching budget', description: error.message, variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        };
        fetchBudget();
    }, [db, schoolId, periodId, toast]);

    const handleAddCategory = () => {
        if (!newCategoryName.trim() || !newCategoryAmount) {
            toast({ title: 'Validation Error', description: 'Please provide both a category name and an amount.', variant: 'destructive' });
            return;
        }
        const amount = parseFloat(newCategoryAmount);
        if (isNaN(amount) || amount < 0) {
            toast({ title: 'Validation Error', description: 'Please provide a valid positive amount.', variant: 'destructive' });
            return;
        }

        const newCat: BudgetCategory = {
            id: newCategoryName.toLowerCase().replace(/\s+/g, '-'),
            name: newCategoryName,
            allocatedAmount: amount
        };

        setCategories(prev => {
            const existingIndex = prev.findIndex(c => c.name.toLowerCase() === newCat.name.toLowerCase());
            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex].allocatedAmount += amount;
                return updated;
            }
            return [...prev, newCat];
        });
        setNewCategoryName('');
        setNewCategoryAmount('');
    };

    const handleRemoveCategory = (name: string) => {
        setCategories(prev => prev.filter(c => c.name !== name));
    };

    const handleSaveBudget = async () => {
        if (!db || !auth || !schoolId || !periodId) return;
        setSaving(true);
        try {
            const budgetData: Omit<Budget, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'> = {
                periodId,
                categories,
                totalIncomeExpected: Number(totalIncomeExpected)
            };
            await saveBudget(db, auth, schoolId, budgetData);
            toast({ title: 'Success', description: 'Budget saved successfully.' });
        } catch (error: any) {
            toast({ title: 'Error saving budget', description: error.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const budgetAnalysisData = useMemo(() => {
        const spentMap: Record<string, number> = {};
        expenditures.forEach(exp => {
            if (exp.periodId === periodId) {
                spentMap[exp.category] = (spentMap[exp.category] || 0) + Number(exp.amount);
            }
        });

        const data = categories.map(cat => ({
            name: cat.name,
            Allocated: cat.allocatedAmount,
            Spent: spentMap[cat.name] || spentMap[cat.id] || 0
        }));

        // Add expenditures that don't have a budget category
        Object.keys(spentMap).forEach(catName => {
            if (!categories.some(c => c.name === catName || c.id === catName)) {
                data.push({
                    name: catName,
                    Allocated: 0,
                    Spent: spentMap[catName]
                });
            }
        });

        return data;
    }, [categories, expenditures, periodId]);

    const totalAllocated = useMemo(() => categories.reduce((sum, cat) => sum + cat.allocatedAmount, 0), [categories]);
    const totalSpent = useMemo(() => budgetAnalysisData.reduce((sum, d) => sum + d.Spent, 0), [budgetAnalysisData]);

    if (loading) {
        return <div className="p-8 text-center"><div className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin mx-auto mb-4" />Loading budget data...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-blue-900 flex items-center gap-2"><Wallet className="w-5 h-5 text-blue-600" /> Total Allocated</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-black text-blue-700">GHS {totalAllocated.toFixed(2)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-rose-50 to-red-50 border-rose-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-rose-900 flex items-center gap-2"><Wallet className="w-5 h-5 text-rose-600" /> Total Spent</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-black text-rose-700">GHS {totalSpent.toFixed(2)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-emerald-900 flex items-center gap-2"><Wallet className="w-5 h-5 text-emerald-600" /> Expected Income</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-black text-emerald-700">GHS {Number(totalIncomeExpected).toFixed(2)}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 border-indigo-100 shadow-md">
                    <CardHeader className="bg-indigo-50/50 border-b border-indigo-100">
                        <CardTitle className="text-indigo-900">Manage Allocations</CardTitle>
                        <CardDescription>Set budget limits for the current period.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-6">
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="expectedIncome" className="text-indigo-900 font-semibold">Total Expected Income (GHS)</Label>
                                <Input 
                                    id="expectedIncome" 
                                    type="number" 
                                    value={totalIncomeExpected} 
                                    onChange={(e) => setTotalIncomeExpected(Number(e.target.value))} 
                                    className="mt-1 border-indigo-200 focus-visible:ring-indigo-500 font-medium"
                                />
                            </div>
                            <hr className="border-indigo-100" />
                            <h3 className="font-semibold text-indigo-900">Add Allocation</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1 col-span-2">
                                    <Label>Category</Label>
                                    <Select value={newCategoryName} onValueChange={setNewCategoryName}>
                                        <SelectTrigger className="border-indigo-200">
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allExpenditureCategories.map(cat => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <Label>Amount (GHS)</Label>
                                    <Input 
                                        type="number" 
                                        placeholder="0.00" 
                                        value={newCategoryAmount} 
                                        onChange={(e) => setNewCategoryAmount(e.target.value)} 
                                        className="border-indigo-200 focus-visible:ring-indigo-500"
                                    />
                                </div>
                                <Button onClick={handleAddCategory} className="col-span-2 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold w-full">
                                    <PlusCircle className="w-4 h-4 mr-2" /> Add to Budget
                                </Button>
                            </div>
                        </div>

                        {categories.length > 0 && (
                            <div className="space-y-2 mt-6">
                                <h3 className="font-semibold text-indigo-900">Current Allocations</h3>
                                <div className="bg-indigo-50/50 rounded-lg p-2 space-y-2 border border-indigo-100 max-h-[300px] overflow-y-auto">
                                    {categories.map((cat, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-indigo-50 shadow-sm">
                                            <span className="font-medium text-slate-700">{cat.name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-indigo-700">GHS {cat.allocatedAmount.toFixed(2)}</span>
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveCategory(cat.name)} className="h-6 w-6 text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <Button 
                            onClick={handleSaveBudget} 
                            disabled={saving}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md mt-4"
                        >
                            {saving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Budget</>}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 shadow-md">
                    <CardHeader className="bg-slate-50/50 border-b">
                        <CardTitle className="text-slate-800">Budget vs Actual Spending</CardTitle>
                        <CardDescription>Compare allocated budgets with actual expenditures.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        {budgetAnalysisData.length > 0 ? (
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={budgetAnalysisData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#64748B', fontSize: 12 }} 
                                            angle={-45} 
                                            textAnchor="end"
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#64748B', fontSize: 12 }}
                                            tickFormatter={(value) => `GHS ${value}`}
                                        />
                                        <ChartTooltip 
                                            cursor={{ fill: '#F1F5F9' }} 
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: number) => [`GHS ${value.toFixed(2)}`, undefined]}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Bar dataKey="Allocated" fill="#818CF8" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                        <Bar dataKey="Spent" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[400px] flex items-center justify-center text-slate-400 flex-col gap-3">
                                <Wallet className="w-12 h-12 text-slate-300" />
                                <p>No budget data to display for this period.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
