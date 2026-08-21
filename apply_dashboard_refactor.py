import re

def refactor_dashboard():
    with open('src/app/parent/dashboard/page.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the Tabs block
    tabs_start_idx = content.find('<Tabs defaultValue="fees"')
    if tabs_start_idx == -1:
        print("Could not find tabs block")
        return

    # Find the end of the tabs block
    # It's `<div className="hidden md:flex flex-col items-center mt-12 gap-4">` that comes after it
    tabs_end_idx = content.find('<div className="hidden md:flex flex-col items-center mt-12 gap-4">', tabs_start_idx)
    if tabs_end_idx == -1:
        print("Could not find end of tabs block")
        return
        
    tabs_block = content[tabs_start_idx:tabs_end_idx]

    # Extract contents of individual TabsContent
    def extract_tab_content(tab_name):
        start_pattern = f'<TabsContent value="{tab_name}"'
        start_idx = tabs_block.find(start_pattern)
        if start_idx == -1:
            return ""
        # Find the end of the opening tag
        tag_end_idx = tabs_block.find('>', start_idx) + 1
        
        # We need to find the matching </TabsContent>
        open_tags = 1
        curr_idx = tag_end_idx
        while open_tags > 0 and curr_idx < len(tabs_block):
            next_open = tabs_block.find('<TabsContent', curr_idx)
            next_close = tabs_block.find('</TabsContent>', curr_idx)
            
            if next_close == -1:
                break
                
            if next_open != -1 and next_open < next_close:
                open_tags += 1
                curr_idx = next_open + 12
            else:
                open_tags -= 1
                curr_idx = next_close + 14
                
        return tabs_block[tag_end_idx:curr_idx-14].strip()

    fees_content = extract_tab_content("fees")
    announcements_content = extract_tab_content("announcements")
    homework_content = extract_tab_content("homework")
    calendar_content = extract_tab_content("calendar")
    academics_content = extract_tab_content("academics")
    library_content = extract_tab_content("library")
    ai_content = extract_tab_content("ai-assistant")

    new_tabs_block = f"""<Tabs defaultValue="overview" className="w-full mt-6">
          <TabsList className="flex w-full items-center justify-start overflow-x-auto flex-nowrap h-auto p-0 bg-transparent gap-2 border-b border-slate-300 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] rounded-none">
            <TabsTrigger
              value="overview"
              className="flex-shrink-0 whitespace-nowrap border border-[#9536ea] bg-[#ab4bf8] text-white hover:bg-[#9536ea] data-[state=active]:bg-[#900b02] data-[state=active]:text-white data-[state=active]:border-[#900b02] py-2 px-4 font-bold text-xs rounded-none data-[state=active]:rounded-md transition-all shadow-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="finances"
              className="flex-shrink-0 whitespace-nowrap border border-[#9536ea] bg-[#ab4bf8] text-white hover:bg-[#9536ea] data-[state=active]:bg-[#900b02] data-[state=active]:text-white data-[state=active]:border-[#900b02] py-2 px-4 font-bold text-xs rounded-none data-[state=active]:rounded-md transition-all shadow-sm"
            >
              Finances
            </TabsTrigger>
            <TabsTrigger
              value="academics-hub"
              className="flex-shrink-0 whitespace-nowrap border border-[#9536ea] bg-[#ab4bf8] text-white hover:bg-[#9536ea] data-[state=active]:bg-[#900b02] data-[state=active]:text-white data-[state=active]:border-[#900b02] py-2 px-4 font-bold text-xs rounded-none data-[state=active]:rounded-md transition-all shadow-sm"
            >
              Academics Hub
            </TabsTrigger>
            <TabsTrigger
              value="school-life-hub"
              className="flex-shrink-0 whitespace-nowrap border border-[#9536ea] bg-[#ab4bf8] text-white hover:bg-[#9536ea] data-[state=active]:bg-[#900b02] data-[state=active]:text-white data-[state=active]:border-[#900b02] py-2 px-4 font-bold text-xs rounded-none data-[state=active]:rounded-md transition-all shadow-sm"
            >
              School Life Hub
            </TabsTrigger>
            <TabsTrigger
              value="ai-assistant"
              className="flex-shrink-0 whitespace-nowrap border border-[#9536ea] bg-[#ab4bf8] text-white hover:bg-[#9536ea] data-[state=active]:bg-[#900b02] data-[state=active]:text-white data-[state=active]:border-[#900b02] py-2 px-4 font-bold text-xs rounded-none data-[state=active]:rounded-md transition-all shadow-sm"
            >
              AI Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            {{/* Financial Summary Card */}}
            <Card className="shadow-md border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" /> Financial Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Outstanding</p>
                    <p className={{`text-3xl font-bold ${{financialData.totalOutstanding > 0 ? 'text-red-500' : 'text-green-500'}}`}}>
                      GH¢ {{financialData.totalOutstanding.toFixed(2)}}
                    </p>
                  </div>
                  {{financialData.totalOutstanding > 0 && (
                     <Button size="sm" onClick={{() => window.location.href='#fees'}}>Pay Now</Button>
                  )}}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {{/* Attendance Summary */}}
              <Card className="shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                     <CalendarDays className="w-5 h-5 text-indigo-500" /> Today's Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                   <p className="text-2xl font-bold text-slate-800">
                     {{(studentData.attendance || []).find((a: any) => a.date === new Date().toISOString().split("T")[0])?.attended ? "Present" : "Not Recorded/Absent"}}
                   </p>
                   <p className="text-sm text-muted-foreground mt-1">Term Rate: {{attendanceSummary.rate.toFixed(0)}}%</p>
                </CardContent>
              </Card>
              
              {{/* Alerts Summary */}}
              <Card className="shadow-md">
                <CardHeader className="pb-2">
                   <CardTitle className="text-lg flex items-center gap-2">
                     <Megaphone className="w-5 h-5 text-amber-500" /> Pending Alerts
                   </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                   <div className="flex justify-between items-center text-sm border-b pb-2">
                     <span className="font-medium text-slate-700">Unread Announcements</span>
                     <Badge variant="secondary" className="bg-amber-100 text-amber-800">{{announcements.length}}</Badge>
                   </div>
                   <div className="flex justify-between items-center text-sm pt-1">
                     <span className="font-medium text-slate-700">Upcoming Homework</span>
                     <Badge variant="secondary" className="bg-blue-100 text-blue-800">{{homework.length}}</Badge>
                   </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="finances" className="mt-6 space-y-8">
             {fees_content}
          </TabsContent>

          <TabsContent value="academics-hub" className="mt-6 space-y-8">
             <div className="space-y-8">
               <h3 className="text-2xl font-bold text-primary flex items-center gap-2 border-b pb-2">
                 <GraduationCap className="w-6 h-6" /> Academics Hub
               </h3>
               
               {{/* Homework Section */}}
               <div>
                  {homework_content}
               </div>

               {{/* Academics Reports Section */}}
               <div>
                  {academics_content}
               </div>

               {{/* E-Library Section */}}
               <div>
                  {library_content}
               </div>
             </div>
          </TabsContent>

          <TabsContent value="school-life-hub" className="mt-6 space-y-8">
             <div className="space-y-8">
               <h3 className="text-2xl font-bold text-primary flex items-center gap-2 border-b pb-2">
                 <Users className="w-6 h-6" /> School Life Hub
               </h3>

               {{/* Announcements Section */}}
               <div>
                  {announcements_content}
               </div>

               {{/* Calendar Section */}}
               <div>
                  {calendar_content}
               </div>
             </div>
          </TabsContent>

          <TabsContent value="ai-assistant" className="mt-6 space-y-8">
             {ai_content}
          </TabsContent>
        </Tabs>
"""
    
    new_content = content[:tabs_start_idx] + new_tabs_block + content[tabs_end_idx:]
    with open('src/app/parent/dashboard/page.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Parent Dashboard refactored successfully.")

if __name__ == "__main__":
    refactor_dashboard()
