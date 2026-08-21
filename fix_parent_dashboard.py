import sys

with open('src/app/parent/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix imports
if 'updatePin' not in text:
    text = text.replace(
        "updateStudentDetails, getFeeCategories",
        "updatePin, updateStudentDetails, getFeeCategories"
    )

# Inject state variables after studentData
state_injection = """
    const [showPinModal, setShowPinModal] = useState(false);
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [isUpdatingPin, setIsUpdatingPin] = useState(false);

    useEffect(() => {
        const authFlag = sessionStorage.getItem(`auth_${urlId}`);
        if (authFlag !== 'true') {
            router.replace('/');
        }
    }, [urlId, router]);

    // Check if pin change is required
    useEffect(() => {
        const pinChangeReq = sessionStorage.getItem('pinChangeRequired');
        if (pinChangeReq === 'true') {
            setShowPinModal(true);
        }
    }, []);

    const handlePinChange = async () => {
        if (newPin.length !== 4 || confirmPin.length !== 4) {
            setPinError('PIN must be exactly 4 digits.');
            return;
        }
        if (newPin !== confirmPin) {
            setPinError('PINs do not match.');
            return;
        }
        if (!db || !schoolId || !urlId) return;
        
        setIsUpdatingPin(true);
        setPinError('');
        try {
            await updatePin(db, schoolId, urlId, false, newPin);
            setShowPinModal(false);
            sessionStorage.removeItem('pinChangeRequired');
            toast({ title: 'PIN Updated', description: 'Your secure PIN has been updated successfully.' });
        } catch (e: any) {
            setPinError(e.message || 'Failed to update PIN.');
        } finally {
            setIsUpdatingPin(false);
        }
    };
"""

target_marker = "const [studentData, setStudentData] = useState<Student | null>(null);"
if target_marker in text and "const [showPinModal" not in text:
    idx = text.find(target_marker) + len(target_marker)
    text = text[:idx] + "\n" + state_injection + text[idx:]

with open('src/app/parent/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

# We also need to update login-form.tsx to pass pinChangeRequired to sessionStorage
with open('src/components/login-form.tsx', 'r', encoding='utf-8') as f:
    login_text = f.read()

login_injection = """
                if (authResult.data && authResult.data.pinChangeRequired) {
                    sessionStorage.setItem('pinChangeRequired', 'true');
                } else {
                    sessionStorage.removeItem('pinChangeRequired');
                }
"""

if "sessionStorage.setItem('pinChangeRequired'" not in login_text:
    login_idx = login_text.find("sessionStorage.setItem(`auth_${trimmedId}`")
    if login_idx != -1:
        login_text = login_text[:login_idx] + login_injection.lstrip() + "                " + login_text[login_idx:]
        with open('src/components/login-form.tsx', 'w', encoding='utf-8') as f:
            f.write(login_text)

print("Parent dashboard and login form updated.")
