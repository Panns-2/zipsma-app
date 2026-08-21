'use client';

import { useState, useEffect } from 'react';
import { Student, getReportSettings, ReportSettings, getStudentReportsByClass, saveStudentReport, getAcademicPeriods, StudentReport, getSchoolDetails, School, getStudentReport, AcademicPeriod } from '@/lib/data-store';
import { useFirebase } from '@/firebase/client-provider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ChevronRight, Loader2, Trophy, Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReportEntryForm } from './report-entry-form';
import { GESReportCard } from './ges-report-card';

interface StudentReportsTabProps {
  students: Student[];
  schoolId: string | null;
  className: string;
}

export function StudentReportsTab({ students, schoolId, className }: StudentReportsTabProps) {
  const { db, auth } = useFirebase();
  const { toast } = useToast();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [settings, setSettings] = useState<ReportSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isGeneratingPositions, setIsGeneratingPositions] = useState(false);
  
  // Printing state
  const [studentToPrint, setStudentToPrint] = useState<Student | null>(null);
  const [reportToPrint, setReportToPrint] = useState<StudentReport | null>(null);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
  const [activePeriod, setActivePeriod] = useState<AcademicPeriod | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [existingReports, setExistingReports] = useState<Record<string, StudentReport>>({});

  useEffect(() => {
    async function loadSettings() {
      if (!db || !schoolId) return;
      try {
        const data = await getReportSettings(db, schoolId);
        setSettings(data);
        const schoolData = await getSchoolDetails(db, schoolId);
        setSchoolDetails(schoolData);
        
        const periods = await getAcademicPeriods(db, schoolId);
        const current = periods.find(p => p.isCurrent) || periods[0];
        setActivePeriod(current);
        
        if (current) {
          const reports = await getStudentReportsByClass(db, schoolId, current.id, className);
          const reportsMap: Record<string, StudentReport> = {};
          reports.forEach(r => {
            reportsMap[r.studentId] = r;
          });
          setExistingReports(reportsMap);
        }
      } catch (error) {
        console.error("Failed to load settings", error);
      } finally {
        setIsLoadingSettings(false);
      }
    }
    loadSettings();
  }, [db, schoolId]);

  const handleEnterReport = (student: Student) => {
    setSelectedStudent(student);
  };

  const getOrdinalSuffix = (i: number) => {
    let j = i % 10, k = i % 100;
    if (j === 1 && k !== 11) return i + "st";
    if (j === 2 && k !== 12) return i + "nd";
    if (j === 3 && k !== 13) return i + "rd";
    return i + "th";
  };

  const handleGenerateClassPositions = async () => {
    if (!db || !auth || !schoolId) return;
    setIsGeneratingPositions(true);
    
    try {
      const periods = await getAcademicPeriods(db, schoolId);
      const activePeriod = periods.find(p => p.isCurrent) || periods[0];
      if (!activePeriod) throw new Error("No active academic period found.");
      
      const reports = await getStudentReportsByClass(db, schoolId, activePeriod.id, className);
      if (reports.length === 0) {
        toast({ title: "No Reports", description: "No reports found for this class in the current term.", variant: "destructive" });
        setIsGeneratingPositions(false);
        return;
      }
      
      // Sort descending by total marks
      const sortedReports = [...reports].sort((a, b) => {
        const aTotal = a.summary?.totalMarks || 0;
        const bTotal = b.summary?.totalMarks || 0;
        return bTotal - aTotal;
      });
      
      const highestInClass = sortedReports[0].summary?.totalMarks || 0;
      const lowestInClass = sortedReports[sortedReports.length - 1].summary?.totalMarks || 0;
      const classSize = sortedReports.length;

      let currentRank = 1;
      for (let i = 0; i < sortedReports.length; i++) {
        // Handle ties
        if (i > 0 && sortedReports[i].summary?.totalMarks < sortedReports[i-1].summary?.totalMarks) {
          currentRank = i + 1;
        }
        
        const reportToUpdate = sortedReports[i];
        const updatedReport = {
          ...reportToUpdate,
          summary: {
            ...reportToUpdate.summary,
            classPosition: getOrdinalSuffix(currentRank),
            highestInClass,
            lowestInClass,
            classSize
          }
        };
        
        await saveStudentReport(db, auth, updatedReport);
      }
      
      toast({ title: "Success", description: "Class positions generated successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to generate positions.", variant: "destructive" });
    } finally {
      setIsGeneratingPositions(false);
    }
  };

  const handlePrintReport = async (student: Student) => {
    if (!db || !schoolId) return;
    setIsPrinting(true);
    setStudentToPrint(student);
    try {
      const periods = await getAcademicPeriods(db, schoolId);
      const activePeriod = periods.find(p => p.isCurrent) || periods[0];
      if (!activePeriod) throw new Error("No active academic period found.");
      
      const report = await getStudentReport(db, schoolId, student.studentId, activePeriod.id);
      if (!report) {
        toast({ title: "No Report Found", description: "Please enter a report for this student first.", variant: "destructive" });
        setIsPrinting(false);
        setStudentToPrint(null);
        return;
      }
      
      setReportToPrint(report);
      setActivePeriod(activePeriod);
      // Give React time to render the print component before calling window.print
      setTimeout(() => {
        window.print();
        setIsPrinting(false);
      }, 500);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Could not fetch report for printing.", variant: "destructive" });
      setIsPrinting(false);
      setStudentToPrint(null);
    }
  };

  return (
    <>
    <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm rounded-2xl overflow-hidden print:hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 pb-6 print:bg-white print:border-b-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" /> 
              Student Reports
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              Manage termly reports and academic progress for your students.
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            className="bg-white hover:bg-gray-50 border-gray-200"
            onClick={handleGenerateClassPositions}
            disabled={isGeneratingPositions}
          >
            {isGeneratingPositions ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trophy className="w-4 h-4 mr-2 text-yellow-500" />}
            Generate Class Positions
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="w-[100px] font-semibold text-gray-600">ID</TableHead>
                <TableHead className="font-semibold text-gray-600">Student Name</TableHead>
                <TableHead className="font-semibold text-gray-600">Status</TableHead>
                <TableHead className="text-right font-semibold text-gray-600">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No students enrolled in this class yet.
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow key={student.studentId} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell className="font-medium font-mono text-xs text-gray-500">
                      {student.studentId}
                    </TableCell>
                    <TableCell className="font-semibold text-gray-900">
                      {student.name}
                    </TableCell>
                    <TableCell>
                      {existingReports[student.studentId] ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 shadow-sm">
                          Saved
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 shadow-sm">
                          Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="icon"
                        variant="outline"
                        className="mr-2"
                        onClick={() => handlePrintReport(student)}
                        disabled={isPrinting && studentToPrint?.studentId === student.studentId}
                      >
                        {isPrinting && studentToPrint?.studentId === student.studentId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4 text-gray-600" />}
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                        onClick={() => handleEnterReport(student)}
                      >
                        Enter Report <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {selectedStudent && schoolId && (
        <ReportEntryForm 
          student={selectedStudent}
          schoolId={schoolId}
          className={className}
          settings={settings}
          onClose={() => setSelectedStudent(null)}
          onSaveComplete={() => {
            setSelectedStudent(null);
            // Reload reports
            if (db && schoolId && activePeriod) {
               getStudentReportsByClass(db, schoolId, activePeriod.id, className).then(reports => {
                  const reportsMap: Record<string, StudentReport> = {};
                  reports.forEach(r => { reportsMap[r.studentId] = r; });
                  setExistingReports(reportsMap);
               });
            }
          }}
        />
      )}
    </Card>

    {/* Hidden printable component */}
    {reportToPrint && studentToPrint && (
      <div className="hidden print:block w-full bg-white">
        <GESReportCard 
          report={reportToPrint}
          student={studentToPrint}
          school={schoolDetails}
          period={activePeriod}
        />
      </div>
    )}
    </>
  );
}
