import re

with open('src/app/admin/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

if 'updatePin' not in text:
    text = text.replace(
        "import { addStudent,",
        "import { addStudent, updatePin,"
    )
    if 'updatePin' not in text: # Fallback if import string differs
        text = text.replace(
            "import { updateStudent,",
            "import { updateStudent, updatePin,"
        )

# Add handler function inside the main component
handler = """
    const handleResetPin = async (isStudent: boolean) => {
        if (!db || !schoolId || !studentToView) return;
        try {
            const idToUpdate = isStudent ? studentToView.studentId : studentToView.parentId;
            if (!idToUpdate) throw new Error("No ID found to update.");
            await updatePin(db, schoolId, idToUpdate, isStudent, '1234');
            // Re-fetch or simply notify
            toast({ title: 'PIN Reset', description: `${isStudent ? 'Student' : 'Parent'} PIN has been reset to 1234.` });
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };
"""

text = text.replace(
    "const handleEditSubmit = async (e: React.FormEvent) => {",
    handler + "\n    const handleEditSubmit = async (e: React.FormEvent) => {"
)

reset_buttons = """
                                 <div className="space-y-4 md:col-span-2 border-t pt-4 mt-4">
                                    <Label className="text-destructive font-bold">Security & Access</Label>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <Button type="button" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => handleResetPin(true)}>
                                            Reset Student PIN to 1234
                                        </Button>
                                        {studentToView?.parentId && (
                                            <Button type="button" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => handleResetPin(false)}>
                                                Reset Parent PIN to 1234
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic">If the user forgets their PIN, click to reset it to the default (1234). They will be forced to change it on next login.</p>
                                 </div>
"""

text = text.replace(
    '<DialogFooter className="pt-6"><DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button></DialogFooter>',
    reset_buttons + '\n                             </div>\n                             <DialogFooter className="pt-6"><DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button></DialogFooter>'
)
# Note: we need to make sure we don't duplicate `</div>` improperly. 
# The original code has `</div>\n<DialogFooter`.

with open('src/app/admin/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
