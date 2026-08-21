import sys

with open('src/app/student/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Extract the block we injected
start_marker = "const [showPinModal, setShowPinModal] = useState(false);"
end_marker = "const [editProfileData, setEditProfileData] = useState({"

if start_marker in text and end_marker in text:
    # Find the line that contains start_marker
    start_idx = text.rfind('\n', 0, text.find(start_marker)) + 1
    
    # Find the line that contains end_marker
    end_idx = text.rfind('\n', 0, text.find(end_marker)) + 1
    
    block_to_move = text[start_idx:end_idx]
    
    # Remove it from the top
    text = text[:start_idx] + text[end_idx:]
    
    # Insert it after studentData
    target_marker = "const [studentData, setStudentData] = useState<Student | null>(null);"
    if target_marker in text:
        target_idx = text.find(target_marker) + len(target_marker)
        text = text[:target_idx] + "\n" + block_to_move + text[target_idx:]
        
        with open('src/app/student/dashboard/page.tsx', 'w', encoding='utf-8') as f:
            f.write(text)
        print("Successfully moved block in student/dashboard/page.tsx")
    else:
        print("Could not find studentData marker in student/dashboard")
else:
    print("Could not find start/end markers in student/dashboard")
