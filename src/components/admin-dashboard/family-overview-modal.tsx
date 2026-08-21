import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Users } from 'lucide-react';
import { Student, FeeCategory, AcademicPeriod, calculateStudentTotalBalance } from '@/lib/data-store';
import { GradientAvatar } from '@/components/gradient-avatar';

interface FamilyOverviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    parentStudent: Student | null;
    students: Student[];
    feeCategories: FeeCategory[];
    currentPeriod?: AcademicPeriod;
    periods: AcademicPeriod[];
}

export const FamilyOverviewModal: React.FC<FamilyOverviewModalProps> = ({
    isOpen,
    onClose,
    parentStudent,
    students,
    feeCategories,
    currentPeriod,
    periods
}) => {
    const familyMembers = useMemo(() => {
        if (!parentStudent) return [];
        const normalizeStr = (str?: string | null) => str ? str.trim().toLowerCase() : '';
        const pId = normalizeStr(parentStudent.parentPhone) || normalizeStr(parentStudent.parentId) || normalizeStr(parentStudent.parentName);
        if (!pId) return [parentStudent];

        return students.filter(s => {
            const spId = normalizeStr(s.parentPhone) || normalizeStr(s.parentId) || normalizeStr(s.parentName);
            return spId === pId;
        });
    }, [parentStudent, students]);

    const familyDebts = useMemo(() => {
        return familyMembers.map(student => {
            const balanceInfo = calculateStudentTotalBalance(student, periods, currentPeriod?.id, feeCategories);
            
            return {
                student,
                mainDebt: balanceInfo.mainData.balance,
                dailyDebt: balanceInfo.dailyData.balance + balanceInfo.dailyAccruedInfo,
                totalDebt: Math.max(0, balanceInfo.totalOutstanding)
            };
        });
    }, [familyMembers, currentPeriod, feeCategories, periods]);

    const totalFamilyDebt = familyDebts.reduce((sum, item) => sum + Math.max(0, item.totalDebt), 0);

    if (!parentStudent) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] font-sans">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black flex items-center gap-2">
                        <Users className="w-6 h-6 text-indigo-600" />
                        Family Overview
                    </DialogTitle>
                    <DialogDescription>
                        Showing all children associated with parent <span className="font-bold text-slate-800">{parentStudent.parentName || 'Unknown'}</span> ({parentStudent.parentPhone || 'No phone'}).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                    {familyDebts.map((item, idx) => (
                        <div key={idx} className="p-4 border rounded-xl flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <GradientAvatar name={item.student.name} src={item.student.profilePicture} size="md" />
                                <div>
                                    <p className="font-bold text-slate-800">{item.student.name}</p>
                                    <p className="text-xs text-slate-500">{item.student.className} • {item.student.studentId}</p>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Debt</p>
                                <p className={`font-black text-lg leading-none ${item.totalDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    GH¢{item.totalDebt > 0 ? item.totalDebt.toFixed(2) : '0.00'}
                                </p>
                                {(item.mainDebt > 0 || item.dailyDebt > 0) && (
                                    <div className="flex gap-2 text-[10px] font-medium mt-1">
                                        {item.mainDebt > 0 && <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Term: GH¢{item.mainDebt.toFixed(2)}</span>}
                                        {item.dailyDebt > 0 && <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Daily: GH¢{item.dailyDebt.toFixed(2)}</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 p-4 bg-slate-50 border rounded-xl flex justify-between items-center">
                    <div>
                        <p className="text-sm font-black text-slate-500 uppercase">Combined Family Debt</p>
                    </div>
                    <div>
                        <p className={`font-black text-2xl ${totalFamilyDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            GH¢{totalFamilyDebt > 0 ? totalFamilyDebt.toFixed(2) : '0.00'}
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
