import os

def fix_dashboard(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add activeTab state
    if 'const [activeTab, setActiveTab] = useState("overview");' not in content:
        content = content.replace(
            'function DashboardContent() {',
            'function DashboardContent() {\n  const [activeTab, setActiveTab] = useState("overview");'
        )

    # 2. Replace Tabs defaultValue with controlled value
    content = content.replace(
        '<Tabs defaultValue="overview" className="w-full mt-6">',
        '<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">'
    )

    # 3. Replace the onClick handler
    content = content.replace(
        "onClick={() => window.location.href='#fees'}",
        "onClick={() => setActiveTab('finances')}"
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {filepath}")

if __name__ == "__main__":
    fix_dashboard('src/app/parent/dashboard/page.tsx')
    fix_dashboard('src/app/student/dashboard/page.tsx')
