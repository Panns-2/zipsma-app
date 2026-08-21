import re

with open('src/app/student/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add new imports
if 'updatePin' not in text:
    text = text.replace(
        "import { resolveStudentDoc,",
        "import { resolveStudentDoc, updatePin,"
    )

if 'Pin' not in text and 'lucide-react' in text:
    text = text.replace(
        "import { Loader2,",
        "import { Loader2, KeyRound,"
    )

# Add states for pin change
states = """
    // PIN Change States
    const [showPinModal, setShowPinModal] = useState(false);
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [isUpdatingPin, setIsUpdatingPin] = useState(false);

    // Authentication Guard
    useEffect(() => {
        if (!studentId) return;
        const authFlag = sessionStorage.getItem(`auth_${studentId}`);
        if (authFlag !== 'true') {
            router.replace('/');
        }
    }, [studentId, router]);

    // Check if pin change is required
    useEffect(() => {
        if (studentData && studentData.pinChangeRequired) {
            setShowPinModal(true);
        }
    }, [studentData]);

    const handlePinChange = async () => {
        if (newPin.length !== 4 || confirmPin.length !== 4) {
            setPinError('PIN must be exactly 4 digits.');
            return;
        }
        if (newPin !== confirmPin) {
            setPinError('PINs do not match.');
            return;
        }
        if (!db || !schoolId || !studentId) return;
        
        setIsUpdatingPin(true);
        setPinError('');
        try {
            await updatePin(db, schoolId, studentId, true, newPin);
            setShowPinModal(false);
            setStudentData(prev => prev ? { ...prev, pinChangeRequired: false } : prev);
            toast({ title: 'PIN Updated', description: 'Your secure PIN has been updated successfully.' });
        } catch (e: any) {
            setPinError(e.message || 'Failed to update PIN.');
        } finally {
            setIsUpdatingPin(false);
        }
    };
"""

text = text.replace(
    "const [isEditingProfile, setIsEditingProfile] = useState(false);",
    "const [isEditingProfile, setIsEditingProfile] = useState(false);\n" + states
)

pin_modal = """
            {/* PIN Change Modal */}
            <Dialog open={showPinModal} onOpenChange={(open) => {
                // Prevent closing if required
                if (!studentData?.pinChangeRequired) setShowPinModal(open);
            }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary"/> Setup Secure PIN</DialogTitle>
                        <DialogDescription>
                            For your security, please change your default PIN to a new 4-digit secure PIN.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>New 4-Digit PIN</Label>
                            <Input type="password" maxLength={4} placeholder="e.g. 8421" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\\D/g, ''))} disabled={isUpdatingPin} className="text-xl tracking-widest text-center" />
                        </div>
                        <div className="space-y-2">
                            <Label>Confirm New PIN</Label>
                            <Input type="password" maxLength={4} placeholder="e.g. 8421" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\\D/g, ''))} disabled={isUpdatingPin} className="text-xl tracking-widest text-center" />
                        </div>
                        {pinError && <p className="text-xs font-bold text-rose-500 text-center">{pinError}</p>}
                    </div>
                    <DialogFooter>
                        <Button className="w-full" onClick={handlePinChange} disabled={isUpdatingPin || newPin.length !== 4 || confirmPin.length !== 4}>
                            {isUpdatingPin ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Save Secure PIN
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
"""

# Insert modal right after <main>
text = text.replace(
    '<main className="container mx-auto px-4 py-8 pb-24 md:pb-8">',
    '<main className="container mx-auto px-4 py-8 pb-24 md:pb-8">\n' + pin_modal
)

with open('src/app/student/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
