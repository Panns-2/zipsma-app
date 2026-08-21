import React from 'react';
import { StudentReport, Student, School, AcademicPeriod } from '@/lib/data-store';
import { 
  User, 
  Calendar as CalendarIcon, 
  BookOpen, 
  Users, 
  Activity, 
  PlusSquare, 
  MessageSquare, 
  Bookmark, 
  CalendarDays, 
  DollarSign, 
  PenTool, 
  Shield, 
  Users2, 
  Check, 
  Star,
  BookA,
  Music,
  Palette,
  Globe,
  Heart,
  MonitorPlay,
  Pencil
} from 'lucide-react';

interface GESReportCardProps {
  report: StudentReport;
  student: Student;
  school: School | null;
  period?: AcademicPeriod | null;
}

const GradeCheckBoxes = ({ grade }: { grade: string | undefined }) => {
  const grades = ['A', 'B', 'C', 'D', 'E'];
  // Assuming mapped grade strings or raw values. If raw A,B,C,D,E, use it directly.
  let mappedGrade = grade || '';
  if (grade === 'Excellent') mappedGrade = 'A';
  if (grade === 'Very Good') mappedGrade = 'B';
  if (grade === 'Good') mappedGrade = 'C';
  if (grade === 'Developing' || grade === 'Needs Improvement') mappedGrade = 'D'; // Adjust as needed
  
  return (
    <div className="flex justify-around items-center w-full px-2">
      {grades.map(g => (
        <div key={g} className="w-4 h-4 border border-slate-400 flex items-center justify-center bg-white print:border-slate-500">
          {mappedGrade === g || grade === g ? <Check className="w-3 h-3 text-indigo-900 font-bold" /> : null}
        </div>
      ))}
    </div>
  );
}

export const GESReportCard = React.forwardRef<HTMLDivElement, GESReportCardProps>(
  ({ report, student, school, period }, ref) => {
    
    if (!report || !student) return null;

    const isPreschool = report.reportType === 'preschool';
    
    // Core Skills matching Preschool/Primary logic
    const personalSkills = isPreschool 
      ? ['Neatness', 'Punctuality', 'Confidence', 'Participation', 'Social Interaction', 'Respect for Others', 'Self-Control', 'Independence']
      : ['Reading', 'Writing', 'Number Work', 'Creativity', 'Obedience', 'Neatness', 'Punctuality', 'Confidence']; // Expanded for standard to fill grid
      
    const psychomotorSkills = isPreschool
      ? ['Colouring', 'Drawing', 'Cutting & Pasting', 'Pencil Control', 'Building Blocks', 'Physical Activities']
      : ['Handwriting', 'Physical Activities', 'Drawing', 'Participation'];

    const getPersonalGrade = (skill: string) => {
        if (isPreschool) {
            return (report.preschoolPersonalDevelopment as any)?.[skill.toLowerCase().replace(/ /g, '')];
        } else {
            return (report.skills as any)?.[skill.toLowerCase().replace(' ', '')];
        }
    };
    
    const getPsychomotorGrade = (skill: string) => {
        if (isPreschool) {
            return (report.preschoolPsychomotorSkills as any)?.[skill.toLowerCase().replace(/ /g, '')];
        } else {
            return (report.skills as any)?.[skill.toLowerCase().replace(' ', '')]; // Fallback for standard
        }
    };

    return (
      <div 
        ref={ref} 
        className="w-full bg-white text-slate-900 p-6 mx-auto font-sans shadow-lg print:shadow-none print:p-0"
        style={{
            maxWidth: '210mm',
            // Allow it to size naturally, but aim for A4
            boxSizing: 'border-box',
        }}
      >
        {/* Outer Border wrapper matching design */}
        <div className="border-[6px] border-[#0a235c] rounded-2xl p-1 w-full relative bg-white">
          <div className="border-4 border-[#d4af37] rounded-xl p-2 sm:p-3 w-full flex flex-col relative z-10 overflow-hidden">
            
            {/* Background Decorations (simulated) */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-bl-full opacity-20 -z-10 print:opacity-40"></div>
            <div className="absolute top-0 left-0 w-48 h-48 bg-blue-100 rounded-br-full opacity-20 -z-10 print:opacity-40"></div>

            {/* Header Section */}
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="w-1/4 flex justify-center shrink-0">
                {school?.logoUrl ? (
                  <img src={school.logoUrl} alt="School Logo" className="w-20 h-20 object-contain" />
                ) : (
                  <Shield className="w-16 h-16 text-[#0a235c]" />
                )}
              </div>
              <div className="w-1/2 text-center flex flex-col items-center shrink-0">
                <h1 className="text-2xl sm:text-3xl font-black text-[#0a235c] uppercase leading-tight shrink-0">{school?.name || 'EDUCATION CENTRE'}</h1>
                <p className="text-[#d4af37] font-bold italic text-xs mb-1 shrink-0">{school?.schoolEmail ? `Contact: ${school.schoolEmail}` : 'Starting Right: The Way to Excellence'}</p>
                <div className="bg-[#0a235c] text-white px-4 py-1 rounded-sm shadow-sm inline-block mt-1 shrink-0">
                    <h2 className="text-sm sm:text-base font-bold tracking-widest uppercase">Term-End Report Sheet</h2>
                </div>
                <div className="flex gap-2 mt-1 shrink-0">
                    <Star className="w-3 h-3 fill-[#d4af37] text-[#d4af37]" />
                    <Star className="w-3 h-3 fill-[#d4af37] text-[#d4af37]" />
                    <Star className="w-3 h-3 fill-[#d4af37] text-[#d4af37]" />
                </div>
              </div>
              <div className="w-1/4 flex justify-center items-center opacity-80 shrink-0">
                  <div className="grid grid-cols-2 gap-1 text-[#0a235c]">
                      <BookA className="w-6 h-6" />
                      <PenTool className="w-6 h-6" />
                  </div>
              </div>
            </div>

            {/* Top Grid: Student Info & Attendance/Key */}
            <div className="grid grid-cols-12 gap-3 mb-3 shrink-0">
              
              {/* Student Info */}
              <div className="col-span-7 border border-[#0a235c] rounded-lg overflow-hidden flex flex-col bg-white">
                <div className="bg-[#0a235c] text-white p-1.5 flex items-center gap-2">
                  <div className="bg-white rounded-full p-0.5"><User className="w-4 h-4 text-[#0a235c]" /></div>
                  <span className="font-bold text-xs tracking-wider uppercase">Student Information</span>
                </div>
                <div className="p-3 text-xs grid grid-cols-[100px_10px_1fr] gap-y-2 font-medium">
                  <span className="text-[#0a235c]">Student's Name</span> <span>:</span> <span className="border-b border-gray-300 font-bold">{student.name}</span>
                  <span className="text-[#0a235c]">Admission No.</span> <span>:</span> <span className="border-b border-gray-300 font-bold">{student.studentId}</span>
                  <span className="text-[#0a235c]">Class</span> <span>:</span> <span className="border-b border-gray-300 font-bold">{report.className}</span>
                  <span className="text-[#0a235c]">Academic Year</span> <span>:</span> <span className="border-b border-gray-300 font-bold">{report.academicYear}</span>
                  <span className="text-[#0a235c]">Term</span> <span>:</span> 
                  <span className="border-b border-gray-300 font-bold flex gap-4">
                     <span className="flex items-center gap-1"><div className={`w-3 h-3 rounded-full border border-gray-400 flex items-center justify-center ${report.term?.includes('First') ? 'bg-[#0a235c]' : ''}`}></div> First</span>
                     <span className="flex items-center gap-1"><div className={`w-3 h-3 rounded-full border border-gray-400 flex items-center justify-center ${report.term?.includes('Second') ? 'bg-[#0a235c]' : ''}`}></div> Second</span>
                     <span className="flex items-center gap-1"><div className={`w-3 h-3 rounded-full border border-gray-400 flex items-center justify-center ${report.term?.includes('Third') ? 'bg-[#0a235c]' : ''}`}></div> Third</span>
                  </span>
                  <span className="text-[#0a235c]">Date of Birth</span> <span>:</span> <span className="border-b border-gray-300 font-bold">{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-GB') : 'N/A'}</span>
                </div>
              </div>

              {/* Attendance & Grading Key wrapper */}
              <div className="col-span-5 flex flex-col justify-between gap-2">
                {/* Attendance */}
                <div className="border border-[#0a235c] rounded-lg overflow-hidden flex flex-row h-1/2 bg-white">
                  <div className="bg-blue-100 w-1/3 flex flex-col items-center justify-center p-2 text-[#0a235c] border-r border-[#0a235c]">
                    <CalendarIcon className="w-5 h-5 mb-1" />
                    <span className="font-bold text-[10px] uppercase text-center leading-tight">Attendance</span>
                  </div>
                  <div className="w-2/3 p-2 text-[10px] grid grid-cols-[1fr_30px] gap-y-1 items-center font-medium text-[#0a235c]">
                    <span>Present Days</span> <span className="border border-gray-400 w-full h-5 flex items-center justify-center font-bold">{report.attendance?.daysPresent || ''}</span>
                    <span>Absent Days</span> <span className="border border-gray-400 w-full h-5 flex items-center justify-center font-bold">{report.attendance?.daysAbsent || ''}</span>
                    <span>Total Days</span> <span className="border border-gray-400 w-full h-5 flex items-center justify-center font-bold">{report.attendance?.daysOpened || ''}</span>
                  </div>
                </div>

                {/* Grading Key */}
                <div className="border border-[#0a235c] rounded-lg overflow-hidden h-1/2 bg-white">
                    <div className="bg-[#0a235c] text-white text-[10px] font-bold text-center py-1 uppercase tracking-wider">Grading Key</div>
                    <div className="grid grid-cols-[20px_1fr] text-[9px] font-medium leading-[14px]">
                        <div className="bg-blue-50 text-center font-bold text-[#0a235c] border-r border-b border-[#0a235c]">A</div><div className="pl-2 border-b border-slate-200">Excellent</div>
                        <div className="bg-blue-50 text-center font-bold text-[#0a235c] border-r border-b border-[#0a235c]">B</div><div className="pl-2 border-b border-slate-200">Very Good</div>
                        <div className="bg-blue-50 text-center font-bold text-[#0a235c] border-r border-b border-[#0a235c]">C</div><div className="pl-2 border-b border-slate-200">Good</div>
                        <div className="bg-blue-50 text-center font-bold text-[#0a235c] border-r border-b border-[#0a235c]">D</div><div className="pl-2 border-b border-slate-200">Developing</div>
                        <div className="bg-blue-50 text-center font-bold text-[#0a235c] border-r border-[#0a235c]">E</div><div className="pl-2">Needs Improvement</div>
                    </div>
                </div>
              </div>
            </div>

            {/* Middle Section: Academic & Personal/Psychomotor */}
            <div className="grid grid-cols-12 gap-3 mb-2 shrink-0">
              
              {/* Academic Development (Left Column) */}
              <div className="col-span-6 flex flex-col">
                <div className="border border-[#0a235c] rounded-lg overflow-hidden h-full flex flex-col bg-white">
                  <div className="bg-[#0a235c] text-white p-1.5 flex items-center gap-2">
                    <div className="bg-white rounded-full p-0.5"><BookOpen className="w-4 h-4 text-[#0a235c]" /></div>
                    <span className="font-bold text-xs tracking-wider uppercase">Academic Development</span>
                  </div>
                  <table className="w-full text-[10px] flex-1">
                    <thead className="bg-blue-50 text-[#0a235c] border-b border-[#0a235c] font-bold uppercase text-[9px]">
                      <tr>
                        <th className="py-1 px-2 text-left border-r border-[#0a235c]">Learning Area</th>
                        <th className="py-1 px-1 text-center border-r border-[#0a235c] w-12">Grade</th>
                        <th className="py-1 px-2 text-center">Teacher's Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.subjects?.map((sub, idx) => (
                        <tr key={idx} className="border-b border-slate-300 last:border-b-0 text-[#0a235c] font-medium">
                          <td className="py-1 px-2 border-r border-[#0a235c] flex items-center gap-2">
                             {/* Attempt to assign icon based on name rudimentarily, otherwise default */}
                             {sub.name.includes('Lit') || sub.name.includes('Read') ? <BookA className="w-3 h-3 shrink-0 text-[#d4af37]" /> :
                              sub.name.includes('Num') || sub.name.includes('Math') ? <div className="text-[#d4af37] font-black text-[10px] shrink-0">123</div> :
                              sub.name.includes('Oral') || sub.name.includes('Lang') ? <MessageSquare className="w-3 h-3 shrink-0 text-blue-500" /> :
                              sub.name.includes('Music') || sub.name.includes('Rhym') ? <Music className="w-3 h-3 shrink-0 text-purple-500" /> :
                              sub.name.includes('Art') || sub.name.includes('Creat') ? <Palette className="w-3 h-3 shrink-0 text-orange-500" /> :
                              sub.name.includes('Env') || sub.name.includes('Science') ? <Globe className="w-3 h-3 shrink-0 text-green-500" /> :
                              sub.name.includes('Relig') || sub.name.includes('Moral') ? <Heart className="w-3 h-3 shrink-0 text-red-500" /> :
                              sub.name.includes('ICT') || sub.name.includes('Comp') ? <MonitorPlay className="w-3 h-3 shrink-0 text-blue-400" /> :
                              sub.name.includes('Writ') || sub.name.includes('Hand') ? <Pencil className="w-3 h-3 shrink-0 text-[#d4af37]" /> :
                              <Bookmark className="w-3 h-3 shrink-0 text-slate-400" />
                             }
                             <span>{sub.name}</span>
                          </td>
                          <td className="py-1 px-1 border-r border-[#0a235c] text-center font-bold bg-blue-50/50">{sub.grade}</td>
                          <td className="py-1 px-2 italic text-[9px] text-slate-600 leading-tight">{sub.remark}</td>
                        </tr>
                      ))}
                      {/* Fill empty rows if less than 10 subjects */}
                      {Array.from({ length: Math.max(0, 10 - (report.subjects?.length || 0)) }).map((_, i) => (
                          <tr key={`empty-${i}`} className="border-b border-slate-300 last:border-b-0">
                              <td className="py-1 px-2 border-r border-[#0a235c] h-[22px]"></td>
                              <td className="py-1 px-1 border-r border-[#0a235c] bg-blue-50/50"></td>
                              <td className="py-1 px-2"></td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Personal & Psychomotor (Right Column) */}
              <div className="col-span-6 flex flex-col gap-2">
                
                {/* Personal Development */}
                <div className="border border-[#0a235c] rounded-lg overflow-hidden bg-white">
                  <div className="bg-[#0a235c] text-white p-1.5 flex items-center gap-2">
                    <div className="bg-white rounded-full p-0.5"><Users className="w-4 h-4 text-[#0a235c]" /></div>
                    <span className="font-bold text-xs tracking-wider uppercase">Personal Development</span>
                  </div>
                  <table className="w-full text-[10px]">
                    <thead className="bg-[#0a235c] text-white font-bold text-[9px]">
                      <tr>
                        <th className="py-1 px-2 text-left bg-white text-[#0a235c]"></th>
                        <th className="py-1 border-l border-r border-blue-400 w-6 text-center">A</th>
                        <th className="py-1 border-r border-blue-400 w-6 text-center">B</th>
                        <th className="py-1 border-r border-blue-400 w-6 text-center">C</th>
                        <th className="py-1 border-r border-blue-400 w-6 text-center">D</th>
                        <th className="py-1 w-6 text-center">E</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personalSkills.map((skill, idx) => (
                        <tr key={idx} className="border-b border-slate-200 last:border-b-0 text-[#0a235c] font-medium">
                          <td className="py-1 px-2 border-r border-[#0a235c] flex items-center gap-2">
                             <User className="w-3 h-3 text-[#0a235c] shrink-0" />
                             <span>{skill}</span>
                          </td>
                          <td colSpan={5} className="bg-blue-50/20 py-1">
                             <GradeCheckBoxes grade={getPersonalGrade(skill)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Psychomotor Skills */}
                <div className="border border-[#0a235c] rounded-lg overflow-hidden bg-white flex-1 flex flex-col">
                  <div className="bg-[#0a235c] text-white p-1.5 flex items-center gap-2">
                    <div className="bg-white rounded-full p-0.5"><Activity className="w-4 h-4 text-[#0a235c]" /></div>
                    <span className="font-bold text-xs tracking-wider uppercase">{isPreschool ? 'Psychomotor Skills' : 'Core Behaviors'}</span>
                  </div>
                  <table className="w-full text-[10px] flex-1">
                    <thead className="bg-[#0a235c] text-white font-bold text-[9px]">
                      <tr>
                        <th className="py-1 px-2 text-left bg-white text-[#0a235c]"></th>
                        <th className="py-1 border-l border-r border-blue-400 w-6 text-center">A</th>
                        <th className="py-1 border-r border-blue-400 w-6 text-center">B</th>
                        <th className="py-1 border-r border-blue-400 w-6 text-center">C</th>
                        <th className="py-1 border-r border-blue-400 w-6 text-center">D</th>
                        <th className="py-1 w-6 text-center">E</th>
                      </tr>
                    </thead>
                    <tbody>
                      {psychomotorSkills.map((skill, idx) => (
                        <tr key={idx} className="border-b border-slate-200 last:border-b-0 text-[#0a235c] font-medium">
                          <td className="py-1 px-2 border-r border-[#0a235c] flex items-center gap-2">
                             <Activity className="w-3 h-3 text-[#0a235c] shrink-0" />
                             <span>{skill}</span>
                          </td>
                          <td colSpan={5} className="bg-blue-50/20 py-1">
                             <GradeCheckBoxes grade={getPsychomotorGrade(skill)} />
                          </td>
                        </tr>
                      ))}
                      {/* Fill empty rows if less than 6 to match height visually */}
                      {Array.from({ length: Math.max(0, 6 - psychomotorSkills.length) }).map((_, i) => (
                          <tr key={`empty-psy-${i}`} className="border-b border-slate-200 last:border-b-0">
                              <td className="py-1 px-2 border-r border-[#0a235c] h-[22px]"></td>
                              <td colSpan={5} className="bg-blue-50/20 py-1"></td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>

            {/* Health Record */}
            <div className="border border-[#0a235c] rounded-lg overflow-hidden mb-2 bg-white shrink-0">
              <div className="bg-[#0a235c] text-white p-1.5 flex items-center gap-2">
                <div className="bg-white rounded-full p-0.5"><PlusSquare className="w-4 h-4 text-[#0a235c]" /></div>
                <span className="font-bold text-xs tracking-wider uppercase">Health Record</span>
              </div>
              <div className="p-2 px-4 text-[10px] grid grid-cols-12 gap-4 text-[#0a235c] font-medium bg-blue-50/10">
                 <div className="col-span-3 grid grid-cols-2 gap-y-2 items-center">
                    <span>General Health</span>
                    <div className="flex gap-4 col-span-2 mt-1">
                       <span className="flex items-center gap-1"><div className={`w-3 h-3 rounded-full border border-gray-400 flex items-center justify-center ${report.healthRecord?.generalHealth === 'Excellent' ? 'bg-[#0a235c]' : ''}`}></div> Excellent</span>
                       <span className="flex items-center gap-1"><div className={`w-3 h-3 rounded-full border border-gray-400 flex items-center justify-center ${report.healthRecord?.generalHealth === 'Good' ? 'bg-[#0a235c]' : ''}`}></div> Good</span>
                       <span className="flex items-center gap-1"><div className={`w-3 h-3 rounded-full border border-gray-400 flex items-center justify-center ${report.healthRecord?.generalHealth === 'Fair' ? 'bg-[#0a235c]' : ''}`}></div> Fair</span>
                    </div>
                 </div>
                 <div className="col-span-3 grid grid-cols-1 gap-y-2">
                    <div className="flex items-center justify-between">
                       <span>Vision</span>
                       <div className="flex gap-2">
                           <span className="flex items-center gap-1"><div className={`w-3 h-3 rounded-full border border-gray-400 flex items-center justify-center ${report.healthRecord?.vision === 'Good' ? 'bg-[#0a235c]' : ''}`}></div> Good</span>
                           <span className="flex items-center gap-1"><div className={`w-3 h-3 rounded-full border border-gray-400 flex items-center justify-center ${report.healthRecord?.vision === 'Needs Attention' ? 'bg-[#0a235c]' : ''}`}></div> Needs Attention</span>
                       </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                       <span>Hearing</span>
                       <div className="flex gap-2">
                           <span className="flex items-center gap-1"><div className={`w-3 h-3 rounded-full border border-gray-400 flex items-center justify-center ${report.healthRecord?.hearing === 'Good' ? 'bg-[#0a235c]' : ''}`}></div> Good</span>
                           <span className="flex items-center gap-1"><div className={`w-3 h-3 rounded-full border border-gray-400 flex items-center justify-center ${report.healthRecord?.hearing === 'Needs Attention' ? 'bg-[#0a235c]' : ''}`}></div> Needs Attention</span>
                       </div>
                    </div>
                 </div>
                 <div className="col-span-6 flex flex-col border-l border-slate-300 pl-4">
                    <span className="mb-1">Teacher's Observation</span>
                    <span className="border-b border-gray-300 flex-1 w-full text-slate-700 italic flex items-end pb-1">{report.healthRecord?.observation || ''}</span>
                 </div>
              </div>
            </div>

            {/* Comments Grid */}
            <div className="grid grid-cols-2 gap-3 mb-2 shrink-0">
                <div className="border border-[#0a235c] rounded-lg overflow-hidden bg-white">
                    <div className="bg-[#0a235c] text-white p-1.5 flex items-center gap-2">
                        <div className="bg-white rounded-full p-0.5"><User className="w-4 h-4 text-[#0a235c]" /></div>
                        <span className="font-bold text-xs tracking-wider uppercase">Teacher's Comment</span>
                    </div>
                    <div className="p-2 pb-1 flex flex-col gap-2 min-h-[45px]">
                        <div className="border-b border-gray-400 text-xs italic text-[#0a235c] min-h-[16px]">{report.remarks?.teacherRemark || ''}</div>
                        <div className="border-b border-gray-400 min-h-[16px]"></div>
                    </div>
                </div>
                <div className="border border-[#0a235c] rounded-lg overflow-hidden bg-white">
                    <div className="bg-[#0a235c] text-white p-1.5 flex items-center gap-2">
                        <div className="bg-white rounded-full p-0.5"><Bookmark className="w-4 h-4 text-[#0a235c]" /></div>
                        <span className="font-bold text-xs tracking-wider uppercase">Head Teacher's Comment</span>
                    </div>
                    <div className="p-2 pb-1 flex flex-col gap-2 min-h-[45px]">
                        <div className="border-b border-gray-400 text-xs italic text-[#0a235c] min-h-[16px]">{report.remarks?.headTeacherRemark || ''}</div>
                        <div className="border-b border-gray-400 min-h-[16px]"></div>
                    </div>
                </div>
            </div>

            {/* Next Term Info & Signatures Row */}
            <div className="grid grid-cols-12 gap-3 mb-1 mt-auto shrink-0">
                <div className="col-span-5 border border-[#0a235c] rounded-lg overflow-hidden flex flex-col bg-white">
                    <div className="bg-blue-50 p-2 flex items-center gap-2 border-b border-slate-200">
                        <div className="bg-[#0a235c] rounded-md p-1"><CalendarDays className="w-4 h-4 text-white" /></div>
                        <span className="font-bold text-xs text-[#0a235c] uppercase">Next Term Information</span>
                    </div>
                    <div className="p-2 text-[10px] grid grid-cols-[100px_1fr] gap-y-2 font-medium text-[#0a235c]">
                        <span>Next Term Begins</span> <span className="border-b border-gray-400 font-bold">{report.nextTermInfo?.begins || (period?.nextTermBegins ? new Date(period.nextTermBegins).toDateString() : '')}</span>
                        <span>School Reopens</span> <span className="border-b border-gray-400 font-bold">{report.nextTermInfo?.reopens || ''}</span>
                    </div>
                </div>

                <div className="col-span-7 flex flex-col gap-3">
                    {/* Fees row */}
                    <div className="border border-[#0a235c] rounded-lg overflow-hidden flex items-center bg-white p-1 pr-3">
                        <div className="bg-[#0a235c] rounded-full p-1.5 mr-3"><DollarSign className="w-4 h-4 text-white" /></div>
                        <span className="font-bold text-[10px] text-[#0a235c] uppercase flex-1">School Fees Outstanding</span>
                        <span className="font-bold text-xs text-[#0a235c]">GH₵</span>
                        <span className="border-b border-gray-400 w-24 ml-2 text-center font-bold text-[#0a235c]">{report.nextTermInfo?.feesOutstanding || ''}</span>
                    </div>

                    {/* Signatures */}
                    <div className="flex justify-between items-end mt-auto px-2">
                        <div className="flex flex-col gap-1 w-[30%]">
                            <div className="flex items-center gap-1 text-[#0a235c] font-bold text-[10px] uppercase">
                                <div className="bg-[#0a235c] rounded-full p-1"><PenTool className="w-3 h-3 text-white" /></div> Class Teacher
                            </div>
                            <div className="border-b border-gray-400 mt-2 w-full"></div>
                            <div className="flex text-[9px] text-slate-500 mt-1">Date: <span className="border-b border-gray-400 w-full ml-1"></span></div>
                        </div>
                        <div className="flex flex-col gap-1 w-[30%]">
                            <div className="flex items-center gap-1 text-[#0a235c] font-bold text-[10px] uppercase">
                                <div className="bg-[#0a235c] rounded-full p-1"><Shield className="w-3 h-3 text-white" /></div> Head Teacher
                            </div>
                            <div className="border-b border-gray-400 mt-2 w-full"></div>
                            <div className="flex text-[9px] text-slate-500 mt-1">Date: <span className="border-b border-gray-400 w-full ml-1"></span></div>
                        </div>
                        <div className="flex flex-col gap-1 w-[30%]">
                            <div className="flex items-center gap-1 text-[#0a235c] font-bold text-[10px] uppercase">
                                <div className="bg-[#0a235c] rounded-full p-1"><Users2 className="w-3 h-3 text-white" /></div> Parent / Guardian
                            </div>
                            <div className="border-b border-gray-400 mt-2 w-full"></div>
                            <div className="flex text-[9px] text-slate-500 mt-1">Date: <span className="border-b border-gray-400 w-full ml-1"></span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Ribbon */}
            <div className="bg-[#0a235c] text-[#d4af37] text-center py-1.5 mt-2 rounded-sm text-[10px] font-serif italic font-bold flex justify-center items-center gap-4 shrink-0">
                <Heart className="w-3 h-3 fill-[#d4af37]" />
                Thank you for partnering with us in your child's early learning journey.
                <div className="flex gap-1">
                    <Star className="w-3 h-3 fill-[#d4af37]" />
                    <Star className="w-3 h-3 fill-[#d4af37]" />
                    <Star className="w-3 h-3 fill-[#d4af37]" />
                </div>
            </div>

          </div>
        </div>
      </div>
    );
  }
);

GESReportCard.displayName = 'GESReportCard';
