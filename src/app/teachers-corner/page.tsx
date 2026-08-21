
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ZipSMALogo } from "@/components/zipsma-logo";
import { BookOpen, CheckSquare, FileText, BrainCircuit, PenSquare, ArrowLeft, Bot, Sparkles, Loader2, Copy, Users, Presentation, MessageSquare, BookCopy, HelpCircle } from "lucide-react";
import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateLessonPlan, generateAssessmentIdeas, generateReportRemark, generateManagementSolution, generateWritingPrompts, generateDifferentiatedInstruction, generateParentCommunication, generateResourceRecommendation } from "@/ai/flows/teacher-assistant-flow";
import { generatePremiumImage } from "@/ai/flows/premium-image-flow";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const GeneratedContentDisplay = ({ content, title }: { content: string, title: string }) => {
    const { toast } = useToast();
    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        toast({ title: "Copied to Clipboard!" });
    }
    return (
        <div className="mt-6 p-4 border bg-background rounded-lg animate-in fade-in-50">
            <h4 className="font-semibold mb-2 flex justify-between items-center text-lg text-primary">
                {title}
                <div>
                     <Button variant="ghost" size="sm" onClick={handleCopy}><Copy className="w-4 h-4 mr-2" /> Copy</Button>
                </div>
            </h4>
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-strong:text-foreground prose-headings:text-primary">
                <ReactMarkdown>{content}</ReactMarkdown>
            </div>
        </div>
    );
};

interface Tool {
    id: 'lessonPlan' | 'assessment' | 'remark' | 'classroomSupport' | 'studentSupport' | 'communication' | 'professionalDevelopment' | 'curriculumResources';
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
}

const tools: Tool[] = [
    {
        id: 'lessonPlan',
        icon: <BookOpen />,
        title: 'GES Lesson Planning',
        description: 'Generate NaCCA and CCP aligned lesson plans with Ghanaian context.',
        color: 'bg-purple-100 text-purple-700',
    },
    {
        id: 'assessment',
        icon: <CheckSquare />,
        title: 'SBA Assessment & Grading',
        description: 'Create quizzes and School-Based Assessment ideas based on GES standards.',
        color: 'bg-green-100 text-green-700',
    },
    {
        id: 'remark',
        icon: <FileText />,
        title: 'Report & Remark Generation',
        description: 'Draft personalized report card comments and summaries.',
        color: 'bg-blue-100 text-blue-700',
    },
    {
        id: 'classroomSupport',
        icon: <Presentation />,
        title: 'Teaching & Classroom Support',
        description: 'Get tips for classroom management and activity suggestions.',
        color: 'bg-orange-100 text-orange-700',
    },
     {
        id: 'curriculumResources',
        icon: <BookCopy />,
        title: 'NaCCA Resource Generator',
        description: 'Generate worksheets and materials tailored to the Ghanaian curriculum.',
        color: 'bg-sky-100 text-sky-700',
    },
    {
        id: 'studentSupport',
        icon: <Users />,
        title: 'Student Support & Differentiation',
        description: 'Adapt lessons for diverse learners and generate practice exercises.',
        color: 'bg-teal-100 text-teal-700',
    },
    {
        id: 'communication',
        icon: <MessageSquare />,
        title: 'Communication & Engagement',
        description: 'Auto-compose weekly updates to parents about student progress.',
        color: 'bg-rose-100 text-rose-700',
    },
     {
        id: 'professionalDevelopment',
        icon: <BrainCircuit />,
        title: 'Professional Development',
        description: 'Get recommendations for webinars, articles, and teaching strategies.',
        color: 'bg-yellow-100 text-yellow-700',
    },
];

function TeachersCornerContent() {
    const [activeTool, setActiveTool] = useState<Tool | null>(null);

    const [lessonPlanInput, setLessonPlanInput] = useState({ subject: '', classLevel: '', topic: '' });
    const [generatedLessonPlan, setGeneratedLessonPlan] = useState<string>('');
    const [visualAidPrompt, setVisualAidPrompt] = useState<string>('');
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [imageSeed, setImageSeed] = useState(0);
    const [isPremium, setIsPremium] = useState(false); // Mock premium state
    const [premiumImage, setPremiumImage] = useState<string | null>(null);
    const [customImagePrompt, setCustomImagePrompt] = useState<string>('');
    const [isEditingPrompt, setIsEditingPrompt] = useState(false);
    
    const [assessmentInput, setAssessmentInput] = useState({ topic: '' });
    const [generatedAssessment, setGeneratedAssessment] = useState<string>('');
    const [isGeneratingAssessment, setIsGeneratingAssessment] = useState(false);

    const [remarkInput, setRemarkInput] = useState({ performance: '' });
    const [generatedRemark, setGeneratedRemark] = useState<string>('');
    const [isGeneratingRemark, setIsGeneratingRemark] = useState(false);

    const [managementInput, setManagementInput] = useState({ issue: '' });
    const [generatedSolution, setGeneratedSolution] = useState<string>('');
    const [isGeneratingSolution, setIsGeneratingSolution] = useState(false);
    
    const [resourceInput, setResourceInput] = useState({ subject: '', classLevel: '', topic: '', resourceType: '' });
    const [generatedResource, setGeneratedResource] = useState<string>('');
    const [isGeneratingResource, setIsGeneratingResource] = useState(false);

    const [diffInstructionInput, setDiffInstructionInput] = useState({ lessonTopic: '', objective: '' });
    const [generatedDiffInstruction, setGeneratedDiffInstruction] = useState<string>('');
    const [isGeneratingDiffInstruction, setIsGeneratingDiffInstruction] = useState(false);
    
    const [parentCommInput, setParentCommInput] = useState({ studentName: '', performanceSummary: '', areasForImprovement: '' });
    const [generatedParentComm, setGeneratedParentComm] = useState<string>('');
    const [isGeneratingParentComm, setIsGeneratingParentComm] = useState(false);

    const [profDevInput, setProfDevInput] = useState({ topic: '', desiredOutcome: '' });
    const [generatedProfDev, setGeneratedProfDev] = useState<string>('');
    const [isGeneratingProfDev, setIsGeneratingProfDev] = useState(false);

    const [dashboardUrl, setDashboardUrl] = useState<string>('/staff/login');

    useEffect(() => {
        // This code runs only on the client-side
        const staffClassName = sessionStorage.getItem('staffClassName');
        const schoolId = sessionStorage.getItem('schoolId');

        if (staffClassName && schoolId) {
            setDashboardUrl(`/staff/class?name=${encodeURIComponent(staffClassName)}&schoolId=${schoolId}`);
        }
    }, []);
    
    const { toast } = useToast();
    
    const isGenerating = isGeneratingPlan || isGeneratingAssessment || isGeneratingRemark || isGeneratingSolution || isGeneratingResource || isGeneratingDiffInstruction || isGeneratingParentComm || isGeneratingProfDev;

    const currentGeneratedContent = 
        activeTool?.id === 'lessonPlan' ? generatedLessonPlan : 
        activeTool?.id === 'assessment' ? generatedAssessment : 
        activeTool?.id === 'remark' ? generatedRemark : 
        activeTool?.id === 'classroomSupport' ? generatedSolution :
        activeTool?.id === 'curriculumResources' ? generatedResource :
        activeTool?.id === 'studentSupport' ? generatedDiffInstruction :
        activeTool?.id === 'communication' ? generatedParentComm :
        activeTool?.id === 'professionalDevelopment' ? generatedProfDev :
        '';
        
    const handleGenerateLessonPlan = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGeneratingPlan(true);
        setGeneratedLessonPlan('');
        try {
            const result = await generateLessonPlan(lessonPlanInput);
            const formattedPlan = `### Lesson Plan for ${lessonPlanInput.topic} (${lessonPlanInput.subject})\n\n**Class Level:** ${lessonPlanInput.classLevel}\n\n**Learning Objectives:**\n${result.objectives.map(o => `- ${o}`).join('\n')}\n\n**Materials Needed:**\n${result.materials.map(m => `- ${m}`).join('\n')}\n\n**Key Activities:**\n${result.activities.map(a => `- **${a.activity}:** ${a.description}`).join('\n')}`;
            setGeneratedLessonPlan(formattedPlan);
            setVisualAidPrompt(result.visualAidPrompt);
            setIsImageLoading(true);
            setImageError(false);
            setImageSeed(Math.floor(Math.random() * 1000000));

            // Premium Logic
            if (isPremium) {
                const premiumResult = await generatePremiumImage(result.visualAidPrompt);
                if (premiumResult) {
                    setPremiumImage(`data:image/png;base64,${premiumResult.base64}`);
                } else {
                    console.log("Premium image failed, falling back to free version");
                }
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Could not generate lesson plan.", variant: 'destructive' });
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    const handleRegenerateWithCustomPrompt = async () => {
        setIsImageLoading(true);
        setImageError(false);
        setImageSeed(Math.floor(Math.random() * 1000000));
        setPremiumImage(null);

        try {
            const promptToUse = customImagePrompt || visualAidPrompt;
            if (isPremium) {
                const premiumResult = await generatePremiumImage(promptToUse);
                if (premiumResult) {
                    setPremiumImage(`data:image/png;base64,${premiumResult.base64}`);
                }
            }
        } catch (error) {
            console.error(error);
            setImageError(true);
        } finally {
            setIsImageLoading(false);
            setIsEditingPrompt(false);
        }
    };

    const handleGenerateAssessment = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGeneratingAssessment(true);
        setGeneratedAssessment('');
        try {
            const result = await generateAssessmentIdeas(assessmentInput);
            const formattedIdeas = `### Assessment Ideas for ${assessmentInput.topic}\n\n${result.ideas.map(idea => `**${idea.type}:** ${idea.description}`).join('\n\n')}`;
            setGeneratedAssessment(formattedIdeas);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Could not generate assessment ideas.", variant: 'destructive' });
        } finally {
            setIsGeneratingAssessment(false);
        }
    };
    
    const handleGenerateRemark = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGeneratingRemark(true);
        setGeneratedRemark('');
        try {
            const result = await generateReportRemark(remarkInput);
            const formattedRemark = `### Suggested Remarks for "${remarkInput.performance}" Performance:\n\n${result.remarks.map(r => `* "${r}"`).join('\n\n')}`;
            setGeneratedRemark(formattedRemark);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Could not generate remarks.", variant: 'destructive' });
        } finally {
            setIsGeneratingRemark(false);
        }
    };
    
    const handleGenerateSolution = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGeneratingSolution(true);
        setGeneratedSolution('');
        try {
            const result = await generateManagementSolution(managementInput);
            const formattedSolution = `### Suggested Solutions for: "${managementInput.issue}"\n\n${result.solutions.map(s => `**${s.strategy}:** ${s.explanation}`).join('\n\n')}`;
            setGeneratedSolution(formattedSolution);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Could not generate solutions.", variant: 'destructive' });
        } finally {
            setIsGeneratingSolution(false);
        }
    };

    const handleGenerateResource = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGeneratingResource(true);
        setGeneratedResource('');
        try {
            const result = await generateWritingPrompts(resourceInput); // Using writing prompts flow for this
            const formattedPrompts = `### ${resourceInput.resourceType} for "${resourceInput.topic}" (${resourceInput.classLevel}):\n\n${result.prompts.map((p, i) => `${i + 1}. ${p}`).join('\n\n')}`;
            setGeneratedResource(formattedPrompts);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Could not generate resources.", variant: 'destructive' });
        } finally {
            setIsGeneratingResource(false);
        }
    };

    const handleGenerateDiffInstruction = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGeneratingDiffInstruction(true);
        setGeneratedDiffInstruction('');
        try {
            const result = await generateDifferentiatedInstruction(diffInstructionInput);
            const formattedResult = `### Differentiated Instruction Plan for: ${diffInstructionInput.lessonTopic}\n\n#### For Struggling Learners:\n${result.strugglingLearners.map(s => `- **${s.activity}:** ${s.description}`).join('\n')}\n\n#### For Advanced Learners:\n${result.advancedLearners.map(a => `- **${a.activity}:** ${a.description}`).join('\n')}`;
            setGeneratedDiffInstruction(formattedResult);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Could not generate suggestions.", variant: 'destructive' });
        } finally {
            setIsGeneratingDiffInstruction(false);
        }
    };
    
    const handleGenerateParentComm = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGeneratingParentComm(true);
        setGeneratedParentComm('');
        try {
            const result = await generateParentCommunication(parentCommInput);
            const formattedMessage = `### Draft Message to Parent of ${parentCommInput.studentName}\n\n${result.message}`;
            setGeneratedParentComm(formattedMessage);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Could not generate message.", variant: 'destructive' });
        } finally {
            setIsGeneratingParentComm(false);
        }
    };
    
    const handleGenerateProfDev = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGeneratingProfDev(true);
        setGeneratedProfDev('');
        try {
            const result = await generateResourceRecommendation(profDevInput);
            const formattedResources = `### Professional Development Resources for "${profDevInput.topic}"\n\n${result.recommendations.map(r => `**${r.type}:** [${r.title}](${r.link}) - ${r.description}`).join('\n\n')}`;
            setGeneratedProfDev(formattedResources);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Could not generate recommendations.", variant: 'destructive' });
        } finally {
            setIsGeneratingProfDev(false);
        }
    };

    const renderToolContent = (tool: Tool) => {
        switch(tool.id) {
            case 'lessonPlan':
                return (
                    <form id="lesson-plan-form" onSubmit={handleGenerateLessonPlan} className="space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="topic">Topic</Label>
                            <Input id="topic" placeholder="e.g., Photosynthesis" value={lessonPlanInput.topic} onChange={e => setLessonPlanInput({...lessonPlanInput, topic: e.target.value})} required disabled={isGeneratingPlan} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject</Label>
                                <Input id="subject" placeholder="e.g., Science, English" value={lessonPlanInput.subject} onChange={e => setLessonPlanInput({...lessonPlanInput, subject: e.target.value})} required disabled={isGeneratingPlan} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="classLevel">Class Level</Label>
                                <Input id="classLevel" placeholder="e.g., Primary 4, JHS 1" value={lessonPlanInput.classLevel} onChange={e => setLessonPlanInput({...lessonPlanInput, classLevel: e.target.value})} required disabled={isGeneratingPlan} />
                            </div>
                        </div>
                    </form>
                );
            case 'assessment':
                return (
                    <form id="assessment-form" onSubmit={handleGenerateAssessment} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="topic">Topic / Subject Area</Label>
                            <Input id="topic" placeholder="e.g., The Water Cycle, Photosynthesis" value={assessmentInput.topic} onChange={e => setAssessmentInput({ topic: e.target.value })} required disabled={isGeneratingAssessment} />
                        </div>
                    </form>
                );
            case 'remark':
                return (
                    <form id="remark-form" onSubmit={handleGenerateRemark} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="performance">Student Performance Level</Label>
                            <Select onValueChange={value => setRemarkInput({ performance: value })} required disabled={isGeneratingRemark}>
                                <SelectTrigger id="performance"><SelectValue placeholder="Select a performance level" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Excellent">Excellent</SelectItem>
                                    <SelectItem value="Good">Good / Above Average</SelectItem>
                                    <SelectItem value="Average">Average / Satisfactory</SelectItem>
                                    <SelectItem value="Needs Improvement">Needs Improvement</SelectItem>
                                    <SelectItem value="Poor">Poor / Struggling</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </form>
                );
            case 'classroomSupport':
                return (
                    <form id="solution-form" onSubmit={handleGenerateSolution} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="issue">Describe the Classroom Issue</Label>
                            <Textarea id="issue" placeholder="e.g., Students are too noisy during group work, or a few learners are struggling to keep up." value={managementInput.issue} onChange={e => setManagementInput({ issue: e.target.value })} required disabled={isGeneratingSolution}/>
                        </div>
                    </form>
                );
            case 'curriculumResources':
                return (
                    <form id="resource-form" onSubmit={handleGenerateResource} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="res-topic">Topic</Label>
                            <Input id="res-topic" placeholder="e.g., The Solar System" value={resourceInput.topic} onChange={e => setResourceInput({...resourceInput, topic: e.target.value})} required disabled={isGeneratingResource} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="res-subject">Subject</Label>
                                <Input id="res-subject" placeholder="e.g., Science" value={resourceInput.subject} onChange={e => setResourceInput({...resourceInput, subject: e.target.value})} required disabled={isGeneratingResource} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="res-classLevel">Class Level</Label>
                                <Input id="res-classLevel" placeholder="e.g., Primary 5" value={resourceInput.classLevel} onChange={e => setResourceInput({...resourceInput, classLevel: e.target.value})} required disabled={isGeneratingResource} />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="res-type">Resource Type</Label>
                            <Select onValueChange={value => setResourceInput({ ...resourceInput, resourceType: value })} required disabled={isGeneratingResource}>
                                <SelectTrigger id="res-type"><SelectValue placeholder="Select resource type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Worksheet with 5 questions">Worksheet</SelectItem>
                                    <SelectItem value="Short reading passage">Reading Material</SelectItem>
                                    <SelectItem value="List of 3 interactive activities">Activity Ideas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </form>
                );
            case 'studentSupport':
                return (
                    <form id="diff-instruction-form" onSubmit={handleGenerateDiffInstruction} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="lessonTopic">Lesson Topic</Label>
                            <Input id="lessonTopic" placeholder="e.g., Fractions" value={diffInstructionInput.lessonTopic} onChange={e => setDiffInstructionInput({...diffInstructionInput, lessonTopic: e.target.value})} required disabled={isGeneratingDiffInstruction} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="objective">Primary Learning Objective</Label>
                            <Textarea id="objective" placeholder="e.g., Students will be able to identify and write equivalent fractions." value={diffInstructionInput.objective} onChange={e => setDiffInstructionInput({...diffInstructionInput, objective: e.target.value})} required disabled={isGeneratingDiffInstruction} />
                        </div>
                    </form>
                );
            case 'communication':
                return (
                    <form id="parent-comm-form" onSubmit={handleGenerateParentComm} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="studentName">Student's Name</Label>
                            <Input id="studentName" placeholder="e.g., John Doe" value={parentCommInput.studentName} onChange={e => setParentCommInput({...parentCommInput, studentName: e.target.value})} required disabled={isGeneratingParentComm} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="performanceSummary">Performance Summary</Label>
                            <Textarea id="performanceSummary" placeholder="e.g., Excellent work in mathematics, participates well in class." value={parentCommInput.performanceSummary} onChange={e => setParentCommInput({...parentCommInput, performanceSummary: e.target.value})} required disabled={isGeneratingParentComm} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="areasForImprovement">Areas for Improvement</Label>
                            <Textarea id="areasForImprovement" placeholder="e.g., Needs to submit homework on time, can be more focused during science class." value={parentCommInput.areasForImprovement} onChange={e => setParentCommInput({...parentCommInput, areasForImprovement: e.target.value})} required disabled={isGeneratingParentComm} />
                        </div>
                    </form>
                );
            case 'professionalDevelopment':
                 return (
                    <form id="prof-dev-form" onSubmit={handleGenerateProfDev} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="prof-dev-topic">Topic of Interest</Label>
                            <Input id="prof-dev-topic" placeholder="e.g., Differentiated Instruction, Classroom Technology" value={profDevInput.topic} onChange={e => setProfDevInput({...profDevInput, topic: e.target.value})} required disabled={isGeneratingProfDev} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="prof-dev-outcome">Desired Outcome</Label>
                            <Input id="prof-dev-outcome" placeholder="e.g., Find new teaching strategies, learn about new tools" value={profDevInput.desiredOutcome} onChange={e => setProfDevInput({...profDevInput, desiredOutcome: e.target.value})} required disabled={isGeneratingProfDev} />
                        </div>
                    </form>
                );
            default:
                return null;
        }
    };
    
    const getFormId = (toolId: string) => {
        switch(toolId) {
            case 'lessonPlan': return 'lesson-plan-form';
            case 'assessment': return 'assessment-form';
            case 'remark': return 'remark-form';
            case 'classroomSupport': return 'solution-form';
            case 'curriculumResources': return 'resource-form';
            case 'studentSupport': return 'diff-instruction-form';
            case 'communication': return 'parent-comm-form';
            case 'professionalDevelopment': return 'prof-dev-form';
            default: return '';
        }
    }

    const resetAndClose = () => {
        setActiveTool(null);
        setGeneratedLessonPlan('');
        setGeneratedAssessment('');
        setGeneratedRemark('');
        setGeneratedSolution('');
        setGeneratedResource('');
        setGeneratedDiffInstruction('');
        setGeneratedParentComm('');
        setGeneratedProfDev('');
        setVisualAidPrompt('');
        setIsImageLoading(false);
        setImageError(false);
        setCustomImagePrompt('');
        setIsEditingPrompt(false);
        setPremiumImage(null);
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="bg-card shadow-sm sticky top-0 z-40 border-b">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <ZipSMALogo />
                        <h1 className="text-xl font-bold text-primary font-headline">AI Teacher's Corner</h1>
                        <nav className="hidden md:flex ml-6 items-center gap-4 border-l pl-6">
                            <Link href="/help-center" className="text-sm font-medium text-gray-500 hover:text-primary transition-colors flex items-center gap-2">
                                <HelpCircle className="w-4 h-4" />
                                Help Center
                            </Link>
                        </nav>
                    </div>
                     <Button variant="outline" asChild>
                        <Link href={dashboardUrl}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Dashboard
                        </Link>
                    </Button>
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-8">
                 <div className="relative mb-12 rounded-2xl overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-100">
                    <div className="grid md:grid-cols-2 items-center gap-8 p-8 md:p-12">
                        <div className="space-y-4">
                            <h2 className="text-4xl md:text-5xl font-bold font-headline text-primary">Your GES-Certified AI Assistant</h2>
                            <p className="max-w-md text-muted-foreground text-lg">
                                Streamline your workflow with tools strictly aligned with **NaCCA guidelines** and **GES standards**. Generate CCP-compliant lesson plans, SBA assessment ideas, and professional report remarks.
                            </p>
                        </div>
                        <div className="relative h-64 md:h-full w-full group">
                           <Image 
                                src="/teacher-ai-banner.png"
                                alt="AI helping in a classroom"
                                fill
                                className="object-cover rounded-xl shadow-lg"
                                data-ai-hint="robot teacher"
                                priority
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-8">
                    {!isPremium && (
                        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group hover:shadow-indigo-500/20 transition-all border border-white/10">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                                <Sparkles className="w-32 h-32" />
                            </div>
                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 px-3 py-0.5 text-[10px] font-bold tracking-wider">PREMIUM FEATURE</Badge>
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
                                        Transform your lessons with Imagen 4
                                    </h3>
                                    <p className="text-indigo-100 max-w-xl text-lg leading-relaxed">
                                        Unlock high-fidelity, curriculum-exact illustrations. Every diagram is custom-built for the Ghanaian context with professional accuracy.
                                    </p>
                                </div>
                                <Button onClick={() => setIsPremium(true)} className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold px-10 py-6 text-lg rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all whitespace-nowrap">
                                    Upgrade Now
                                </Button>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {tools.map(tool => (
                        <Card 
                            key={tool.id} 
                            className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
                            onClick={() => setActiveTool(tool)}
                        >
                            <CardHeader className="flex-row items-start gap-4">
                                <div className={`p-3 rounded-lg ${tool.color}`}>
                                    {tool.icon}
                                </div>
                                <div className="flex-1">
                                    <CardTitle className="text-lg font-semibold">{tool.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </main>
            
            <Dialog open={!!activeTool} onOpenChange={(isOpen) => { if (!isOpen) resetAndClose() }}>
                <DialogContent className="max-w-2xl">
                    {activeTool && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-3 text-2xl">
                                    <div className={`p-3 rounded-lg ${activeTool.color}`}>
                                        {activeTool.icon}
                                    </div>
                                    {activeTool.title}
                                </DialogTitle>
                                <DialogDescription className="pt-2">{activeTool.description}</DialogDescription>
                            </DialogHeader>
                            
                            <div className="py-4 max-h-[60vh] overflow-y-auto px-1">
                                {renderToolContent(activeTool)}
                                {isGenerating && <div className="flex justify-center items-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
                                {currentGeneratedContent && <GeneratedContentDisplay content={currentGeneratedContent} title="AI Generated Response" />}
                                
                                {activeTool?.id === 'lessonPlan' && visualAidPrompt && (
                                    <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
                                                <Sparkles className="w-4 h-4" />
                                            </div>
                                            <h4 className="font-bold text-lg text-primary">AI Lesson Visual Aid</h4>
                                        </div>
                                        <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
                                            <img 
                                                src={isPremium && premiumImage 
                                                    ? premiumImage
                                                    : imageError 
                                                        ? `https://loremflickr.com/1024/576/education,school,${encodeURIComponent(lessonPlanInput.topic)}?lock=${imageSeed}`
                                                        : `https://image.pollinations.ai/prompt/${encodeURIComponent((customImagePrompt || visualAidPrompt).substring(0, 300).replace(/[^\w\s]/gi, '') + " professional educational illustration") }?seed=${imageSeed}`
                                                }
                                                alt="Lesson Visual Aid"
                                                className={`object-cover w-full h-full transition-opacity duration-500 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                                                onLoad={() => {
                                                    setIsImageLoading(false);
                                                }}
                                                onError={(e) => {
                                                    if (!imageError) {
                                                        setImageError(true);
                                                        setIsImageLoading(false);
                                                    } else {
                                                        setIsImageLoading(false);
                                                    }
                                                }}
                                            />
                                            {isPremium && (
                                                <div className="absolute top-4 left-4">
                                                    <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-lg flex items-center gap-1.5 border border-white/20">
                                                        <Sparkles className="w-3 h-3" /> PREMIA IMAGEN 4
                                                    </div>
                                                </div>
                                            )}
                                            {isImageLoading && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 backdrop-blur-sm gap-3">
                                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                                    <p className="text-xs font-medium text-gray-500">Generating visual aid...</p>
                                                </div>
                                            )}
                                            {imageError && !isImageLoading && (
                                                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-xl border border-rose-100 shadow-lg flex items-center justify-between">
                                                    <p className="text-[10px] text-rose-600 font-medium flex items-center gap-1">
                                                        <Sparkles className="w-3 h-3" /> AI model busy. Showing educational reference instead.
                                                    </p>
                                                    <Button variant="ghost" size="sm" onClick={() => { setImageSeed(Math.random()); setImageError(false); setIsImageLoading(true); }} className="h-6 text-[10px] text-primary hover:bg-primary/10">
                                                        Retry AI Generation
                                                    </Button>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex flex-col justify-end p-6 pointer-events-none">
                                                <p className="text-white text-xs font-medium italic">"{customImagePrompt || visualAidPrompt}"</p>
                                            </div>
                                        </div>

                                        {isEditingPrompt ? (
                                            <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 space-y-3 animate-in fade-in zoom-in-95">
                                                <div className="flex justify-between items-center">
                                                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Describe your ideal image</Label>
                                                    <Button variant="ghost" size="sm" onClick={() => setIsEditingPrompt(false)} className="h-6 text-[10px]">Cancel</Button>
                                                </div>
                                                <Textarea 
                                                    value={customImagePrompt} 
                                                    onChange={(e) => setCustomImagePrompt(e.target.value)}
                                                    placeholder="e.g. A 3D diagram of a plant cell with labels for nucleus, mitochondria, and cell wall..."
                                                    className="text-sm bg-white"
                                                    rows={3}
                                                />
                                                <Button 
                                                    onClick={handleRegenerateWithCustomPrompt} 
                                                    disabled={isImageLoading || !customImagePrompt}
                                                    className="w-full bg-primary text-white hover:bg-primary/90"
                                                >
                                                    {isImageLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                                    Update Visual Aid
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-3">
                                                <div className="flex flex-wrap justify-between items-center gap-2 text-xs text-muted-foreground bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                                                    <p className="flex items-center gap-1.5">
                                                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI generated illustration for this lesson.
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="link" size="sm" className="h-auto p-0 text-primary font-bold" onClick={() => { setImageSeed(Math.floor(Math.random() * 1000000)); setIsImageLoading(true); setImageError(false); setPremiumImage(null); if(isPremium) handleRegenerateWithCustomPrompt(); }}>
                                                            Regenerate
                                                        </Button>
                                                        <span className="text-gray-300">|</span>
                                                        <Button variant="link" size="sm" className="h-auto p-0 text-indigo-600 font-bold" onClick={() => { setIsEditingPrompt(true); if(!customImagePrompt) setCustomImagePrompt(visualAidPrompt); }}>
                                                            Custom Description
                                                        </Button>
                                                        <span className="text-gray-300">|</span>
                                                        <Button variant="link" size="sm" className="h-auto p-0 text-muted-foreground" onClick={() => { navigator.clipboard.writeText(customImagePrompt || visualAidPrompt); toast({ title: "Prompt copied!" }); }}>
                                                            Copy Prompt
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={resetAndClose} disabled={isGenerating}>Cancel</Button>
                                <Button 
                                    type="submit" 
                                    form={getFormId(activeTool.id)} 
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? <><Loader2 className="animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate</>}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function TeachersCornerPage() {
    return (
        <Suspense>
            <TeachersCornerContent />
        </Suspense>
    )
}

    