import re

with open('src/components/login-form.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    "import { resolveStudentDoc } from '@/lib/data-store';",
    "import { verifyLogin } from '@/lib/data-store';"
)

text = text.replace(
    "import { Loader2, Users, Building } from 'lucide-react';",
    "import { Loader2, Users, Building, Lock } from 'lucide-react';"
)

text = text.replace(
    "const [schoolId, setSchoolId] = useState(initialSchoolId || '');",
    "const [schoolId, setSchoolId] = useState(initialSchoolId || '');\n  const [pin, setPin] = useState('');"
)

old_submit = """
    if (db) {
        try {
            await resolveStudentDoc(db, trimmedId, trimmedSchoolId);
            // If it succeeds, it's a student ID
            router.push(`/student/dashboard?schoolId=${trimmedSchoolId}&id=${trimmedId}`);
        } catch (e) {
            // Record not found as student. Route to main dashboard (which handles parent/family view)
            router.push(`/parent/dashboard?schoolId=${trimmedSchoolId}&id=${trimmedId}`);
        }
    } else {
        // Fallback without DB: route to main dashboard
        router.push(`/dashboard?schoolId=${trimmedSchoolId}&id=${trimmedId}`);
    }
"""

new_submit = """
    if (db) {
        try {
            const authResult = await verifyLogin(db, trimmedSchoolId, trimmedId, pin);
            if (authResult) {
                // Set authenticated flag in sessionStorage
                sessionStorage.setItem(`auth_${trimmedId}`, 'true');
                if (authResult.type === 'student') {
                    router.push(`/student/dashboard?schoolId=${trimmedSchoolId}&id=${trimmedId}`);
                } else {
                    router.push(`/parent/dashboard?schoolId=${trimmedSchoolId}&id=${trimmedId}`);
                }
            }
        } catch (e: any) {
            toast({
                title: 'Login Failed',
                description: e.message || 'Invalid ID or PIN.',
                variant: 'destructive',
            });
            setIsLoading(false);
            return;
        }
    } else {
        toast({ title: 'Error', description: 'Database connection failed.', variant: 'destructive' });
        setIsLoading(false);
    }
"""

text = text.replace(old_submit, new_submit)

pin_input = """
        <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                id="pin"
                type="password"
                placeholder="4-Digit PIN"
                maxLength={4}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\\D/g, ''))}
                disabled={isLoading}
                className="pl-10 text-lg tracking-widest font-mono"
            />
        </div>
"""

text = text.replace(
    'className="pl-10"\n            />\n        </div>',
    'className="pl-10"\n            />\n        </div>' + pin_input
)

with open('src/components/login-form.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
