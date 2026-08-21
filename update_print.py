import re

file_path = "src/components/admin-dashboard/admission-bill-tab.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update CSS
css_old = """                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 15mm;
                    }
                    body > * { visibility: hidden !important; }
                    .admission-bill-page { visibility: visible !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; margin: 0 !important; padding: 0 !important;}
                    .admission-bill-page * { visibility: visible !important; }
                }"""

css_new = """                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 10mm;
                    }
                    body * { visibility: hidden; }
                    .print-wrapper, .print-wrapper * { visibility: visible !important; }
                    .print-wrapper { 
                        position: absolute !important; 
                        top: 0 !important; 
                        left: 0 !important; 
                        width: 100% !important; 
                        margin: 0 !important; 
                        padding: 0 !important;
                        display: flex !important;
                        flex-direction: row !important;
                        justify-content: space-between !important;
                        gap: 15mm !important;
                    }
                    .admission-bill-page { 
                        flex: 1 !important; 
                        width: 50% !important;
                        max-width: 50% !important;
                    }
                    .print-wrapper > div.hidden {
                        display: block !important;
                    }
                }"""
content = content.replace(css_old, css_new)

# 2. Extract JSX and replace with print-wrapper
lines = content.split('\n')
start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if '<div id="admission-bill-preview" className="admission-bill-page' in line:
        start_idx = i
        break

for i in range(start_idx, len(lines)):
    if '<!-- Hidden Mobile-Friendly Bill for WhatsApp PDF Generation -->' in lines[i] or '{/* Hidden Mobile-Friendly Bill for WhatsApp PDF Generation */}' in lines[i]:
        # The closing div of the preview is 2 lines above this comment
        end_idx = i - 1
        break

if start_idx != -1 and end_idx != -1:
    jsx_content = '\n'.join(lines[start_idx:end_idx])
    
    # We need to modify the extracted JSX slightly for the function signature
    # Replace id="admission-bill-preview" with id={isDuplicate ? undefined : "admission-bill-preview"}
    # Replace className="..." with className={`... ${!isDuplicate ? 'max-w-[800px]' : ''}`}
    
    # Create the function
    func_content = f"""    const renderBillContent = (isDuplicate = false) => (
{jsx_content}
    );
"""
    func_content = func_content.replace(
        '<div id="admission-bill-preview" className="admission-bill-page bg-white shadow-xl print:shadow-none print:border-none w-full max-w-[800px] mx-auto relative font-sans text-black p-8 print:p-0 print:max-w-full" style={{ fontFamily: "\'Montserrat\', sans-serif" }}>',
        '<div id={isDuplicate ? undefined : "admission-bill-preview"} className={`admission-bill-page bg-white shadow-xl print:shadow-none print:border-none w-full mx-auto relative font-sans text-black p-8 print:p-0 print:max-w-full ${!isDuplicate ? \'max-w-[800px]\' : \'\'}`} style={{ fontFamily: "\'Montserrat\', sans-serif" }}>'
    )
    
    # Insert function before return statement
    return_idx = -1
    for i, line in enumerate(lines):
        if '    return (' in line:
            return_idx = i
            break
            
    # Now build the new file
    new_lines = lines[:return_idx] + func_content.split('\n')[:-1] + lines[return_idx:start_idx]
    
    # Add the print-wrapper
    new_lines.extend([
        '                <div className="print-wrapper w-full flex flex-col gap-8 print:flex-row print:gap-[15mm]">',
        '                    {renderBillContent()}',
        '                    <div className="hidden print:block w-full">',
        '                        {renderBillContent(true)}',
        '                    </div>',
        '                </div>'
    ])
    
    new_lines.extend(lines[end_idx:])
    
    content = '\n'.join(new_lines)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print("Success")
else:
    print(f"Failed to find indices. Start: {start_idx}, End: {end_idx}")
