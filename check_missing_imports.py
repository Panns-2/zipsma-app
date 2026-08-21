import re

def check_missing_imports():
    with open('src/components/accountant-dashboard-content.tsx', 'r', encoding='utf-8') as f:
        content = f.read()
        
    lines = content.split('\n')
    imports_text = '\n'.join(lines[:150])
    
    # We replaced fees from lines 1366 to 1709 approx. 
    # Let's just find the activeTab === 'fees' block.
    start = -1
    end = -1
    for i, line in enumerate(lines):
        if "activeTab === 'fees' && (" in line and start == -1:
            start = i
        if "activeTab === 'expenditures' && (" in line and start != -1:
            end = i
            break
            
    if start == -1 or end == -1:
        print("Could not find block")
        return
        
    fees_block = '\n'.join(lines[start:end])
    
    # Find all JSX tags <Component or <Component> or <Component/>
    components = set(re.findall(r'<([A-Z][A-Za-z0-9_]*)', fees_block))
    
    missing = []
    for comp in components:
        if comp not in imports_text:
            missing.append(comp)
            
    print("Missing components/icons:", missing)

if __name__ == "__main__":
    check_missing_imports()
