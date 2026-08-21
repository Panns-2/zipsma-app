import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Student, updateStudentDetails, archiveStudent } from '@/lib/data-store';
import { Loader2, GraduationCap, ArrowRight } from 'lucide-react';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { Input } from '@/components/ui/input';

interface PromoteStudentsTabProps {
    students: Student[];
    db: Firestore;
    auth: Auth;
    storage: FirebaseStorage;
    schoolId: string;
    onComplete?: () => void;
}

export function PromoteStudentsTab({ students, db, auth, storage, schoolId, onComplete }: PromoteStudentsTabProps) {
    const { toast } = useToast();
    
    const [sourceClass, setSourceClass] = useState<string>('');
    const [destinationClass, setDestinationClass] = useState<string>('');
    const [isCustomClass, setIsCustomClass] = useState(false);
    const [customDestinationClass, setCustomDestinationClass] = useState<string>('');
    
    // Map of student ID to boolean (whether they are selected for promotion)
    const [selectedStudents, setSelectedStudents] = useState<Record<string, boolean>>({});
    const [isPromoting, setIsPromoting] = useState(false);

    // Get unique classes from current active students
    const uniqueClassNames = useMemo(() => {
        const standardClasses = [
            'Creche', 'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2',
            'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
            'JHS 1', 'JHS 2', 'JHS 3'
        ];
        const classNames = new Set([
            ...standardClasses,
            ...students.filter(s => !s.isArchived).map(s => s.className).filter(Boolean)
        ]);
        return Array.from(classNames).sort((a, b) => {
            const indexA = standardClasses.indexOf(a);
            const indexB = standardClasses.indexOf(b);
            
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });
    }, [students]);

    // Get students in the currently selected source class
    const sourceStudents = useMemo(() => {
        if (!sourceClass) return [];
        return students.filter(s => (s.className || '').toLowerCase() === sourceClass.toLowerCase() && !s.isArchived).sort((a, b) => a.name.localeCompare(b.name));
    }, [students, sourceClass]);

    // Handle source class change (auto-select all students)
    const handleSourceClassChange = (val: string) => {
        setSourceClass(val);
        const filtered = students.filter(s => (s.className || '').toLowerCase() === val.toLowerCase() && !s.isArchived);
        const initialSelection: Record<string, boolean> = {};
        filtered.forEach(s => {
            initialSelection[s.id || s.studentId] = true;
        });
        setSelectedStudents(initialSelection);
    };

    const handleSelectAll = (checked: boolean) => {
        const newSelection: Record<string, boolean> = {};
        sourceStudents.forEach(s => {
            newSelection[s.id || s.studentId] = checked;
        });
        setSelectedStudents(newSelection);
    };

    const handleToggleStudent = (id: string, checked: boolean) => {
        setSelectedStudents(prev => ({ ...prev, [id]: checked }));
    };

    const handlePromote = async () => {
        const finalDestClass = isCustomClass ? customDestinationClass.trim() : destinationClass;
        
        if (!sourceClass || !finalDestClass) {
            toast({
                title: "Validation Error",
                description: "Please select both a source class and a destination class.",
                variant: "destructive"
            });
            return;
        }

        const studentsToPromote = sourceStudents.filter(s => selectedStudents[s.id || s.studentId]);
        
        if (studentsToPromote.length === 0) {
            toast({
                title: "No Students Selected",
                description: "Please select at least one student to promote.",
                variant: "destructive"
            });
            return;
        }

        setIsPromoting(true);

        try {
            let successCount = 0;
            
            for (const student of studentsToPromote) {
                if (!student.id) continue;
                
                if (finalDestClass === 'Alumni') {
                    // Update class to Alumni and archive them
                    await updateStudentDetails(db, storage, auth, student.id, { className: 'Alumni' }, null, schoolId);
                    await archiveStudent(db, auth, student.id, true, schoolId);
                } else {
                    // Just update class
                    await updateStudentDetails(db, storage, auth, student.id, { className: finalDestClass }, null, schoolId);
                }
                successCount++;
            }

            toast({
                title: "Promotion Successful",
                description: `Successfully moved ${successCount} students to ${finalDestClass}.`,
            });
            
            setSourceClass('');
            setDestinationClass('');
            setCustomDestinationClass('');
            setIsCustomClass(false);
            setSelectedStudents({});
            
            if (onComplete) onComplete();
            
        } catch (error: any) {
            console.error('Promotion error:', error);
            toast({
                title: "Promotion Failed",
                description: error.message || "An error occurred during promotion.",
                variant: "destructive"
            });
        } finally {
            setIsPromoting(false);
        }
    };

    const selectedCount = Object.values(selectedStudents).filter(Boolean).length;
    const isAllSelected = sourceStudents.length > 0 && selectedCount === sourceStudents.length;

    return (
        <div className="space-y-6">
            <Card className="max-w-4xl mx-auto border-2 border-primary/20 shadow-md">
                <CardHeader>
                    <CardTitle className="text-heading-md flex items-center gap-2">
                        <GraduationCap className="w-6 h-6 text-primary"/> 
                        Promote Students
                    </CardTitle>
                    <CardDescription>
                        Move students from one class to the next for the new academic term. 
                        Note: This will not affect their payment ledgers. You can generate new term bills from the Finances tab.
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-8">
                    {/* Class Selection Row */}
                    <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 items-end bg-primary/5 p-6 rounded-2xl border border-primary/10">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase text-primary/70">From Class (Source)</Label>
                            <Select value={sourceClass} onValueChange={handleSourceClassChange} disabled={isPromoting}>
                                <SelectTrigger className="bg-white border-2 h-12 text-lg font-bold rounded-xl shadow-sm">
                                    <SelectValue placeholder="Select current class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {uniqueClassNames.map(cls => (
                                        <SelectItem key={cls} value={cls} className="font-medium">{cls}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="hidden md:flex pb-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <ArrowRight className="w-5 h-5 text-primary" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase text-primary/70">To Class (Destination)</Label>
                            {isCustomClass ? (
                                <div className="flex gap-2">
                                    <Input 
                                        className="bg-white border-2 h-12 text-lg font-bold rounded-xl shadow-sm flex-1"
                                        placeholder="Type new class name..."
                                        value={customDestinationClass}
                                        onChange={e => setCustomDestinationClass(e.target.value)}
                                        disabled={isPromoting}
                                    />
                                    <Button variant="outline" onClick={() => setIsCustomClass(false)} className="h-12 border-2 rounded-xl">Cancel</Button>
                                </div>
                            ) : (
                                <Select value={destinationClass} onValueChange={(val) => {
                                    if (val === 'custom') setIsCustomClass(true);
                                    else setDestinationClass(val);
                                }} disabled={isPromoting}>
                                    <SelectTrigger className="bg-white border-2 h-12 text-lg font-bold rounded-xl shadow-sm">
                                        <SelectValue placeholder="Select next class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Alumni" className="font-bold text-amber-600 bg-amber-50 mb-2 border border-amber-100">Alumni (Graduate & Archive)</SelectItem>
                                        {uniqueClassNames.map(cls => (
                                            <SelectItem key={cls} value={cls} className="font-medium">{cls}</SelectItem>
                                        ))}
                                        <SelectItem value="custom" className="font-bold text-primary mt-2 border-t pt-2">+ Create New Class</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>

                    {/* Student List */}
                    {sourceClass && (
                        <div className="border rounded-2xl overflow-hidden bg-white shadow-sm">
                            <div className="bg-muted/50 p-4 border-b flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Checkbox 
                                        id="select-all" 
                                        checked={isAllSelected} 
                                        onCheckedChange={handleSelectAll}
                                        disabled={isPromoting}
                                    />
                                    <Label htmlFor="select-all" className="font-bold cursor-pointer">
                                        Select All ({selectedCount} of {sourceStudents.length} selected)
                                    </Label>
                                </div>
                                
                                <Button 
                                    onClick={handlePromote} 
                                    disabled={isPromoting || selectedCount === 0 || (!destinationClass && !customDestinationClass)}
                                    className="font-black tracking-wide bg-primary shadow-md hover:shadow-lg transition-all"
                                >
                                    {isPromoting ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Moving {selectedCount} Students...</>
                                    ) : (
                                        <><GraduationCap className="w-4 h-4 mr-2" /> Promote {selectedCount} Students</>
                                    )}
                                </Button>
                            </div>
                            
                            <div className="max-h-[400px] overflow-y-auto p-2">
                                {sourceStudents.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground italic">No active students found in {sourceClass}.</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {sourceStudents.map(student => {
                                            const id = student.id || student.studentId;
                                            const isChecked = !!selectedStudents[id];
                                            
                                            return (
                                                <div 
                                                    key={id} 
                                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                                        isChecked ? 'border-primary/40 bg-primary/5 shadow-sm' : 'border-transparent hover:bg-slate-50'
                                                    }`}
                                                    onClick={() => !isPromoting && handleToggleStudent(id, !isChecked)}
                                                >
                                                    <Checkbox 
                                                        checked={isChecked}
                                                        disabled={isPromoting}
                                                        onCheckedChange={(c) => handleToggleStudent(id, !!c)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <div className="overflow-hidden">
                                                        <p className="font-bold text-sm truncate">{student.name}</p>
                                                        <p className="text-[10px] text-muted-foreground">{student.studentId}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
