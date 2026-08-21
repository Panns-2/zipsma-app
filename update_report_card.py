import re

file_path = "f:/App Development/ZipSMA/src/components/class-dashboard/ges-report-card.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add isPreschool variable
if "const isPreschool =" not in content:
    content = content.replace(
        "if (!report || !student) return null;",
        "if (!report || !student) return null;\n\n    const isPreschool = report.reportType === 'preschool';"
    )

# 2. Update Table Headers
if "{!isPreschool && <th className=\"p-3" not in content:
    old_th = """<th className="p-3 text-left font-semibold border-b border-slate-200 w-1/3">Subject</th>
                  <th className="p-3 text-center font-semibold border-b border-slate-200">Class Marks (50)</th>
                  <th className="p-3 text-center font-semibold border-b border-slate-200">Exam Marks (50)</th>
                  <th className="p-3 text-center font-semibold border-b border-slate-200 text-indigo-900">Total Score (100)</th>
                  <th className="p-3 text-center font-semibold border-b border-slate-200">Grade</th>
                  <th className="p-3 text-left font-semibold border-b border-slate-200 w-1/4">Remarks</th>"""
    
    new_th = """<th className="p-3 text-left font-semibold border-b border-slate-200 w-1/3">Subject</th>
                  {!isPreschool && <th className="p-3 text-center font-semibold border-b border-slate-200">Class Marks (50)</th>}
                  {!isPreschool && <th className="p-3 text-center font-semibold border-b border-slate-200">Exam Marks (50)</th>}
                  {!isPreschool && <th className="p-3 text-center font-semibold border-b border-slate-200 text-indigo-900">Total Score (100)</th>}
                  <th className="p-3 text-center font-semibold border-b border-slate-200">Grade</th>
                  <th className="p-3 text-left font-semibold border-b border-slate-200 w-1/4">Remarks</th>"""
    content = content.replace(old_th, new_th)

# 3. Update Table Rows
if "{!isPreschool && <td className=\"p-3" not in content:
    old_td = """<td className="p-3 font-medium text-slate-900 border-b border-slate-100">{sub.name}</td>
                    <td className="p-3 text-center text-slate-600 border-b border-slate-100">{sub.classAssessmentScore}</td>
                    <td className="p-3 text-center text-slate-600 border-b border-slate-100">{sub.examScore}</td>
                    <td className="p-3 text-center font-bold text-indigo-700 border-b border-slate-100 bg-indigo-50/30">{sub.totalScore}</td>
                    <td className="p-3 text-center font-bold text-slate-800 border-b border-slate-100">{sub.grade}</td>
                    <td className="p-3 text-xs text-slate-600 border-b border-slate-100 italic">{sub.remark}</td>"""
    
    new_td = """<td className="p-3 font-medium text-slate-900 border-b border-slate-100">{sub.name}</td>
                    {!isPreschool && <td className="p-3 text-center text-slate-600 border-b border-slate-100">{sub.classAssessmentScore}</td>}
                    {!isPreschool && <td className="p-3 text-center text-slate-600 border-b border-slate-100">{sub.examScore}</td>}
                    {!isPreschool && <td className="p-3 text-center font-bold text-indigo-700 border-b border-slate-100 bg-indigo-50/30">{sub.totalScore}</td>}
                    <td className="p-3 text-center font-bold text-slate-800 border-b border-slate-100">{sub.grade}</td>
                    <td className="p-3 text-xs text-slate-600 border-b border-slate-100 italic">{sub.remark}</td>"""
    content = content.replace(old_td, new_td)

# 4. Hide Overall Summary for Preschool
if "{!isPreschool && (" not in content and "Overall Academic Summary" in content:
    old_summary = """{/* Overall Academic Summary */}
        <div className="flex gap-4 mb-8 justify-between bg-indigo-900 text-white p-5 rounded-xl shadow-md">
          <div className="flex flex-col">
            <span className="text-indigo-200 text-xs uppercase tracking-wider mb-1">Total Marks</span>
            <span className="text-2xl font-bold">{report.summary?.totalMarks}</span>
          </div>
          <div className="w-px bg-indigo-700/50 my-1"></div>
          <div className="flex flex-col">
            <span className="text-indigo-200 text-xs uppercase tracking-wider mb-1">Average Score</span>
            <span className="text-2xl font-bold">{report.summary?.averageScore}%</span>
          </div>
          <div className="w-px bg-indigo-700/50 my-1"></div>
          <div className="flex flex-col text-right">
            <span className="text-indigo-200 text-xs uppercase tracking-wider mb-1">Class Position</span>
            <span className="text-2xl font-bold">{report.summary?.classPosition || 'N/A'} <span className="text-sm font-normal text-indigo-200">out of {report.summary?.classSize || 'N/A'}</span></span>
          </div>
        </div>"""
    new_summary = """{/* Overall Academic Summary */}
        {!isPreschool && (
          <div className="flex gap-4 mb-8 justify-between bg-indigo-900 text-white p-5 rounded-xl shadow-md">
            <div className="flex flex-col">
              <span className="text-indigo-200 text-xs uppercase tracking-wider mb-1">Total Marks</span>
              <span className="text-2xl font-bold">{report.summary?.totalMarks}</span>
            </div>
            <div className="w-px bg-indigo-700/50 my-1"></div>
            <div className="flex flex-col">
              <span className="text-indigo-200 text-xs uppercase tracking-wider mb-1">Average Score</span>
              <span className="text-2xl font-bold">{report.summary?.averageScore}%</span>
            </div>
            <div className="w-px bg-indigo-700/50 my-1"></div>
            <div className="flex flex-col text-right">
              <span className="text-indigo-200 text-xs uppercase tracking-wider mb-1">Class Position</span>
              <span className="text-2xl font-bold">{report.summary?.classPosition || 'N/A'} <span className="text-sm font-normal text-indigo-200">out of {report.summary?.classSize || 'N/A'}</span></span>
            </div>
          </div>
        )}"""
    content = content.replace(old_summary, new_summary)

# 5. Skills and Behaviour Grid
if "Personal Development" not in content and "Core Skills" in content:
    old_skills = """{/* Skills and Behaviour Grid */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-indigo-900 tracking-wider uppercase text-xs mb-3 border-b-2 border-indigo-100 pb-1">Core Skills</h3>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-1">
              <table className="w-full border-collapse text-xs">
                <tbody>
                  {['Reading', 'Writing', 'Number Work', 'Creativity'].map(skill => (
                    <tr key={skill} className="border-b last:border-b-0 border-slate-100">
                      <td className="p-2 font-medium text-slate-600 w-1/2">{skill}</td>
                      <td className="p-2 font-semibold text-slate-900 text-right">{(report.skills as any)?.[skill.toLowerCase().replace(' ', '')] || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-indigo-900 tracking-wider uppercase text-xs mb-3 border-b-2 border-indigo-100 pb-1">Affective & Behaviour</h3>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-1">
              <table className="w-full border-collapse text-xs">
                <tbody>
                  {['Obedience', 'Neatness', 'Punctuality'].map(skill => (
                    <tr key={skill} className="border-b last:border-b-0 border-slate-100">
                      <td className="p-2 font-medium text-slate-600 w-1/2">{skill}</td>
                      <td className="p-2 font-semibold text-slate-900 text-right">{(report.skills as any)?.[skill.toLowerCase().replace(' ', '')] || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>"""
        
    new_skills = """{/* Skills and Behaviour Grid */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-indigo-900 tracking-wider uppercase text-xs mb-3 border-b-2 border-indigo-100 pb-1">{isPreschool ? 'Personal Development' : 'Core Skills'}</h3>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-1">
              <table className="w-full border-collapse text-xs">
                <tbody>
                  {isPreschool ? (
                    ['Neatness', 'Punctuality', 'Confidence', 'Participation', 'Social Interaction', 'Respect for Others', 'Self-Control', 'Independence'].map(skill => (
                      <tr key={skill} className="border-b last:border-b-0 border-slate-100">
                        <td className="p-2 font-medium text-slate-600 w-1/2">{skill}</td>
                        <td className="p-2 font-semibold text-slate-900 text-right">{(report.preschoolPersonalDevelopment as any)?.[skill.toLowerCase().replace(/ /g, '')] || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    ['Reading', 'Writing', 'Number Work', 'Creativity'].map(skill => (
                      <tr key={skill} className="border-b last:border-b-0 border-slate-100">
                        <td className="p-2 font-medium text-slate-600 w-1/2">{skill}</td>
                        <td className="p-2 font-semibold text-slate-900 text-right">{(report.skills as any)?.[skill.toLowerCase().replace(' ', '')] || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-indigo-900 tracking-wider uppercase text-xs mb-3 border-b-2 border-indigo-100 pb-1">{isPreschool ? 'Psychomotor Skills' : 'Affective & Behaviour'}</h3>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-1">
              <table className="w-full border-collapse text-xs">
                <tbody>
                  {isPreschool ? (
                    ['Colouring', 'Drawing', 'Cutting & Pasting', 'Pencil Control', 'Building Blocks', 'Physical Activities'].map(skill => (
                      <tr key={skill} className="border-b last:border-b-0 border-slate-100">
                        <td className="p-2 font-medium text-slate-600 w-1/2">{skill}</td>
                        <td className="p-2 font-semibold text-slate-900 text-right">{(report.preschoolPsychomotorSkills as any)?.[skill.toLowerCase().replace(/ /g, '')] || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    ['Obedience', 'Neatness', 'Punctuality'].map(skill => (
                      <tr key={skill} className="border-b last:border-b-0 border-slate-100">
                        <td className="p-2 font-medium text-slate-600 w-1/2">{skill}</td>
                        <td className="p-2 font-semibold text-slate-900 text-right">{(report.skills as any)?.[skill.toLowerCase().replace(' ', '')] || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Health Record Grid (Preschool only) */}
        {isPreschool && (
          <div className="mb-8">
            <h3 className="font-bold text-indigo-900 tracking-wider uppercase text-xs mb-3 border-b-2 border-indigo-100 pb-1">Health Record</h3>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 font-medium block">General Health:</span>
                <span className="font-semibold text-slate-800">{report.healthRecord?.generalHealth || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Vision:</span>
                <span className="font-semibold text-slate-800">{report.healthRecord?.vision || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Hearing:</span>
                <span className="font-semibold text-slate-800">{report.healthRecord?.hearing || '-'}</span>
              </div>
              <div className="col-span-3 mt-2 border-t border-slate-200 pt-2">
                <span className="text-slate-500 font-medium block">Teacher's Observation:</span>
                <span className="italic text-slate-700">{report.healthRecord?.observation || 'No specific observations.'}</span>
              </div>
            </div>
          </div>
        )}"""
        
    content = content.replace(old_skills, new_skills)

# 6. Term Dates Section (to include custom overrrides and fees)
if "feesOutstanding" not in content and "Term Dates Section" in content:
    old_dates = """{/* Term Dates Section */}
        <div className="flex justify-between mb-8 p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg shadow-sm">
            <div className="text-sm">
                <span className="text-slate-500 font-medium">Vacation Date:</span> 
                <span className="ml-2 font-semibold text-slate-800">{period?.vacationDate ? new Date(period.vacationDate).toDateString() : 'To Be Announced'}</span>
            </div>
            <div className="w-px bg-indigo-200"></div>
            <div className="text-sm">
                <span className="text-slate-500 font-medium">Next Term Resumes:</span> 
                <span className="ml-2 font-semibold text-slate-800">{period?.nextTermBegins ? new Date(period.nextTermBegins).toDateString() : 'To Be Announced'}</span>
            </div>
        </div>"""
    new_dates = """{/* Term Dates Section */}
        <div className="flex flex-wrap gap-4 justify-between mb-8 p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg shadow-sm">
            <div className="text-sm">
                <span className="text-slate-500 font-medium">Vacation Date:</span> 
                <span className="ml-2 font-semibold text-slate-800">{report.nextTermInfo?.begins || (period?.vacationDate ? new Date(period.vacationDate).toDateString() : 'To Be Announced')}</span>
            </div>
            <div className="w-px bg-indigo-200 hidden md:block"></div>
            <div className="text-sm">
                <span className="text-slate-500 font-medium">Next Term Resumes:</span> 
                <span className="ml-2 font-semibold text-slate-800">{report.nextTermInfo?.reopens || (period?.nextTermBegins ? new Date(period.nextTermBegins).toDateString() : 'To Be Announced')}</span>
            </div>
            {report.nextTermInfo?.feesOutstanding && (
              <>
                <div className="w-px bg-indigo-200 hidden md:block"></div>
                <div className="text-sm">
                    <span className="text-slate-500 font-medium">Fees Outstanding:</span> 
                    <span className="ml-2 font-bold text-red-600">GH₵ {report.nextTermInfo.feesOutstanding}</span>
                </div>
              </>
            )}
        </div>"""
    content = content.replace(old_dates, new_dates)

# 7. GES Grading Scale Legend
if "Preschool Grading:" not in content and "GES Grading Scale Legend" in content:
    old_legend = """{/* GES Grading Scale Legend */}
        <div className="mt-auto border-t border-slate-200 pt-4 text-[10px] text-slate-500 flex flex-wrap gap-x-4 gap-y-2 justify-center bg-slate-50 rounded p-2">
          <span className="font-bold text-slate-700 uppercase">GES Grading:</span>
          <span><span className="font-bold text-slate-800">80-100:</span> A (Excellent)</span>
          <span><span className="font-bold text-slate-800">70-79:</span> B (Very Good)</span>
          <span><span className="font-bold text-slate-800">60-69:</span> C (Good)</span>
          <span><span className="font-bold text-slate-800">50-59:</span> D (Credit)</span>
          <span><span className="font-bold text-slate-800">40-49:</span> E (Pass)</span>
          <span><span className="font-bold text-slate-800">0-39:</span> F (Fail)</span>
        </div>"""
    new_legend = """{/* GES Grading Scale Legend */}
        <div className="mt-auto border-t border-slate-200 pt-4 text-[10px] text-slate-500 flex flex-wrap gap-x-4 gap-y-2 justify-center bg-slate-50 rounded p-2">
          {isPreschool ? (
            <>
              <span className="font-bold text-slate-700 uppercase">Preschool Grading:</span>
              <span><span className="font-bold text-slate-800">A:</span> Excellent</span>
              <span><span className="font-bold text-slate-800">B:</span> Very Good</span>
              <span><span className="font-bold text-slate-800">C:</span> Good</span>
              <span><span className="font-bold text-slate-800">D:</span> Developing</span>
              <span><span className="font-bold text-slate-800">E:</span> Needs Improvement</span>
            </>
          ) : (
            <>
              <span className="font-bold text-slate-700 uppercase">GES Grading:</span>
              <span><span className="font-bold text-slate-800">80-100:</span> A (Excellent)</span>
              <span><span className="font-bold text-slate-800">70-79:</span> B (Very Good)</span>
              <span><span className="font-bold text-slate-800">60-69:</span> C (Good)</span>
              <span><span className="font-bold text-slate-800">50-59:</span> D (Credit)</span>
              <span><span className="font-bold text-slate-800">40-49:</span> E (Pass)</span>
              <span><span className="font-bold text-slate-800">0-39:</span> F (Fail)</span>
            </>
          )}
        </div>"""
    content = content.replace(old_legend, new_legend)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated ges-report-card.tsx")
