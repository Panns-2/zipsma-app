import sys

with open('src/app/student/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('sessionStorage.getItem(`auth_${studentId}`)', 'sessionStorage.getItem(`auth_${urlId}`)')
text = text.replace('}, [studentId, router]);', '}, [urlId, router]);')

with open('src/app/student/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
