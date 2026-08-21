import sys

with open('src/lib/data-store.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the start of the corrupted block
start_idx = -1
for i, line in enumerate(lines):
    if line.strip() == '// --- Authentication & Security ---':
        start_idx = i
        break

if start_idx != -1:
    lines = lines[:start_idx]

auth_code = """
// --- Authentication & Security ---

export async function verifyLogin(db: Firestore, schoolId: string, userId: string, pin: string): Promise<{ type: 'student' | 'parent', data: any } | null> {
    const trimmedId = userId.trim().toUpperCase();
    const trimmedSchoolId = schoolId.trim().toUpperCase();
    
    // First, try resolving as student
    try {
        const student = await resolveStudentDoc(db, trimmedId, trimmedSchoolId);
        const storedPin = student.pin || '1234';
        if (storedPin === pin) {
            return { type: 'student', data: student };
        } else {
            throw new Error('Incorrect PIN.');
        }
    } catch (e: any) {
        if (e.message === 'Incorrect PIN.') throw e;
        
        // If not student, try as parent
        const parentDocRef = doc(db, parentsCollection, trimmedId);
        const parentSnap = await getDoc(parentDocRef);
        
        if (parentSnap.exists()) {
            const parent = { id: parentSnap.id, ...parentSnap.data() } as Parent;
            if (parent.schoolId === trimmedSchoolId) {
                const storedPin = parent.pin || '1234';
                if (storedPin === pin) {
                    return { type: 'parent', data: parent };
                } else {
                    throw new Error('Incorrect PIN.');
                }
            }
        }
    }
    
    throw new Error('Invalid ID or PIN.');
}

export async function updatePin(db: Firestore, schoolId: string, userId: string, isStudent: boolean, newPin: string): Promise<void> {
    const trimmedId = userId.trim().toUpperCase();
    
    if (isStudent) {
        const studentsRef = collection(db, studentsCollection);
        let docRef: any = null;
        
        const directSnap = await getDoc(doc(db, studentsCollection, trimmedId));
        if (directSnap.exists() && directSnap.data().schoolId === schoolId) docRef = directSnap.ref;
        
        if (!docRef) {
            const compositeId = `${schoolId}_${trimmedId}`;
            const compSnap = await getDoc(doc(db, studentsCollection, compositeId));
            if (compSnap.exists()) docRef = compSnap.ref;
        }
        
        if (!docRef) {
            const q = query(studentsRef, where('schoolId', '==', schoolId), where('studentId', '==', trimmedId));
            const querySnap = await getDocs(q);
            if (!querySnap.empty) docRef = querySnap.docs[0].ref;
        }
        
        if (!docRef) throw new Error('Student not found');
        
        await updateDoc(docRef, { pin: newPin, pinChangeRequired: false });
    } else {
        const parentDocRef = doc(db, parentsCollection, trimmedId);
        await updateDoc(parentDocRef, { pin: newPin, pinChangeRequired: false });
    }
}
"""

lines.append(auth_code)

with open('src/lib/data-store.ts', 'w', encoding='utf-8') as f:
    f.writelines(lines)
