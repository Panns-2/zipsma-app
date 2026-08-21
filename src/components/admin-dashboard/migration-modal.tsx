import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Student, Parent, addParent, updateStudentDetails } from '@/lib/data-store';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { Loader2 } from 'lucide-react';

interface MigrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
    db: Firestore;
    auth: Auth;
    storage: FirebaseStorage;
    schoolId: string;
    onComplete: () => void;
}

export function MigrationModal({ isOpen, onClose, students, db, auth, storage, schoolId, onComplete }: MigrationModalProps) {
    const { toast } = useToast();
    const [isMigrating, setIsMigrating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [total, setTotal] = useState(0);

    const handleMigrate = async () => {
        setIsMigrating(true);
        try {
            // 1. Find all students that still have parentName
            const legacyStudents = students.filter(s => s.parentName);
            setTotal(legacyStudents.length);
            
            // 2. Group by phone number (to detect siblings)
            const parentGroups: Record<string, { parentData: Partial<Parent>, students: Student[] }> = {};
            
            for (const student of legacyStudents) {
                const phoneKey = student.parentPhone?.trim() || student.parentName?.trim() || student.studentId;
                if (!parentGroups[phoneKey]) {
                    parentGroups[phoneKey] = {
                        parentData: {
                            name: student.parentName || `Parent of ${student.name}`,
                            phone: student.parentPhone || '',
                            email: student.parentEmail || '',
                            address: student.address || '',
                            emergencyContactName: student.emergencyContactName || '',
                            emergencyContactPhone: student.emergencyContactPhone || '',
                            preferredVoiceLanguage: student.preferredVoiceLanguage || ''
                        },
                        students: []
                    };
                }
                parentGroups[phoneKey].students.push(student);
            }

            let completed = 0;
            // 3. Create Parent records and update students
            for (const key in parentGroups) {
                const group = parentGroups[key];
                
                // Create Parent
                const parentId = await addParent(db, auth, schoolId, group.parentData as any);
                
                // Update Students
                for (const student of group.students) {
                    if (!student.id) continue;
                    await updateStudentDetails(db, storage, auth, student.id, { 
                        parentId,
                        parentName: '',
                        parentPhone: '',
                        parentEmail: '',
                        address: '',
                        emergencyContactName: '',
                        emergencyContactPhone: ''
                    }, null, schoolId);
                    
                    completed++;
                    setProgress(completed);
                }
            }

            toast({
                title: 'Migration Complete',
                description: `Successfully migrated ${completed} students into Parent records.`
            });
            onComplete();
            onClose();

        } catch (error: any) {
            console.error('Migration error:', error);
            toast({
                title: 'Migration Failed',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Migrate Parent Data</DialogTitle>
                    <DialogDescription>
                        This will group siblings by phone number and create dedicated Parent profiles for them.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 text-center">
                    {isMigrating ? (
                        <div className="space-y-4">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                            <p className="text-sm font-medium">Migrating... {progress} / {total}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            You have {students.filter(s => s.parentName).length} students needing migration.
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isMigrating}>Cancel</Button>
                    <Button onClick={handleMigrate} disabled={isMigrating}>
                        {isMigrating ? 'Migrating...' : 'Start Migration'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
