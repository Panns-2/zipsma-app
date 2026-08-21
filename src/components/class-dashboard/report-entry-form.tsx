'use client';

import { useState, useEffect } from 'react';
import { Student, StudentReport, ReportSubject, ReportSettings, getStudentReport, saveStudentReport, getAcademicPeriods } from '@/lib/data-store';
import { generateGESReportRemark } from '@/ai/flows/teacher-assistant-flow';
import { useFirebase } from '@/firebase/client-provider';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Calculator, X, Sparkles, Wand2, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ReportEntryFormProps {
  student: Student;
  schoolId: string;
  className: string;
  settings: ReportSettings | null;
  onClose: () => void;
  onSaveComplete: () => void;
}

// Utility to determine grade based on GES standard
function calculateGrade(totalScore: number): string {
  if (totalScore >= 80) return 'A';
  if (totalScore >= 70) return 'B';
  if (totalScore >= 60) return 'C';
  if (totalScore >= 50) return 'D';
  if (totalScore >= 40) return 'E';
  return 'F';
}

function getDefaultRemark(grade: string): string {
  switch (grade) {
    case 'A': return 'Excellent';
    case 'B': return 'Very Good';
    case 'C': return 'Good';
    case 'D': return 'Credit';
    case 'E': return 'Pass';
    case 'F': return 'Fail';
    default: return '';
  }
}

const isPreschoolClass = (name: string) => /kg|nursery|creche|pre-school|preschool/i.test(name);

export function ReportEntryForm({ student, schoolId, className, settings, onClose, onSaveComplete }: ReportEntryFormProps) {
  const { db, auth } = useFirebase();
  const { toast } = useToast();
  
  const [report, setReport] = useState<Partial<StudentReport>>({});
  const isPreschool = report.reportType === 'preschool';
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('attendance');
  const [currentPeriodId, setCurrentPeriodId] = useState<string | null>(null);
  const [isGeneratingAIRemark, setIsGeneratingAIRemark] = useState(false);

  useEffect(() => {
    async function initReport() {
      if (!db || !schoolId || !student.studentId) return;
      setIsLoading(true);
      try {
        const periods = await getAcademicPeriods(db, schoolId);
        const activePeriod = periods.find(p => p.isCurrent) || periods[0];
        
        if (!activePeriod) {
          toast({ title: "Error", description: "No active academic period found.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        
        setCurrentPeriodId(activePeriod.id);
        
        const existingReport = await getStudentReport(db, schoolId, student.studentId, activePeriod.id);
        const outstandingFees = (student.ledger || []).reduce((acc, t) => acc + (Number(t.debit) || 0) - (Number(t.credit) || 0), 0);
        const defaultNextTermInfo = {
          begins: activePeriod.nextTermBegins || '',
          reopens: activePeriod.schoolReopens || '',
          feesOutstanding: outstandingFees.toString()
        };

        if (existingReport) {
          setReport({
            ...existingReport,
            nextTermInfo: {
              begins: existingReport.nextTermInfo?.begins || defaultNextTermInfo.begins,
              reopens: existingReport.nextTermInfo?.reopens || defaultNextTermInfo.reopens,
              feesOutstanding: existingReport.nextTermInfo?.feesOutstanding || defaultNextTermInfo.feesOutstanding
            }
          });
        } else {
          // Initialize new report based on settings
          let defaultSubjects: ReportSubject[] = [];
          if (settings && settings.classGroups) {
            const matchedGroup = settings.classGroups.find(g => g.classes.includes(className));
            if (matchedGroup) {
              defaultSubjects = matchedGroup.subjects.map(name => ({
                name,
                classAssessmentScore: 0,
                examScore: 0,
                totalScore: 0,
                grade: '',
                remark: ''
              }));
            }
          }
          
          // Auto-calculate attendance based on student.attendance
          const termAttendance = (student.attendance || []).filter(a => a.periodId === activePeriod.id);
          const daysPresent = termAttendance.filter(a => a.attended).length;
          const daysAbsent = termAttendance.filter(a => !a.attended).length;
          const daysOpened = daysPresent + daysAbsent;
          
          setReport({
            studentId: student.studentId,
            schoolId,
            periodId: activePeriod.id,
            academicYear: activePeriod.year,
            term: activePeriod.term,
            className,
            reportType: isPreschoolClass(className) ? 'preschool' : 'standard' as 'standard' | 'preschool',
            attendance: { daysOpened, daysPresent, daysAbsent },
            subjects: defaultSubjects,
            skills: {},
            affectiveSkills: {},
            remarks: { teacherRemark: '', headTeacherRemark: '' },
            promotion: { promotedTo: '', isRepeated: false },
            summary: { totalMarks: 0, averageScore: 0, classPosition: '', classSize: 0, highestInClass: 0, lowestInClass: 0 },
            nextTermInfo: defaultNextTermInfo,
            isLocked: false
          });
        }
      } catch (error) {
        console.error("Error loading report:", error);
        toast({ title: "Error", description: "Failed to load report data.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    
    initReport();
  }, [db, schoolId, student.studentId, className, settings, toast]);

  const handleSubjectChange = (index: number, field: keyof ReportSubject, value: any) => {
    setReport(prev => {
      const newSubjects = [...(prev.subjects || [])];
      newSubjects[index] = { ...newSubjects[index], [field]: value };
      
      // Auto-calculate total and grade if CA or Exam changes
      if (field === 'grade' && isPreschool) {
        newSubjects[index].remark = getDefaultRemark(value);
      } else if (field === 'classAssessmentScore' || field === 'examScore') {
        const ca = Number(newSubjects[index].classAssessmentScore) || 0;
        const exam = Number(newSubjects[index].examScore) || 0;
        const total = ca + exam;
        const grade = calculateGrade(total);
        newSubjects[index].totalScore = total;
        newSubjects[index].grade = grade;
        newSubjects[index].remark = getDefaultRemark(grade);
      }
      
      return { ...prev, subjects: newSubjects };
    });
  };

  const handleAddSubject = () => {
    setReport(prev => ({
      ...prev,
      subjects: [
        ...(prev.subjects || []),
        {
          name: '',
          classAssessmentScore: 0,
          examScore: 0,
          totalScore: 0,
          grade: '',
          remark: ''
        }
      ]
    }));
  };

  const handleRemoveSubject = (index: number) => {
    setReport(prev => {
      const newSubjects = [...(prev.subjects || [])];
      newSubjects.splice(index, 1);
      return { ...prev, subjects: newSubjects };
    });
  };

  const handleCalculateSummary = () => {
    setReport(prev => {
      const subjects = prev.subjects || [];
      const totalMarks = subjects.reduce((sum, sub) => sum + (sub.totalScore || 0), 0);
      const averageScore = subjects.length > 0 ? totalMarks / subjects.length : 0;
      const classPosition: string = prev.summary?.classPosition ?? '';

      return {
        ...prev,
        summary: {
          classSize: 0,
          highestInClass: 0,
          lowestInClass: 0,
          ...prev.summary,
          classPosition,
          totalMarks,
          averageScore: Number(averageScore.toFixed(2))
        }
      };
    });
  };

  const handleGenerateAIRemark = async () => {
    if (!report.subjects || report.subjects.length === 0) {
      toast({ title: "No Data", description: "Please enter some subject grades first.", variant: "destructive" });
      return;
    }
    
    setIsGeneratingAIRemark(true);
    try {
      // Ensure summary is calculated
      handleCalculateSummary();
      
      const average = report.summary?.averageScore || 0;
      const subjects = report.subjects.map(s => ({
        subject: s.name,
        grade: s.grade || '-',
        total: s.totalScore || 0
      }));
      
      const result = await generateGESReportRemark({
        studentName: student.name,
        subjectGrades: subjects,
        averageScore: average,
        attendance: {
          present: report.attendance?.daysPresent || 0,
          opened: report.attendance?.daysOpened || 0
        }
      });
      
      if (result && result.remarks && result.remarks.length > 0) {
        setReport(prev => ({
          ...prev,
          remarks: {
            ...prev.remarks!,
            teacherRemark: result.remarks[0]
          }
        }));
        toast({ title: "AI Remark Generated", description: "A professional remark has been suggested based on the student's performance." });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "AI Error", description: "Could not generate AI remark at this time.", variant: "destructive" });
    } finally {
      setIsGeneratingAIRemark(false);
    }
  };

  const handleSave = async () => {
    if (!db || !auth || !report.periodId) return;
    setIsSaving(true);
    
    try {
      // Auto-calculate summary before saving
      handleCalculateSummary();
      
      const reportId = `${schoolId}_${report.academicYear}_${report.term}_${className}_${student.studentId}`.replace(/[\s\/]+/g, '_').toLowerCase();
      
      const fullReport: StudentReport = {
        ...report,
        id: reportId,
        studentId: student.studentId,
        schoolId,
        className,
            reportType: isPreschoolClass(className) ? 'preschool' : 'standard' as 'standard' | 'preschool',
        lastUpdated: new Date()
      } as StudentReport;
      
      await saveStudentReport(db, auth, fullReport);
      toast({ title: "Report Saved", description: "The student's report has been saved successfully." });
      onSaveComplete();
    } catch (error) {
      console.error("Save error:", error);
      toast({ title: "Error", description: `Failed to save: ${error instanceof Error ? error.message : JSON.stringify(error)}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl">
              Report Entry: <span className="text-primary">{student.name}</span> ({student.studentId})
            </DialogTitle>
          </div>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid ${isPreschool ? 'grid-cols-5' : 'grid-cols-4'} mb-4`}>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="subjects">Subjects & Grades</TabsTrigger>
                <TabsTrigger value="skills">Skills & Behaviour</TabsTrigger>
                <TabsTrigger value="remarks">Remarks</TabsTrigger>
                {isPreschool && <TabsTrigger value="health">Health Record</TabsTrigger>}
              </TabsList>
              
              <TabsContent value="attendance" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Days School Opened</Label>
                    <Input 
                      type="number" 
                      value={report.attendance?.daysOpened || 0} 
                      onChange={e => setReport(prev => ({ ...prev, attendance: { ...prev.attendance!, daysOpened: Number(e.target.value) } }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Days Present</Label>
                    <Input 
                      type="number" 
                      value={report.attendance?.daysPresent || 0} 
                      onChange={e => setReport(prev => ({ ...prev, attendance: { ...prev.attendance!, daysPresent: Number(e.target.value), daysAbsent: (prev.attendance?.daysOpened || 0) - Number(e.target.value) } }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Days Absent</Label>
                    <Input 
                      type="number" 
                      value={report.attendance?.daysAbsent || 0} 
                      readOnly
                      className="bg-gray-100"
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="subjects" className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <Button variant="outline" size="sm" onClick={handleAddSubject} className="border-dashed">
                    <Plus className="w-4 h-4 mr-2" /> Add Subject
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCalculateSummary}>
                    <Calculator className="w-4 h-4 mr-2" /> Calculate Totals
                  </Button>
                </div>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="px-4 py-2 font-medium">Subject</th>
                        {!isPreschool && <th className="px-4 py-2 font-medium w-24">CA (50)</th>}
                        {!isPreschool && <th className="px-4 py-2 font-medium w-24">Exam (50)</th>}
                        {!isPreschool && <th className="px-4 py-2 font-medium w-24">Total</th>}
                        <th className="px-4 py-2 font-medium w-32">Grade</th>
                        <th className="px-4 py-2 font-medium w-32">Remark</th>
                        <th className="px-2 py-2 font-medium w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.subjects?.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-muted-foreground">
                            No subjects added yet. Click "Add Subject" to begin.
                          </td>
                        </tr>
                      ) : (
                        report.subjects?.map((sub, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-4 py-2 font-medium">
                              <Input 
                                className="h-8 w-full"
                                value={sub.name}
                                onChange={e => handleSubjectChange(idx, 'name', e.target.value)}
                                placeholder="Subject Name"
                              />
                            </td>
                            {!isPreschool && (
                              <>
                                <td className="px-4 py-2">
                                  <Input 
                                    type="number" 
                                    max="50"
                                    className="h-8"
                                    value={sub.classAssessmentScore || ''} 
                                    onChange={e => handleSubjectChange(idx, 'classAssessmentScore', Number(e.target.value))}
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <Input 
                                    type="number" 
                                    max="50"
                                    className="h-8"
                                    value={sub.examScore || ''} 
                                    onChange={e => handleSubjectChange(idx, 'examScore', Number(e.target.value))}
                                  />
                                </td>
                                <td className="px-4 py-2 text-center font-bold">
                                  {sub.totalScore || 0}
                                </td>
                              </>
                            )}
                            <td className="px-4 py-2 text-center">
                              {isPreschool ? (
                                <Select 
                                  value={sub.grade || ''}
                                  onValueChange={(val) => handleSubjectChange(idx, 'grade', val)}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Grade" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="A">A (Excellent)</SelectItem>
                                    <SelectItem value="B">B (Very Good)</SelectItem>
                                    <SelectItem value="C">C (Good)</SelectItem>
                                    <SelectItem value="D">D (Developing)</SelectItem>
                                    <SelectItem value="E">E (Needs Improv.)</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="font-bold text-primary">{sub.grade || '-'}</span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <Input 
                                className="h-8 text-xs"
                                value={sub.remark || ''} 
                                onChange={e => handleSubjectChange(idx, 'remark', e.target.value)}
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveSubject(idx)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between bg-blue-50 p-3 rounded-md border border-blue-100">
                  <div><span className="font-semibold text-blue-900">Total Marks:</span> <span className="text-blue-800">{report.summary?.totalMarks || 0}</span></div>
                  <div><span className="font-semibold text-blue-900">Average:</span> <span className="text-blue-800">{report.summary?.averageScore || 0}%</span></div>
                </div>
              </TabsContent>
              
              <TabsContent value="skills" className="space-y-6">
                 {isPreschool ? (
                   <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-4 border p-4 rounded-md">
                       <h4 className="font-semibold">Personal Development</h4>
                       {['Neatness', 'Punctuality', 'Confidence', 'Participation', 'Social Interaction', 'Respect for Others', 'Self-Control', 'Independence'].map(skill => {
                         const key = skill.toLowerCase().replace(/ /g, '') as string;
                         return (
                           <div key={skill} className="flex justify-between items-center">
                             <Label className="text-xs">{skill}</Label>
                             <Select 
                               value={(report.preschoolPersonalDevelopment as any)?.[key] || ''}
                               onValueChange={(val) => setReport(prev => ({ ...prev, preschoolPersonalDevelopment: { ...prev.preschoolPersonalDevelopment, [key]: val } }))}
                             >
                               <SelectTrigger className="w-[140px] h-8 text-xs">
                                 <SelectValue placeholder="Grade" />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="A">A (Excellent)</SelectItem>
                                 <SelectItem value="B">B (Very Good)</SelectItem>
                                 <SelectItem value="C">C (Good)</SelectItem>
                                 <SelectItem value="D">D (Developing)</SelectItem>
                                 <SelectItem value="E">E (Needs Improv.)</SelectItem>
                               </SelectContent>
                             </Select>
                           </div>
                         );
                       })}
                     </div>
                     <div className="space-y-4 border p-4 rounded-md">
                       <h4 className="font-semibold">Psychomotor Skills</h4>
                       {['Colouring', 'Drawing', 'Cutting & Pasting', 'Pencil Control', 'Building Blocks', 'Physical Activities'].map(skill => {
                         const key = skill.toLowerCase().replace(/ /g, '') as string;
                         return (
                           <div key={skill} className="flex justify-between items-center">
                             <Label className="text-xs">{skill}</Label>
                             <Select 
                               value={(report.preschoolPsychomotorSkills as any)?.[key] || ''}
                               onValueChange={(val) => setReport(prev => ({ ...prev, preschoolPsychomotorSkills: { ...prev.preschoolPsychomotorSkills, [key]: val } }))}
                             >
                               <SelectTrigger className="w-[140px] h-8 text-xs">
                                 <SelectValue placeholder="Grade" />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="A">A (Excellent)</SelectItem>
                                 <SelectItem value="B">B (Very Good)</SelectItem>
                                 <SelectItem value="C">C (Good)</SelectItem>
                                 <SelectItem value="D">D (Developing)</SelectItem>
                                 <SelectItem value="E">E (Needs Improv.)</SelectItem>
                               </SelectContent>
                             </Select>
                           </div>
                         );
                       })}
                     </div>
                   </div>
                 ) : (
                   <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-4 border p-4 rounded-md">
                       <h4 className="font-semibold">Core Skills</h4>
                       {['Reading', 'Writing', 'Number Work', 'Creativity'].map(skill => (
                         <div key={skill} className="flex justify-between items-center">
                           <Label>{skill}</Label>
                           <Select 
                             value={(report.skills as any)?.[skill.toLowerCase().replace(' ', '')] || ''}
                             onValueChange={(val) => setReport(prev => ({ ...prev, skills: { ...prev.skills, [skill.toLowerCase().replace(' ', '')]: val } }))}
                           >
                             <SelectTrigger className="w-[180px] h-8 text-xs">
                               <SelectValue placeholder="Select rating" />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="Excellent">Excellent</SelectItem>
                               <SelectItem value="Very Good">Very Good</SelectItem>
                               <SelectItem value="Good">Good</SelectItem>
                               <SelectItem value="Needs Improvement">Needs Improvement</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                       ))}
                     </div>
                     
                     <div className="space-y-4 border p-4 rounded-md">
                       <h4 className="font-semibold">Behaviour / Affective</h4>
                       {['Obedience', 'Neatness', 'Punctuality'].map(skill => (
                         <div key={skill} className="flex justify-between items-center">
                           <Label>{skill}</Label>
                           <Select 
                             value={(report.skills as any)?.[skill.toLowerCase().replace(' ', '')] || ''}
                             onValueChange={(val) => setReport(prev => ({ ...prev, skills: { ...prev.skills, [skill.toLowerCase().replace(' ', '')]: val } }))}
                           >
                             <SelectTrigger className="w-[180px] h-8 text-xs">
                               <SelectValue placeholder="Select rating" />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="Excellent">Excellent</SelectItem>
                               <SelectItem value="Very Good">Very Good</SelectItem>
                               <SelectItem value="Good">Good</SelectItem>
                               <SelectItem value="Needs Improvement">Needs Improvement</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
              </TabsContent>
              
              <TabsContent value="health" className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>General Health</Label>
                      <Select 
                        value={report.healthRecord?.generalHealth || ''}
                        onValueChange={val => setReport(prev => ({ ...prev, healthRecord: { ...prev.healthRecord, generalHealth: val } }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Excellent">Excellent</SelectItem>
                          <SelectItem value="Good">Good</SelectItem>
                          <SelectItem value="Fair">Fair</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Vision</Label>
                      <Select 
                        value={report.healthRecord?.vision || ''}
                        onValueChange={val => setReport(prev => ({ ...prev, healthRecord: { ...prev.healthRecord, vision: val } }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Good">Good</SelectItem>
                          <SelectItem value="Needs Attention">Needs Attention</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Hearing</Label>
                      <Select 
                        value={report.healthRecord?.hearing || ''}
                        onValueChange={val => setReport(prev => ({ ...prev, healthRecord: { ...prev.healthRecord, hearing: val } }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Good">Good</SelectItem>
                          <SelectItem value="Needs Attention">Needs Attention</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Teacher's Observation</Label>
                    <Textarea 
                      className="h-32"
                      placeholder="Any specific health observations..."
                      value={report.healthRecord?.observation || ''}
                      onChange={e => setReport(prev => ({ ...prev, healthRecord: { ...prev.healthRecord, observation: e.target.value } }))}
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="remarks" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Class Teacher's Remark</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary hover:text-primary/80 hover:bg-primary/5 text-xs font-bold"
                      onClick={handleGenerateAIRemark}
                      disabled={isGeneratingAIRemark}
                    >
                      {isGeneratingAIRemark ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-2" />}
                      AI Suggest Remark
                    </Button>
                  </div>
                  <Textarea 
                    placeholder="Enter remark about the student's overall performance..."
                    value={report.remarks?.teacherRemark || ''}
                    onChange={e => setReport(prev => ({ ...prev, remarks: { ...prev.remarks!, teacherRemark: e.target.value } }))}
                    className="h-24"
                  />
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Wand2 className="w-3 h-3" /> AI uses the student's grades and attendance to craft a GES-compliant remark.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Head Teacher's Remark</Label>
                  <Textarea 
                    placeholder="Enter official remark from the headmaster..."
                    value={report.remarks?.headTeacherRemark || ''}
                    onChange={e => setReport(prev => ({ ...prev, remarks: { ...prev.remarks!, headTeacherRemark: e.target.value } }))}
                    className="h-24"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Promoted To / Next Class</Label>
                    <Input 
                      placeholder="e.g. Primary 4"
                      value={report.promotion?.promotedTo || ''}
                      onChange={e => setReport(prev => ({ ...prev, promotion: { ...prev.promotion!, promotedTo: e.target.value } }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Next Term Begins</Label>
                    <Input 
                      placeholder="e.g. 10th September"
                      value={report.nextTermInfo?.begins || ''}
                      onChange={e => setReport(prev => ({ ...prev, nextTermInfo: { ...prev.nextTermInfo, begins: e.target.value } }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>School Reopens</Label>
                    <Input 
                      placeholder="e.g. 10th September"
                      value={report.nextTermInfo?.reopens || ''}
                      onChange={e => setReport(prev => ({ ...prev, nextTermInfo: { ...prev.nextTermInfo, reopens: e.target.value } }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>School Fees Outstanding (GH₵)</Label>
                    <Input 
                      placeholder="e.g. 500"
                      value={report.nextTermInfo?.feesOutstanding || ''}
                      onChange={e => setReport(prev => ({ ...prev, nextTermInfo: { ...prev.nextTermInfo, feesOutstanding: e.target.value } }))}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="mt-8 flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Report
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
