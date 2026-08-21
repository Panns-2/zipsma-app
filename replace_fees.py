import sys

def replace_blocks():
    try:
        # Read admin page
        with open('src/app/admin/dashboard/page.tsx', 'r', encoding='utf-8') as f:
            admin_lines = f.readlines()
            
        # Admin fees block is roughly 2598 to 3447
        # Let's dynamically find it to be safer
        fees_start_idx = -1
        fees_end_idx = -1
        for i, line in enumerate(admin_lines):
            if "activeTab === 'fees' && (" in line and fees_start_idx == -1:
                fees_start_idx = i
            if "activeTab === 'attendance' && (" in line and fees_start_idx != -1:
                fees_end_idx = i
                break
                
        if fees_start_idx == -1 or fees_end_idx == -1:
            print("Could not find admin fees block")
            return
            
        admin_fees_content = admin_lines[fees_start_idx:fees_end_idx]
        print(f"Extracted {len(admin_fees_content)} lines from admin page")
        
        # Read accountant page
        with open('src/components/accountant-dashboard-content.tsx', 'r', encoding='utf-8') as f:
            acc_lines = f.readlines()
            
        acc_fees_start = -1
        acc_expenditures_start = -1
        
        for i, line in enumerate(acc_lines):
            if "activeTab === 'fees' && (" in line and acc_fees_start == -1:
                acc_fees_start = i
            if "activeTab === 'expenditures' && (" in line and acc_fees_start != -1:
                acc_expenditures_start = i
                break
                
        if acc_fees_start == -1 or acc_expenditures_start == -1:
            print("Could not find accountant blocks")
            return
            
        print(f"Replacing accountant lines {acc_fees_start} to {acc_expenditures_start}")
        
        # Combine
        new_acc_lines = acc_lines[:acc_fees_start] + admin_fees_content + ["\n                        "] + acc_lines[acc_expenditures_start:]
        
        with open('src/components/accountant-dashboard-content.tsx', 'w', encoding='utf-8') as f:
            f.writelines(new_acc_lines)
            
        print("Successfully replaced content")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    replace_blocks()
