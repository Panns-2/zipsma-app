import sys

def add_imports():
    with open('src/components/accountant-dashboard-content.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    lucide_icons = [
        'Calendar as CalendarIcon', 'Pencil', 'Save', 'RefreshCcw', 
        'MoreHorizontal', 'DatabaseZap', 'CheckCheck', 'CalendarDays', 
        'ArrowLeft', 'FilePlus', 'UtensilsCrossed', 'XCircle'
    ]
    
    ui_imports = [
        "import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';",
        "import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';",
        "import { Checkbox } from '@/components/ui/checkbox';",
        "import { GradientAvatar } from '@/components/gradient-avatar';"
    ]
    
    # 1. Add lucide icons
    for i, line in enumerate(lines):
        if "from 'lucide-react';" in line:
            # The line before should not have a comma, so we need to add a comma to the previous line
            if len(lines[i-1].strip()) > 0 and not lines[i-1].strip().endswith(','):
                lines[i-1] = lines[i-1].rstrip('\r\n') + ",\n"
            
            # Insert the new icons
            icons_str = ',\n    '.join(lucide_icons)
            lines.insert(i, f"    {icons_str}\n")
            break
            
    # 2. Add UI imports
    # Find the last import from '@/components/ui/...'
    last_ui_import_idx = -1
    for i, line in enumerate(lines):
        if "from '@/" in line:
            last_ui_import_idx = i
            
    if last_ui_import_idx != -1:
        for imp in reversed(ui_imports):
            lines.insert(last_ui_import_idx + 1, imp + "\n")
            
    with open('src/components/accountant-dashboard-content.tsx', 'w', encoding='utf-8') as f:
        f.writelines(lines)
        
    print("Successfully added all missing imports")

if __name__ == "__main__":
    add_imports()
