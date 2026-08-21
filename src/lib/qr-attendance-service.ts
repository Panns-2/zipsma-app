import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { markStudentAttendanceQR, getStudentById, getAcademicPeriods, getFeeCategories, getSchoolDetails, calculateStudentTotalBalance } from './data-store';
import { format } from 'date-fns';

export interface QRScanResult {
    success: boolean;
    message: string;
    studentName?: string;
}

export async function processQRScan(
    db: Firestore,
    auth: Auth,
    qrPayload: string,
    schoolId: string,
    type: 'in' | 'out',
    periodId?: string,
    enforceFeeClearance: boolean = false
): Promise<QRScanResult> {
    try {
        // Assume QR payload is "SCHOOLID_STUDENTID" or just "STUDENTID"
        let studentId = qrPayload;
        
        // Strip schoolId prefix if it exists to normalize (getStudentById handles composite)
        if (studentId.toUpperCase().startsWith(`${schoolId.toUpperCase()}_`)) {
            studentId = studentId.substring(schoolId.length + 1);
        }

        const date = format(new Date(), 'yyyy-MM-dd');
        const time = format(new Date(), 'hh:mm a');

        // 1. Fetch student details and evaluate fee status
        const student = await getStudentById(db, schoolId, studentId);
        
        if (!student) {
             return { success: false, message: "Student details not found." };
        }

        if (type === 'in' && enforceFeeClearance && !student.feeExemption) {
            const periods = await getAcademicPeriods(db, schoolId);
            const feeCategories = await getFeeCategories(db, schoolId);
            const schoolData = await getSchoolDetails(db, schoolId);
            const activePeriodId = periodId || schoolData?.currentPeriodId;
            
            const balanceInfo = calculateStudentTotalBalance(student, periods, activePeriodId || '', feeCategories);
            if (balanceInfo.totalOutstanding > 0) {
                try {
                    let customMessage = schoolData?.customFeeBlockMessage 
                        ? schoolData.customFeeBlockMessage.replace(/{studentName}/g, student.name)
                        : `Notice: Your child ${student.name} was not allowed into the school premises today due to outstanding fee balances. Please contact the school administration.`;

                    await fetch('/api/sms/send', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            schoolId: schoolId,
                            recipient: 'specific',
                            specificParent: student.id || student.studentId || studentId,
                            message: customMessage
                        }),
                    });
                } catch (err) {
                    console.error("Failed to send owing SMS:", err);
                }

                return { 
                    success: false, 
                    studentName: student.name,
                    message: "Student owes fees and is not allowed in. Parent notified." 
                };
            }
        }

        // 2. Mark Attendance in Firestore
        const attendanceResult = await markStudentAttendanceQR(
            db, 
            auth, 
            studentId, 
            schoolId, 
            type, 
            date, 
            time, 
            periodId || ''
        );

        if (attendanceResult && 'alreadyScanned' in attendanceResult && attendanceResult.alreadyScanned) {
            return {
                success: false,
                studentName: student.name,
                message: `This child has already been scanned ${type} today.`
            };
        }

        // 3. Send SMS notification
        let message = "";
        if (type === 'in') {
            message = `Your child ${student.name} has safely arrived at school at ${time}.`;
        } else {
            message = `Your child ${student.name} has left the school premises at ${time}.`;
        }

        try {
            const smsResponse = await fetch('/api/sms/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    schoolId: schoolId,
                    recipient: 'specific',
                    specificParent: student.id || student.studentId || studentId, // Route handles studentId lookup
                    message: message
                }),
            });

            if (!smsResponse.ok) {
                console.error("Failed to send SMS:", await smsResponse.text());
                return { success: true, studentName: student.name, message: "Attendance recorded, but SMS failed to send." };
            }
        } catch (smsErr) {
            console.error("SMS API Error:", smsErr);
            return { success: true, studentName: student.name, message: "Attendance recorded. SMS pending or failed due to network." };
        }

        return { success: true, studentName: student.name, message: "Attendance recorded and SMS sent!" };

    } catch (error: any) {
        console.error("Error processing QR scan:", error);
        return { success: false, message: error.message || "Failed to process scan." };
    }
}
