import re

with open('src/app/parent/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update useState for activeTab and add isQuickPay
content = content.replace(
    'const [activeTab, setActiveTab] = useState("overview");',
    '''const action = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('action') : null;
  const isQuickPay = action === 'pay';
  const [activeTab, setActiveTab] = useState(isQuickPay ? "finances" : "overview");'''
)
# Note: Since searchParams.get('action') can be used from the hook:
content = content.replace(
    'const urlId = searchParams.get(\'id\');',
    '''const urlId = searchParams.get('id');
    const action = searchParams.get('action');
    const isQuickPay = action === 'pay';'''
)
# Revert the first replacement if we can just do it in the hook, wait, activeTab is initialized before searchParams!
# Let's fix that.
content = content.replace(
    '''const [activeTab, setActiveTab] = useState("overview");
    const searchParams = useSearchParams();''',
    '''const searchParams = useSearchParams();
    const action = searchParams.get('action');
    const isQuickPay = action === 'pay';
    const [activeTab, setActiveTab] = useState(isQuickPay ? "finances" : "overview");'''
)

# 2. Hide Header
# Let's use regex to find `<Header\nuserName={studentData.name}... />`
header_pattern = re.compile(r'(<Header\s+userName=\{studentData\.name\}[^>]+/>)', re.MULTILINE)
content = header_pattern.sub(r'{!isQuickPay && (\n\1\n)}', content)

# 3. Hide ContactBar (if it exists)
contact_bar_pattern = re.compile(r'(<ContactBar[^>]*/>)', re.MULTILINE)
content = contact_bar_pattern.sub(r'{!isQuickPay && \1}', content)

# 4. Hide StudentProfile
student_profile_pattern = re.compile(r'(<StudentProfile[^>]*/>)', re.MULTILINE)
content = student_profile_pattern.sub(r'{!isQuickPay && (\n\1\n)}', content)

# 5. Hide TabsList
tabs_list_pattern = re.compile(r'(<TabsList.*?</TabsList>)', re.DOTALL)
content = tabs_list_pattern.sub(r'{!isQuickPay && (\n\1\n)}', content)

# 6. Add "Back to Full Dashboard" button for Quick Pay mode
# We can insert it just before `<Tabs `
tabs_start_pattern = re.compile(r'(<Tabs\s+value=\{activeTab\})')
back_button = '''{isQuickPay && (
    <div className="mb-4">
        <Button variant="outline" onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('action');
            window.location.href = url.pathname + url.search;
        }}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Full Dashboard
        </Button>
    </div>
)}
\\1'''
content = tabs_start_pattern.sub(back_button, content)

with open('src/app/parent/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated successfully")
