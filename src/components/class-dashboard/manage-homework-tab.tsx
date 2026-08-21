import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, PlusCircle, BookCopy, Trash2 } from 'lucide-react';
import { Homework } from '@/lib/data-store';

interface ManageHomeworkTabProps {
    homework: Homework[];
    isLoading: boolean;
    isSubmitting: boolean;
    homeworkForm: { title: string, description: string, dueDate: string };
    setHomeworkForm: (form: { title: string, description: string, dueDate: string }) => void;
    onAddHomework: (e: React.FormEvent) => void;
    onDeleteHomework: (hw: Homework) => void;
}

export function ManageHomeworkTab({ homework, isLoading, isSubmitting, homeworkForm, setHomeworkForm, onAddHomework, onDeleteHomework }: ManageHomeworkTabProps) {
    return (
        <div className="grid md:grid-cols-2 gap-8">
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Assign New Homework</CardTitle>
                    <CardDescription>Create a new homework assignment for your class.</CardDescription>
                </CardHeader>
                <form onSubmit={onAddHomework}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="hw-title">Title</Label>
                            <Input id="hw-title" placeholder="e.g. Mathematics Chapter 3" value={homeworkForm.title} onChange={e => setHomeworkForm({...homeworkForm, title: e.target.value})} required disabled={isSubmitting}/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="hw-desc">Description</Label>
                            <Textarea id="hw-desc" placeholder="e.g. Complete exercises 1 to 10 on page 45." value={homeworkForm.description} onChange={e => setHomeworkForm({...homeworkForm, description: e.target.value})} required disabled={isSubmitting} className="resize-none h-24"/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="hw-due">Due Date</Label>
                            <DatePicker id="hw-due" value={homeworkForm.dueDate} onChange={val => setHomeworkForm({...homeworkForm, dueDate: val})} disabled={isSubmitting}/>
                        </div>
                    </CardContent>
                    <div className="p-6 pt-0">
                        <Button type="submit" className="w-full transition-transform active:scale-[0.98]" disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Assigning...</> : <><PlusCircle className="mr-2 h-4 w-4" />Assign Homework</>}
                        </Button>
                    </div>
                </form>
            </Card>
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Assigned Homework</CardTitle>
                    <CardDescription>A list of homework you have assigned.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-40 w-full" /> :
                    homework.length === 0 ? (
                        <div className="text-center py-12 px-4 text-muted-foreground">
                            <BookCopy className="mx-auto h-12 w-12" />
                            <p className="mt-4">No homework assigned yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {homework.map(hw => (
                                <div key={hw.id} className="p-4 border border-border/50 rounded-lg grid grid-cols-[1fr_auto] gap-4 bg-muted/20 hover:bg-muted/40 transition-colors">
                                    <div>
                                        <p className="font-semibold">{hw.title}</p>
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{hw.description}</p>
                                        <p className="text-xs text-primary font-medium mt-2">Due by: {new Date(hw.dueDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                    </div>
                                    <div className="flex items-center">
                                         <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8 transition-colors" onClick={() => onDeleteHomework(hw)} disabled={isSubmitting}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
