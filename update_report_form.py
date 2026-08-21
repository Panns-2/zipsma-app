import re

file_path = "f:/App Development/ZipSMA/src/components/class-dashboard/report-entry-form.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add isPreschoolClass helper at the top outside the component
if "const isPreschoolClass" not in content:
    content = content.replace(
        "export function ReportEntryForm",
        "const isPreschoolClass = (name: string) => /kg|nursery|creche|pre-school|preschool/i.test(name);\n\nexport function ReportEntryForm"
    )

# 2. Add reportType to initialization
if "reportType: isPreschoolClass(className) ? 'preschool' : 'standard'" not in content:
    content = content.replace(
        "className,",
        "className,\n            reportType: isPreschoolClass(className) ? 'preschool' : 'standard' as 'standard' | 'preschool',"
    )

# 3. Add isPreschool variable inside component
if "const isPreschool =" not in content:
    content = content.replace(
        "const { db, auth } = useFirebase();",
        "const { db, auth } = useFirebase();\n  const isPreschool = report.reportType === 'preschool';"
    )

# 4. Modify handleSubjectChange for preschool
if "if (field === 'grade' && isPreschool)" not in content:
    content = content.replace(
        "if (field === 'classAssessmentScore' || field === 'examScore') {",
        """if (field === 'grade' && isPreschool) {
        newSubjects[index].remark = getDefaultRemark(value);
      } else if (field === 'classAssessmentScore' || field === 'examScore') {"""
    )

# 5. Add Health Record to TabsList
if "TabsTrigger value=\"health\"" not in content:
    content = content.replace(
        "<TabsTrigger value=\"remarks\">Remarks</TabsTrigger>",
        """<TabsTrigger value="remarks">Remarks</TabsTrigger>
                {isPreschool && <TabsTrigger value="health">Health Record</TabsTrigger>}"""
    )
    # Also change grid-cols-4 to dynamic or 5
    content = content.replace(
        "className=\"grid grid-cols-4 mb-4\"",
        "className={`grid ${isPreschool ? 'grid-cols-5' : 'grid-cols-4'} mb-4`}"
    )

# 6. Update Subjects Table Headers and Body for preschool
subjects_table_header = """<th className="px-4 py-2 font-medium">Subject</th>
                        {!isPreschool && <th className="px-4 py-2 font-medium w-24">CA (50)</th>}
                        {!isPreschool && <th className="px-4 py-2 font-medium w-24">Exam (50)</th>}
                        {!isPreschool && <th className="px-4 py-2 font-medium w-24">Total</th>}
                        <th className="px-4 py-2 font-medium w-32">Grade</th>
                        <th className="px-4 py-2 font-medium w-32">Remark</th>
                        <th className="px-2 py-2 font-medium w-10"></th>"""

subjects_table_body = """<td className="px-4 py-2 font-medium">
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
                            </td>"""

if "w-24\">CA (50)</th>" in content and "w-24\">Exam (50)</th>" in content:
    content = re.sub(
        r'<th className="px-4 py-2 font-medium">Subject</th>\s*<th className="px-4 py-2 font-medium w-24">CA \(50\)</th>\s*<th className="px-4 py-2 font-medium w-24">Exam \(50\)</th>\s*<th className="px-4 py-2 font-medium w-24">Total</th>\s*<th className="px-4 py-2 font-medium w-20">Grade</th>\s*<th className="px-4 py-2 font-medium w-32">Remark</th>\s*<th className="px-2 py-2 font-medium w-10"></th>',
        subjects_table_header,
        content
    )

old_body = """<td className="px-4 py-2 font-medium">
                              <Input 
                                className="h-8 w-full"
                                value={sub.name}
                                onChange={e => handleSubjectChange(idx, 'name', e.target.value)}
                                placeholder="Subject Name"
                              />
                            </td>
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
                            <td className="px-4 py-2 text-center font-bold text-primary">
                              {sub.grade || '-'}
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
                            </td>"""
if old_body in content:
    content = content.replace(old_body, subjects_table_body)

# 7. Hide Total/Average summary for preschool
if "{!isPreschool && (" not in content and "<div className=\"flex justify-between bg-blue-50" in content:
    old_summary = """<div className="flex justify-between bg-blue-50 p-3 rounded-md border border-blue-100">
                  <div><span className="font-semibold text-blue-900">Total Marks:</span> <span className="text-blue-800">{report.summary?.totalMarks || 0}</span></div>
                  <div><span className="font-semibold text-blue-900">Average:</span> <span className="text-blue-800">{report.summary?.averageScore || 0}%</span></div>
                </div>"""
    new_summary = """{!isPreschool && (
                  <div className="flex justify-between bg-blue-50 p-3 rounded-md border border-blue-100">
                    <div><span className="font-semibold text-blue-900">Total Marks:</span> <span className="text-blue-800">{report.summary?.totalMarks || 0}</span></div>
                    <div><span className="font-semibold text-blue-900">Average:</span> <span className="text-blue-800">{report.summary?.averageScore || 0}%</span></div>
                  </div>
                )}"""
    content = content.replace(old_summary, new_summary)

# 8. Update Skills Tab
new_skills_tab = """<TabsContent value="skills" className="space-y-6">
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
              </TabsContent>"""

old_skills_tab = """<TabsContent value="skills" className="space-y-6">
                 {/* Basic implementation for skills */}
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
              </TabsContent>"""
if old_skills_tab in content:
    content = content.replace(old_skills_tab, new_skills_tab)


health_record_content = """<TabsContent value="health" className="space-y-6">
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
              </TabsContent>"""

if "TabsContent value=\"health\"" not in content:
    content = content.replace("</TabsContent>\n              \n              <TabsContent value=\"remarks\"", "</TabsContent>\n              \n              " + health_record_content + "\n              \n              <TabsContent value=\"remarks\"")


remarks_addition = """<div className="space-y-2">
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
                  </div>"""

old_remarks_bottom = """<div className="space-y-2">
                    <Label>Promoted To / Next Class</Label>
                    <Input 
                      placeholder="e.g. Primary 4"
                      value={report.promotion?.promotedTo || ''}
                      onChange={e => setReport(prev => ({ ...prev, promotion: { ...prev.promotion!, promotedTo: e.target.value } }))}
                    />
                  </div>"""

if 'Label>Next Term Begins' not in content:
    content = content.replace(old_remarks_bottom, remarks_addition)
    
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated report-entry-form.tsx")
