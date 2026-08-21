import re
import sys

with open('src/app/admin/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update import
content = content.replace(
    ", updatePin } from '@/lib/data-store';",
    ", updatePin, allExpenditureCategories } from '@/lib/data-store';"
)

# 2. Update defaultExpenditureForm
content = content.replace(
    "const defaultExpenditureForm = { description: '', category: '', amount: '', date: new Date().toISOString().split('T')[0], type: 'General' as 'General' | 'Feeding' | 'Transportation' };",
    "const defaultExpenditureForm = { description: '', category: '', amount: '', date: new Date().toISOString().split('T')[0] };"
)

# 3. Remove old categories
old_cats_regex = re.compile(
    r"const generalExpenditureCategories = \[.*?\];.*?const transportationExpenditureCategories = \[.*?\];",
    re.DOTALL
)
content = old_cats_regex.sub("", content)

# 4. Update TabsContent
old_tabs_regex = re.compile(
    r"<TabsContent value=\"expenditures\" className=\"mt-6\">\s*<div className=\"space-y-6\">\s*<ExpenditureSection.*?/>\s*</div>\s*</TabsContent>",
    re.DOTALL
)

new_tabs = """<TabsContent value="expenditures" className="mt-6">
                                            <div className="space-y-6">
                                                <ExpenditureSection 
                                                    title="All Expenditures"
                                                    description="Track all school expenditures in one place. Enter a description and AI will suggest a category."
                                                    income={overallTotals.totalIncome || 0}
                                                    totalExpenditure={overallTotals.totalExpenditure || 0}
                                                    expenditures={expenditures}
                                                    categories={allExpenditureCategories}
                                                    onAddExpenditure={handleAddExpenditure}
                                                    onDeleteExpenditure={handleDeleteExpenditure}
                                                    isSubmitting={isSubmitting}
                                                />
                                            </div>
                                        </TabsContent>"""

content = old_tabs_regex.sub(new_tabs, content)


# 5. Update ExpenditureSection Component
old_exp_sec_regex = re.compile(
    r"interface ExpenditureSectionProps \{.*?export default function AdminDashboardPage",
    re.DOTALL
)

new_exp_sec = """interface ExpenditureSectionProps {
    title: string;
    description: string;
    income: number;
    totalExpenditure: number;
    expenditures: Expenditure[];
    categories: string[];
    onAddExpenditure: (form: typeof defaultExpenditureForm) => Promise<void>;
    onDeleteExpenditure: (exp: Expenditure) => void;
    isSubmitting: boolean;
}

const ExpenditureSection: React.FC<ExpenditureSectionProps> = ({
    title,
    description,
    income,
    totalExpenditure,
    expenditures,
    categories,
    onAddExpenditure,
    onDeleteExpenditure,
    isSubmitting,
}) => {
    const [localForm, setLocalForm] = useState({ ...defaultExpenditureForm });
    const [isCategorizing, setIsCategorizing] = useState(false);
    const [aiSuggested, setAiSuggested] = useState(false);
    const net = income - totalExpenditure;
    
    // Auto categorize when description blurs
    const handleBlurDescription = async () => {
        if (!localForm.description || localForm.description.length < 3) return;
        
        setIsCategorizing(true);
        setAiSuggested(false);
        try {
            const res = await fetch('/api/ai/categorize-expenditure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: localForm.description })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.category && data.category !== 'Other') {
                    setLocalForm(prev => ({ ...prev, category: data.category }));
                    setAiSuggested(true);
                }
            }
        } catch (error) {
            console.error("Failed to auto-categorize:", error);
        } finally {
            setIsCategorizing(false);
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onAddExpenditure(localForm);
        setLocalForm({ ...defaultExpenditureForm });
        setAiSuggested(false);
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-heading-md">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Card className="bg-muted/30">
                    <CardHeader><CardTitle className="text-heading-md font-sans">Financial Snapshot</CardTitle></CardHeader>
                    <CardContent>
                         <div className="grid grid-cols-3 gap-4 text-center">
                            <div><p className="text-sm text-muted-foreground font-sans font-medium">Total Income</p><p className="text-xl font-bold text-success text-numeric">GH¢{(income || 0).toFixed(2)}</p></div>
                            <div><p className="text-sm text-muted-foreground font-sans font-medium">Total Expenditure</p><p className="text-xl font-bold text-destructive text-numeric">GH¢{(totalExpenditure || 0).toFixed(2)}</p></div>
                            <div><p className="text-sm text-muted-foreground font-sans font-medium">Net</p><p className={`text-xl font-bold ${net >= 0 ? 'text-success' : 'text-destructive'} text-numeric`}>GH¢{(net || 0).toFixed(2)}</p></div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader><CardTitle className="text-heading-md">Record New Expenditure</CardTitle></CardHeader>
                        <form onSubmit={handleFormSubmit}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Input 
                                        placeholder="e.g. Purchase of new textbooks" 
                                        value={localForm.description} 
                                        onChange={e => setLocalForm({...localForm, description: e.target.value})} 
                                        onBlur={handleBlurDescription}
                                        required 
                                        disabled={isSubmitting}
                                    />
                                    {isCategorizing && <p className="text-xs text-muted-foreground animate-pulse flex items-center gap-1"><Sparkles className="w-3 h-3"/> AI is categorizing...</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label>Amount (GH¢)</Label><Input type="number" placeholder="0.00" value={localForm.amount} onChange={e => setLocalForm({...localForm, amount: e.target.value})} required disabled={isSubmitting}/></div>
                                    <div className="space-y-2"><Label>Date</Label><DatePicker value={localForm.date} onChange={val => setLocalForm({...localForm, date: val})} disabled={isSubmitting}/></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Category</Label>
                                        {aiSuggested && <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Sparkles className="w-3 h-3"/> AI Suggested</span>}
                                    </div>
                                    <Select value={localForm.category} onValueChange={(value) => { setLocalForm({...localForm, category: value}); setAiSuggested(false); }} required disabled={isSubmitting}>
                                        <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                                        <SelectContent>{categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                            <DialogFooter className="px-6 pb-6"><Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="animate-spin" /> Recording...</> : 'Record Expenditure'}</Button></DialogFooter>
                        </form>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="text-heading-md">Expenditure History</CardTitle></CardHeader>
                        <CardContent>
                            {expenditures.length === 0 ? <EmptyState title="No Expenditures" description="Records added will display here." /> : (
                                <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Details</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {expenditures.map(exp => (
                                            <TableRow key={exp.id}>
                                                <TableCell><div className="font-medium">{exp.description}</div><div className="text-xs text-muted-foreground">{exp.category} &bull; {new Date(exp.date).toLocaleDateString('en-GB')}</div></TableCell>
                                                <TableCell className="text-right text-numeric">GH¢{Number(exp.amount).toFixed(2)}</TableCell>
                                                <TableCell className="text-right"><Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => onDeleteExpenditure(exp)} disabled={isSubmitting}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>

    );
};

export default function AdminDashboardPage"""

content = old_exp_sec_regex.sub(new_exp_sec, content)


with open('src/app/admin/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated page.tsx successfully.")
