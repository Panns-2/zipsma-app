'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useAuth } from '@/firebase/client-provider';
import { getLessonPlans, addLessonPlan, updateLessonPlan, deleteLessonPlan, LessonPlanRecord, StaffId } from '@/lib/data-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit, Trash2, BookOpen, Clock, FileText, FileCheck2, Send, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

import { doc, getDoc } from 'firebase/firestore';

interface StaffLessonPlansTabProps {
    staffId: string;
    schoolId: string;
    className: string;
}

export default function StaffLessonPlansTab({ staffId, schoolId, className }: StaffLessonPlansTabProps) {
    const { db, auth } = useFirebase();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [plans, setPlans] = useState<LessonPlanRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [currentPlan, setCurrentPlan] = useState<Partial<LessonPlanRecord> | null>(null);

    useEffect(() => {
        if (db && schoolId && staffId) {
            fetchPlans();
        }
    }, [db, schoolId, staffId]);

    const fetchPlans = async () => {
        setIsLoading(true);
        try {
            const fetchedPlans = await getLessonPlans(db, schoolId, staffId);
            setPlans(fetchedPlans);
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to fetch lesson plans.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateNew = () => {
        setCurrentPlan({
            subject: '',
            topic: '',
            content: '',
            status: 'Draft'
        });
        setIsModalOpen(true);
    };

    const handleEdit = (plan: LessonPlanRecord) => {
        setCurrentPlan(plan);
        setIsModalOpen(true);
    };

    const handleSave = async (submitForReview: boolean) => {
        if (!currentPlan?.subject || !currentPlan?.topic || !currentPlan?.content) {
            toast({ title: 'Missing fields', description: 'Subject, topic, and content are required.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const planStatus = submitForReview ? 'Submitted' : 'Draft';
            
            if (currentPlan.id) {
                // Update
                await updateLessonPlan(db, auth, currentPlan.id, {
                    subject: currentPlan.subject,
                    topic: currentPlan.topic,
                    content: currentPlan.content,
                    status: planStatus
                });
                toast({ title: 'Success', description: submitForReview ? 'Lesson plan submitted for review.' : 'Draft saved successfully.' });
            } else {
                // Create
                let staffName = 'Teacher';
                try {
                    const staffDoc = await getDoc(doc(db, 'staff', staffId));
                    if (staffDoc.exists()) {
                        const data = staffDoc.data();
                        staffName = data.fullName || data.firstName || 'Teacher';
                    }
                } catch (e) {
                    console.error("Could not fetch staff name", e);
                }
                
                await addLessonPlan(db, auth, schoolId, {
                    staffId: staffId,
                    staffName: staffName,
                    className: className || 'General',
                    week: currentPlan.week || 'Week 1',
                    subject: currentPlan.subject || '',
                    topic: currentPlan.topic || '',
                    content: currentPlan.content || '',
                    status: planStatus
                });
                toast({ title: 'Success', description: submitForReview ? 'Lesson plan submitted for review.' : 'Draft saved successfully.' });
            }
            
            setIsModalOpen(false);
            fetchPlans();
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to save lesson plan.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (planId: string) => {
        if (!confirm('Are you sure you want to delete this lesson plan?')) return;
        
        try {
            await deleteLessonPlan(db, auth, planId);
            toast({ title: 'Success', description: 'Lesson plan deleted.' });
            fetchPlans();
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to delete lesson plan.', variant: 'destructive' });
        }
    };
    
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
                    <h2 className="text-2xl font-bold tracking-tight text-primary">Lesson Plans</h2>
                    <p className="text-muted-foreground text-sm">Write, submit, and track your lesson plans digitally.</p>
                </div>
                <Button onClick={handleCreateNew} className="shadow-lg hover:shadow-xl transition-all">
                    <Plus className="mr-2 h-4 w-4" /> New Lesson Plan
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary/50" /></div>
            ) : plans.length === 0 ? (
                <Card className="border-dashed border-2 bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <BookOpen className="h-12 w-12 text-primary/30 mb-4" />
                        <h3 className="text-xl font-bold text-primary/70 mb-2">No lesson plans yet</h3>
                        <p className="text-muted-foreground text-center max-w-md mb-6">
                            Start creating your first digital lesson plan. You can save it as a draft or submit it for review.
                        </p>
                        <Button onClick={handleCreateNew} variant="outline" className="border-primary/20 hover:bg-primary/5">
                            <Plus className="mr-2 h-4 w-4" /> Create Lesson Plan
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map(plan => (
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
                                <CardDescription className="font-semibold text-primary/80">{plan.subject}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 pb-4">
                                <div className="text-sm text-muted-foreground line-clamp-3 bg-muted/30 p-3 rounded-lg border">
                                    {plan.content.substring(0, 150)}{plan.content.length > 150 ? '...' : ''}
                                </div>
                                
                                {plan.feedback && (
                                    <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                        <div className="flex items-center gap-1.5 text-amber-700 font-semibold text-xs mb-1">
                                            <AlertCircle className="w-3.5 h-3.5" /> Admin Feedback:
                                        </div>
                                        <p className="text-sm text-amber-900/80 italic">{plan.feedback}</p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="pt-0 flex gap-2 border-t border-primary/5 p-4 bg-muted/10">
                                <Button 
                                    variant="secondary" 
                                    className="flex-1 text-xs h-9 bg-white hover:bg-primary/5 shadow-sm"
                                    onClick={() => handleEdit(plan)}
                                >
                                    {plan.status === 'Draft' || plan.status === 'Needs Revision' ? (
                                        <><Edit className="w-3.5 h-3.5 mr-1.5" /> Edit</>
                                    ) : (
                                        <><FileText className="w-3.5 h-3.5 mr-1.5" /> View</>
                                    )}
                                </Button>
                                {(plan.status === 'Draft' || plan.status === 'Needs Revision') && (
                                    <Button 
                                        variant="destructive" 
                                        size="icon"
                                        className="h-9 w-9 bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white"
                                        onClick={() => handleDelete(plan.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* Editor Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="px-6 py-4 border-b bg-muted/30 flex-shrink-0">
                        <DialogTitle className="text-xl flex items-center gap-2 text-primary">
                            <BookOpen className="w-5 h-5" />
                            {currentPlan?.id ? (currentPlan.status === 'Draft' || currentPlan.status === 'Needs Revision' ? 'Edit Lesson Plan' : 'View Lesson Plan') : 'Create Lesson Plan'}
                        </DialogTitle>
                        <DialogDescription>
                            {currentPlan?.status === 'Approved' ? 'This plan is approved and locked.' : 
                             currentPlan?.status === 'Submitted' ? 'This plan is currently under review.' : 
                             'Fill out the details of your lesson below.'}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {currentPlan?.feedback && (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                <h4 className="font-bold text-amber-700 mb-1 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" /> Feedback from Headmaster
                                </h4>
                                <p className="text-amber-900/90 whitespace-pre-wrap">{currentPlan.feedback}</p>
                            </div>
                        )}
                    
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="subject" className="font-bold text-primary">Subject</Label>
                                <Input 
                                    id="subject" 
                                    placeholder="e.g. Science" 
                                    value={currentPlan?.subject || ''} 
                                    onChange={e => setCurrentPlan({...currentPlan, subject: e.target.value})}
                                    disabled={currentPlan?.status === 'Submitted' || currentPlan?.status === 'Approved'}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="topic" className="font-bold text-primary">Topic</Label>
                                <Input 
                                    id="topic" 
                                    placeholder="e.g. Photosynthesis" 
                                    value={currentPlan?.topic || ''} 
                                    onChange={e => setCurrentPlan({...currentPlan, topic: e.target.value})}
                                    disabled={currentPlan?.status === 'Submitted' || currentPlan?.status === 'Approved'}
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2 flex-1 flex flex-col min-h-[300px]">
                            <div className="flex justify-between items-end">
                                <Label htmlFor="content" className="font-bold text-primary">Lesson Plan Content</Label>
                                {(currentPlan?.status === 'Draft' || !currentPlan?.status) && (
                                    <span className="text-xs text-muted-foreground">Tip: You can paste content generated from the Teacher's Corner here.</span>
                                )}
                            </div>
                            <Textarea 
                                id="content" 
                                placeholder="Enter your detailed lesson plan here..." 
                                className="flex-1 resize-none font-mono text-sm shadow-inner mt-2 min-h-[300px]"
                                value={currentPlan?.content || ''}
                                onChange={e => setCurrentPlan({...currentPlan, content: e.target.value})}
                                disabled={currentPlan?.status === 'Submitted' || currentPlan?.status === 'Approved'}
                            />
                        </div>
                    </div>
                    
                    <DialogFooter className="px-6 py-4 border-t bg-muted/10 flex-shrink-0 flex justify-between sm:justify-between items-center">
                        <div>
                            {currentPlan?.status && (
                                <Badge variant="outline" className={`${getStatusColor(currentPlan.status)} text-white border-0`}>
                                    Status: {currentPlan.status}
                                </Badge>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                                {currentPlan?.status === 'Submitted' || currentPlan?.status === 'Approved' ? 'Close' : 'Cancel'}
                            </Button>
                            
                            {(!currentPlan?.status || currentPlan?.status === 'Draft' || currentPlan?.status === 'Needs Revision') && (
                                <>
                                    <Button 
                                        variant="outline" 
                                        onClick={() => handleSave(false)} 
                                        disabled={isSubmitting}
                                        className="border-primary/20 text-primary hover:bg-primary/5"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Draft'}
                                    </Button>
                                    <Button 
                                        onClick={() => handleSave(true)} 
                                        disabled={isSubmitting}
                                        className="shadow-lg hover:shadow-xl"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Submit for Review</>}
                                    </Button>
                                </>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
