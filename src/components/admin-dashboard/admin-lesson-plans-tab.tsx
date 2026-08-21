'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useAuth } from '@/firebase/client-provider';
import { getLessonPlans, updateLessonPlan, LessonPlanRecord } from '@/lib/data-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BookOpen, Clock, CheckCircle, XCircle, Search, Filter } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AdminLessonPlansTabProps {
    schoolId: string;
}

export default function AdminLessonPlansTab({ schoolId }: AdminLessonPlansTabProps) {
    const { db, auth } = useFirebase();
    const { toast } = useToast();
    
    const [plans, setPlans] = useState<LessonPlanRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Filtering
    const [statusFilter, setStatusFilter] = useState<string>('Submitted');
    
    // Form State
    const [currentPlan, setCurrentPlan] = useState<LessonPlanRecord | null>(null);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        if (db && schoolId) {
            fetchPlans();
        }
    }, [db, schoolId]);

    const fetchPlans = async () => {
        setIsLoading(true);
        try {
            const fetchedPlans = await getLessonPlans(db, schoolId);
            setPlans(fetchedPlans);
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to fetch lesson plans.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleView = (plan: LessonPlanRecord) => {
        setCurrentPlan(plan);
        setFeedback(plan.feedback || '');
        setIsModalOpen(true);
    };

    const handleReview = async (status: 'Approved' | 'Needs Revision') => {
        if (!currentPlan) return;
        
        if (status === 'Needs Revision' && !feedback.trim()) {
            toast({ title: 'Feedback required', description: 'Please provide feedback explaining why a revision is needed.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            await updateLessonPlan(db, auth, currentPlan.id, {
                status,
                feedback: feedback.trim()
            });
            toast({ title: 'Success', description: `Lesson plan marked as ${status}.` });
            setIsModalOpen(false);
            fetchPlans();
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to update lesson plan.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredPlans = plans.filter(p => {
        if (statusFilter === 'All') return true;
        return p.status === statusFilter;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Draft': return 'bg-slate-500';
            case 'Submitted': return 'bg-amber-500';
            case 'Approved': return 'bg-emerald-500';
            case 'Needs Revision': return 'bg-rose-500';
            default: return 'bg-slate-500';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-primary">Lesson Plans Review</h2>
                    <p className="text-muted-foreground text-sm">Review, approve, and provide feedback on teacher lesson plans.</p>
                </div>
                
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border shadow-sm">
                    <Filter className="w-4 h-4 text-muted-foreground ml-2" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px] border-0 focus:ring-0 shadow-none h-8">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Plans</SelectItem>
                            <SelectItem value="Submitted">Needs Review</SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="Needs Revision">Needs Revision</SelectItem>
                            <SelectItem value="Draft">Drafts (Hidden)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary/50" /></div>
            ) : filteredPlans.length === 0 ? (
                <Card className="border-dashed border-2 bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <CheckCircle className="h-12 w-12 text-emerald-500/50 mb-4" />
                        <h3 className="text-xl font-bold text-primary/70 mb-2">All caught up!</h3>
                        <p className="text-muted-foreground text-center max-w-md">
                            There are no lesson plans matching the "{statusFilter}" filter right now.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPlans.map(plan => (
                        <Card key={plan.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-all border-primary/10">
                            <div className={`h-2 w-full ${getStatusColor(plan.status)}`} />
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="outline" className={`${getStatusColor(plan.status)} text-white border-0`}>
                                        {plan.status}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground flex items-center">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {plan.lastUpdated?.toLocaleDateString()}
                                    </span>
                                </div>
                                <CardTitle className="text-lg line-clamp-1">{plan.topic}</CardTitle>
                                <CardDescription className="font-semibold text-primary/80 flex justify-between">
                                    <span>{plan.subject}</span>
                                    <span className="text-xs font-normal text-muted-foreground">{plan.className}</span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 pb-4">
                                <div className="text-sm font-medium mb-2 text-primary">By: {plan.staffName}</div>
                                <div className="text-sm text-muted-foreground line-clamp-3 bg-muted/30 p-3 rounded-lg border">
                                    {plan.content.substring(0, 150)}{plan.content.length > 150 ? '...' : ''}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0 border-t border-primary/5 p-4 bg-muted/10">
                                <Button 
                                    className="w-full shadow-sm"
                                    onClick={() => handleView(plan)}
                                >
                                    Review Plan
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* Review Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="px-6 py-4 border-b bg-muted/30 flex-shrink-0">
                        <div className="flex justify-between items-start">
                            <div>
                                <DialogTitle className="text-xl flex items-center gap-2 text-primary mb-1">
                                    <BookOpen className="w-5 h-5" />
                                    Review Lesson Plan
                                </DialogTitle>
                                <DialogDescription>
                                    Submitted by <span className="font-semibold text-primary/80">{currentPlan?.staffName}</span> for <span className="font-semibold text-primary/80">{currentPlan?.className}</span>
                                </DialogDescription>
                            </div>
                            {currentPlan?.status && (
                                <Badge variant="outline" className={`${getStatusColor(currentPlan.status)} text-white border-0`}>
                                    Status: {currentPlan.status}
                                </Badge>
                            )}
                        </div>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col md:flex-row gap-6">
                        {/* Plan Details (Left Side) */}
                        <div className="flex-1 space-y-6 md:border-r pr-0 md:pr-6 md:overflow-y-auto pb-4">
                            <div className="grid grid-cols-2 gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
                                <div>
                                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Subject</div>
                                    <div className="font-medium">{currentPlan?.subject}</div>
                                </div>
                                <div>
                                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Topic</div>
                                    <div className="font-medium">{currentPlan?.topic}</div>
                                </div>
                            </div>
                            
                            <div>
                                <div className="text-sm font-bold text-primary mb-3">Lesson Content</div>
                                <div className="bg-white border rounded-xl p-5 text-sm whitespace-pre-wrap shadow-inner font-mono leading-relaxed min-h-[300px]">
                                    {currentPlan?.content}
                                </div>
                            </div>
                        </div>
                        
                        {/* Review Action (Right Side) */}
                        <div className="w-full md:w-1/3 flex flex-col gap-4">
                            <div className="bg-muted/30 p-4 rounded-xl border flex-1 flex flex-col">
                                <Label htmlFor="feedback" className="font-bold text-primary mb-2">Provide Feedback (Required for revisions)</Label>
                                <Textarea 
                                    id="feedback" 
                                    placeholder="Great job on this plan! / Please add more details to the assessment section..." 
                                    className="flex-1 resize-none bg-white shadow-sm"
                                    value={feedback}
                                    onChange={e => setFeedback(e.target.value)}
                                />
                                
                                <div className="mt-4 flex flex-col gap-3">
                                    <Button 
                                        variant="default"
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-md"
                                        onClick={() => handleReview('Approved')}
                                        disabled={isSubmitting || currentPlan?.status === 'Approved'}
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-2" /> Approve Plan</>}
                                    </Button>
                                    
                                    <Button 
                                        variant="outline"
                                        className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                                        onClick={() => handleReview('Needs Revision')}
                                        disabled={isSubmitting || currentPlan?.status === 'Needs Revision'}
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 mr-2" /> Request Revision</>}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
