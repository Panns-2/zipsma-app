import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { sendNotificationToUser } from '@/lib/notification-utils';

// --- More Reliable Helper function to check the schedule ---
const isTimeToSend = (settings: any, schoolId: string) => {
    console.log(`CRON: [${schoolId}] Checking schedule...`);

    if (!settings.isEnabled && !settings.isVoiceEnabled) {
        console.log(`CRON: [${schoolId}] Reminders (SMS and Voice) are disabled.`);
        return { shouldSend: false, reason: 'Disabled' };
    }

    if (!settings.time) {
        console.log(`CRON: [${schoolId}] No time set.`);
        return { shouldSend: false, reason: 'No time set' };
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // 1. Check if it has already run today
    if (settings.lastRunDate === todayStr) {
        console.log(`CRON: [${schoolId}] Already sent today (${todayStr}).`);
        return { shouldSend: false, reason: 'Already sent today' };
    }

    const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const currentDay = weekdays[now.getUTCDay()];
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    
    const [scheduledHour, scheduledMinute] = settings.time.split(':').map(Number);

    console.log(`CRON: [${schoolId}] UTC Now: ${currentHour}:${currentMinute}, Scheduled: ${settings.time} on ${JSON.stringify(settings.selectedDays)}`);

    // 2. Check if today is a selected day
    const isSelectedDay = settings.selectedDays && settings.selectedDays.includes(currentDay);
    if (!isSelectedDay) {
        console.log(`CRON: [${schoolId}] Today (${currentDay}) is not a selected day.`);
        return { shouldSend: false, reason: `Not a selected day (${currentDay})` };
    }

    // 3. Check if we are at or after the scheduled time
    const nowInMinutes = currentHour * 60 + currentMinute;
    const scheduledInMinutes = scheduledHour * 60 + scheduledMinute;
    
    const isTimeReached = nowInMinutes >= scheduledInMinutes;

    if (!isTimeReached) {
        console.log(`CRON: [${schoolId}] Scheduled time (${settings.time}) not reached yet.`);
        return { shouldSend: false, reason: `Time not reached (${settings.time} UTC)` };
    }

    console.log(`CRON: [${schoolId}] Schedule match!`);
    return { shouldSend: true };
};

const isCalendarTimeToSend = (settings: any, schoolId: string) => {
    console.log(`CRON: [${schoolId}] Checking calendar schedule...`);

    if (!settings.isEnabled) {
        return { shouldSend: false, reason: 'Disabled' };
    }

    if (!settings.time) {
        return { shouldSend: false, reason: 'No time set' };
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    if (settings.lastRunDate === todayStr) {
        return { shouldSend: false, reason: 'Already sent today' };
    }

    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const [scheduledHour, scheduledMinute] = settings.time.split(':').map(Number);

    const nowInMinutes = currentHour * 60 + currentMinute;
    const scheduledInMinutes = scheduledHour * 60 + scheduledMinute;
    
    if (nowInMinutes < scheduledInMinutes) {
        return { shouldSend: false, reason: `Time not reached` };
    }

    return { shouldSend: true };
};

export async function GET(request: Request) {
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'zipsma.com';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === 'true';
    const testSchoolId = searchParams.get('schoolId')?.toUpperCase();
    const type = searchParams.get('type');
    const channel = searchParams.get('channel') || 'all';
    const isManualTrigger = searchParams.get('manual') === 'true' || searchParams.get('test') === 'true' || !!testSchoolId;

    console.log(`CRON: Job started. DryRun: ${dryRun}, Manual: ${isManualTrigger}, School: ${testSchoolId || 'All'}, Type: ${type || 'All'}`);
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET || 'super-secret-key-placeholder';
  
    if (cronSecret !== expectedSecret && cronSecret !== 'CRON_SECRET') {
      console.error("CRON: Unauthorized access attempt. Cron secret mismatch.");
      
      try {
          const db = getAdminDb();
          await db.collection('cron_logs').add({
              timestamp: new Date().toISOString(),
              error: 'Unauthorized: Access Denied (Secret Mismatch)',
              receivedSecret: cronSecret,
              manual: false,
              schoolId: testSchoolId || 'global',
              type: type || 'all'
          });
      } catch (logError) {
          console.error("CRON: Failed to log auth error to Firestore:", logError);
      }

      return NextResponse.json({ error: 'Unauthorized: Access Denied' }, { status: 401 });
  }

  const formatPhoneNumber = (phone: any) => {
    if (!phone) return null;
    const phoneStr = String(phone).trim();
    if (phoneStr.toLowerCase() === 'n/a' || phoneStr.toLowerCase() === 'none') return null;
    
    let cleaned = phoneStr.replace(/\D/g, '');
    if (!cleaned) return null;
    
    if (cleaned.startsWith('0') && cleaned.length === 10) {
        cleaned = '233' + cleaned.substring(1);
    }
    
    if (cleaned.length === 9 && !cleaned.startsWith('233')) {
        cleaned = '233' + cleaned;
    }

    if (cleaned.length < 9) return null;
    
    return cleaned;
  };

  try {
    const db = getAdminDb();
  
    try {
      console.log("CRON: Proceeding to fetch all schools.");
      const schoolsSnapshot = await db.collection('schools').get();
      let totalMessagesSent = 0;
      let totalMessagesFailed = 0;
      let schoolsProcessed = 0;
      let errors: string[] = [];
      const executionLogs: any[] = [];
      const skippedSchools: any[] = [];
  
      for (const schoolDoc of schoolsSnapshot.docs) {
        const schoolId = schoolDoc.id;

        if (testSchoolId && schoolId !== testSchoolId) continue;
        
        const schoolData = schoolDoc.data();

        // -------------------------
        // 1. FEE REMINDERS
        // -------------------------
        if (!type || type === 'fee' || type === 'fees') {
            const settingsDoc = await db.collection('schools').doc(schoolId).collection('settings').doc('feeReminders').get();
            const settings = settingsDoc.data();
            const voiceSettingsDoc = await db.collection('schools').doc(schoolId).collection('settings').doc('voiceFeeReminders').get();
            const voiceSettings = voiceSettingsDoc.data();
            
            if (!settings && !voiceSettings) {
                console.log(`CRON: Skipping fees for school ${schoolId}. Reason: No reminder settings found.`);
                skippedSchools.push({ schoolId, type: 'fees', reason: 'No settings' });
            } else {
                const smsEval = (settings && (channel === 'all' || channel === 'sms')) 
                    ? (isManualTrigger ? { shouldSend: true, reason: '' } : isTimeToSend(settings, schoolId)) 
                    : { shouldSend: false, reason: 'SMS condition not met' };
                    
                const voiceEval = (voiceSettings && (channel === 'all' || channel === 'voice')) 
                    ? (isManualTrigger ? { shouldSend: true, reason: '' } : isTimeToSend(voiceSettings, schoolId)) 
                    : { shouldSend: false, reason: 'Voice condition not met' };

                if (!smsEval.shouldSend && !voiceEval.shouldSend) {
                    console.log(`CRON: Skipping fees for school ${schoolId}. Reason: SMS: ${smsEval.reason}, Voice: ${voiceEval.reason}`);
                    skippedSchools.push({ schoolId, type: 'fees', reason: `SMS: ${smsEval.reason}, Voice: ${voiceEval.reason}` });
                } else {
                    console.log(`CRON: Processing fees for school ${schoolId}.`);
                    
                    const currentPeriodId = schoolData.currentPeriodId;
                    if (currentPeriodId) {
                        const periodDoc = await db.collection('academicPeriods').doc(currentPeriodId).get();
                        const periodData = periodDoc.data();
                        
                        if (periodData) {
                            const categoriesSnapshot = await db.collection('feeCategories').where('schoolId', '==', schoolId.toUpperCase()).get();
                            const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                            const studentsSnapshot = await db.collection('students').where('schoolId', '==', schoolId.toUpperCase()).get();
                            
                            schoolsProcessed++;
                            const schoolLog = {
                                schoolId,
                                schoolName: schoolData.name,
                                type: 'fees',
                                attempted: 0,
                                sent: 0,
                                failed: 0,
                                details: [] as any[]
                            };
                      
                            for (const studentDoc of studentsSnapshot.docs) {
                                const studentData = studentDoc.data();
                                const parentPhoneNumber = studentData.parentPhone || studentData.parentPhoneNumber;

                                if (!parentPhoneNumber || String(parentPhoneNumber).toLowerCase() === 'n/a') continue;
                                if (studentData.muteReminders) continue;

                                const ledger = studentData.ledger || [];
                                const mainLedger = ledger.filter((t: any) => {
                                    if (t.isVoided) return false;
                                    if (t.periodId && t.periodId !== currentPeriodId) return false;
                                    if (t.categoryId) {
                                        const cat: any = categories.find((c: any) => c.id === t.categoryId);
                                        if (cat && cat.isDaily) return false;
                                    } else {
                                        const catValue = String(t.category || "").toLowerCase().trim();
                                        const cat: any = categories.find((c: any) => c.id.toLowerCase() === catValue || c.name.toLowerCase() === catValue);
                                        if (cat?.isDaily) return false;
                                        if (t.id && (t.id.startsWith('auto-df-') || t.id.startsWith('auto-feeding-') || t.id.startsWith('feeding-') || t.id.startsWith('mig-df-') || t.id.startsWith('mig-fa-'))) return false;
                                        if (!cat || cat.isDaily) {
                                            const markers = ['feeding', 'daily', 'canteen', 'extra classes', 'late feeding'];
                                            if (markers.some(m => catValue.includes(m))) return false;
                                        }
                                    }
                                    return true;
                                });

                                const totalTermFees = mainLedger.reduce((sum: number, t: any) => sum + (t.debit || 0), 0);
                                const actualPaid = mainLedger.reduce((sum: number, t: any) => sum + (t.credit || 0), 0);
                                
                                let expectedPercentage = 100;
                                let currentDeadlineDate = "the current period";
                                let latestStageName = "";
                                
                                const periodStartDate = periodData.startDate ? new Date(periodData.startDate) : new Date();
                                const currentDate = new Date();
                                const daysSinceStart = Math.floor((currentDate.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24));
                                const currentWeekNumber = Math.max(1, Math.ceil(daysSinceStart / 7));

                                if (periodData.installmentPlan && periodData.installmentPlan.length > 0) {
                                    expectedPercentage = 0;
                                    let activeDeadlineDate: Date | null = null;
                                    let activeStageName = "";
                                    let absoluteLatestDate: Date | null = null;
                                    let absoluteLatestName = "";

                                    for (const stage of periodData.installmentPlan) {
                                        let isPastDeadline = false;
                                        let stageDeadlineDate: Date;
                                        let stageName = stage.deadlineType === 'Week' ? `Week ${parseInt((stage.deadlineValue || '').replace('Week ', '')) || 1}` : (stage.name || '');

                                        if (stage.deadlineType === 'Week') {
                                            const stageWeek = parseInt((stage.deadlineValue || '').replace('Week ', '')) || 1;
                                            stageDeadlineDate = new Date(periodStartDate);
                                            stageDeadlineDate.setDate(stageDeadlineDate.getDate() + (stageWeek * 7));
                                            if (currentWeekNumber >= stageWeek) isPastDeadline = true;
                                        } else {
                                            stageDeadlineDate = new Date(stage.deadlineValue);
                                            if (currentDate >= stageDeadlineDate) isPastDeadline = true;
                                        }

                                        if (isPastDeadline) {
                                            expectedPercentage += stage.percentage;
                                        } else {
                                            if (!activeDeadlineDate || stageDeadlineDate < activeDeadlineDate) {
                                                activeDeadlineDate = stageDeadlineDate;
                                                activeStageName = stageName;
                                            }
                                        }

                                        if (!absoluteLatestDate || stageDeadlineDate > absoluteLatestDate) {
                                            absoluteLatestDate = stageDeadlineDate;
                                            absoluteLatestName = stageName;
                                        }
                                    }
                                    
                                    const finalDeadlineDate = activeDeadlineDate || absoluteLatestDate;
                                    latestStageName = activeStageName || absoluteLatestName;

                                    if (finalDeadlineDate) {
                                        const day = finalDeadlineDate.getDate();
                                        const month = finalDeadlineDate.toLocaleDateString('en-GB', { month: 'long' });
                                        const year = finalDeadlineDate.getFullYear();
                                        
                                        const getOrdinal = (n: number) => {
                                            const s = ["th", "st", "nd", "rd"];
                                            const v = n % 100;
                                            return n + (s[(v - 20) % 10] || s[v] || s[0]);
                                        };

                                        currentDeadlineDate = `${getOrdinal(day)} ${month} ${year}`;
                                    }
                                    expectedPercentage = Math.min(100, expectedPercentage);
                                }

                                if (!latestStageName) {
                                    latestStageName = `Week ${currentWeekNumber}`;
                                }

                                const totalOutstanding = Math.max(0, totalTermFees - actualPaid);
                                const expectedAmount = (totalTermFees * expectedPercentage) / 100;
                                const outstandingBalance = Math.max(0, expectedAmount - actualPaid);

                                if (outstandingBalance > 0) {
                                    const clientId = schoolData.hubtelSmsClientId?.trim();
                                    const clientSecret = schoolData.hubtelSmsClientSecret?.trim();
                                    let hubtelSenderId = schoolData.hubtelSenderId?.trim() || schoolData.name || 'ZipSMA';
                                    hubtelSenderId = hubtelSenderId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 11);

                                    let pushMessage = "Your ward's fee balance is pending.";

                                    if (smsEval.shouldSend && settings?.isEnabled && clientId && clientSecret) {
                                        const message = (settings.message || "Your ward's fee balance is {balance}. Please make payment as soon as possible.")
                                            .replace(/{balance}/g, `GHS ${outstandingBalance.toFixed(2)}`)
                                            .replace(/{total_balance}/g, `GHS ${totalOutstanding.toFixed(2)}`)
                                            .replace(/{week}/g, latestStageName)
                                            .replace(/{date}/g, currentDeadlineDate)
                                            .replace(/{name}/g, studentData.name || "your ward");
                                            
                                        pushMessage = message;
                                    
                                        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
                                        const formattedPhone = formatPhoneNumber(parentPhoneNumber);
                                        
                                        if (formattedPhone) {
                                            schoolLog.attempted++;
                                            if (dryRun) {
                                                schoolLog.sent++;
                                                totalMessagesSent++;
                                            } else {
                                                try {
                                                    const response = await fetch('https://api.hubtel.com/v1/messages/send', {
                                                        method: 'POST',
                                                        headers: { 
                                                            'Content-Type': 'application/json', 
                                                            'Authorization': `Basic ${auth}`
                                                        },
                                                        body: JSON.stringify({ 
                                                            From: hubtelSenderId, 
                                                            To: formattedPhone, 
                                                            Content: message,
                                                            Type: 0,
                                                            clientid: clientId,
                                                            ClientReference: `cron_fee_${Date.now()}_${Math.floor(Math.random() * 1000)}`
                                                        }),
                                                    });

                                                    if (response.ok) {
                                                        schoolLog.sent++;
                                                        totalMessagesSent++;
                                                    } else {
                                                        schoolLog.failed++;
                                                        totalMessagesFailed++;
                                                        const responseText = await response.text();
                                                        const errorMsg = `CRON: Failed to send fee SMS to ${parentPhoneNumber} (School: ${schoolId}). Status: ${response.status}. Body: ${responseText}`;
                                                        console.error(errorMsg);
                                                        errors.push(errorMsg);
                                                        schoolLog.details.push({ phone: parentPhoneNumber, error: responseText });
                                                    }
                                                } catch (smsError: any) {
                                                    console.error(`CRON: Network error while sending SMS: ${smsError.message}`);
                                                }
                                            }
                                        }
                                    }

                                    // Sendexa Voice Call
                                    if (voiceEval.shouldSend && voiceSettings?.isEnabled && schoolData.sendexaApiKey) {
                                        const sendexaApiKey = schoolData.sendexaApiKey;
                                        const formattedPhone = formatPhoneNumber(parentPhoneNumber);
                                        const voiceLanguage = studentData.preferredVoiceLanguage || 'en-GH';
                                        
                                        if (formattedPhone) {
                                            schoolLog.attempted++;
                                            const voiceMessage = (voiceSettings.message || "Your ward's fee balance is {balance}. Please make payment as soon as possible.")
                                                .replace(/{balance}/g, `GHS ${outstandingBalance.toFixed(2)}`)
                                                .replace(/{total_balance}/g, `GHS ${totalOutstanding.toFixed(2)}`)
                                                .replace(/{week}/g, latestStageName)
                                                .replace(/{date}/g, currentDeadlineDate)
                                                .replace(/{name}/g, studentData.name || "your ward");
                                            
                                            pushMessage = voiceMessage;

                                            if (dryRun) {
                                                schoolLog.sent++;
                                                totalMessagesSent++;
                                            } else {
                                                try {
                                                    // Add + to the phone number for E.164 format if missing
                                                    const e164Phone = formattedPhone.startsWith('233') ? `+${formattedPhone}` : formattedPhone;
                                                    
                                                    // Try the standard /v1/voice/send or /v1/voice/call endpoint with basic message
                                                    const sendexaResponse = await fetch('https://api.sendexa.co/v1/voice/calls', {
                                                        method: 'POST',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            'Authorization': `Basic ${sendexaApiKey}`
                                                        },
                                                        body: JSON.stringify({
                                                            to: e164Phone,
                                                            from: schoolData.sendexaVoiceCallerId || 'SENDEXA',
                                                            message: voiceMessage
                                                        })
                                                    });

                                                    if (sendexaResponse.ok) {
                                                        schoolLog.sent++;
                                                        totalMessagesSent++;
                                                    } else {
                                                        schoolLog.failed++;
                                                        totalMessagesFailed++;
                                                        const responseText = await sendexaResponse.text();
                                                        const errorMsg = `CRON: Failed to send Sendexa Voice call to ${parentPhoneNumber} (School: ${schoolId}). Body: ${responseText}`;
                                                        console.error(errorMsg);
                                                        errors.push(errorMsg);
                                                        schoolLog.details.push({ phone: parentPhoneNumber, error: responseText });
                                                    }
                                                } catch (voiceError: any) {
                                                    schoolLog.failed++;
                                                    totalMessagesFailed++;
                                                    const errorMsg = `CRON: Network error while triggering Sendexa Voice Call: ${voiceError.message}`;
                                                    console.error(errorMsg);
                                                    errors.push(errorMsg);
                                                    schoolLog.details.push({ phone: parentPhoneNumber, error: voiceError.message });
                                                }
                                            }
                                        }
                                    }

                                    // Push Notification
                                    try {
                                        const notificationPayload = {
                                            title: 'Fee Reminder',
                                            body: pushMessage,
                                            data: { schoolId, type: 'fee_reminder', studentId: studentDoc.id }
                                        };
                                        sendNotificationToUser(studentDoc.id, notificationPayload);
                                        if (studentData.parentId) {
                                            sendNotificationToUser(studentData.parentId, notificationPayload);
                                        }
                                    } catch (fcmError) {}
                                }
                            }
                          
                            executionLogs.push(schoolLog);
                          
                            if (schoolLog.attempted > 0 && !dryRun && !isManualTrigger) {
                                const todayStr = new Date().toISOString().split('T')[0];
                                if (smsEval.shouldSend && settings?.isEnabled) {
                                    await db.collection('schools').doc(schoolId).collection('settings').doc('feeReminders').set({
                                        lastRunDate: todayStr
                                    }, { merge: true });
                                }
                                if (voiceEval.shouldSend && voiceSettings?.isEnabled) {
                                    await db.collection('schools').doc(schoolId).collection('settings').doc('voiceFeeReminders').set({
                                        lastRunDate: todayStr
                                    }, { merge: true });
                                }
                            }
                        }
                    }
                }
            }
        } // end fee reminders

        // -------------------------
        // 2. DAILY FEE REMINDERS
        // -------------------------
        if (!type || type === 'daily_fees' || type === 'daily_fee') {
            const settingsDoc = await db.collection('schools').doc(schoolId).collection('settings').doc('dailyFeeReminders').get();
            const settings = settingsDoc.data();
            
            if (!settings) {
                console.log(`CRON: Skipping daily fees for school ${schoolId}. Reason: No reminder settings found.`);
                skippedSchools.push({ schoolId, type: 'daily_fees', reason: 'No settings' });
            } else {
                const { shouldSend, reason } = isManualTrigger ? { shouldSend: true, reason: '' } : isTimeToSend(settings, schoolId);
                if (!shouldSend) {
                    console.log(`CRON: Skipping daily fees for school ${schoolId}. Reason: ${reason}`);
                    skippedSchools.push({ schoolId, type: 'daily_fees', reason });
                } else {
                    console.log(`CRON: Processing daily fees for school ${schoolId}.`);
                    
                    const currentPeriodId = schoolData.currentPeriodId;
                    if (currentPeriodId) {
                        const categoriesSnapshot = await db.collection('feeCategories').where('schoolId', '==', schoolId.toUpperCase()).get();
                        const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        const dailyCategories = categories.filter((c: any) => c.isDaily);

                        // If no daily categories exist, fallback to checking legacy 'feeding' category implicitly
                        if (dailyCategories.length === 0 && !categories.some((c: any) => c.id === 'feeding' || c.name === 'Feeding Fee')) {
                            dailyCategories.push({ id: 'feeding', name: 'Feeding Fee', schoolId: schoolId.toUpperCase(), isDaily: true } as any);
                        }

                        const studentsSnapshot = await db.collection('students').where('schoolId', '==', schoolId.toUpperCase()).get();
                        
                        schoolsProcessed++;
                        const schoolLog = {
                            schoolId,
                            schoolName: schoolData.name,
                            type: 'daily_fees',
                            attempted: 0,
                            sent: 0,
                            failed: 0,
                            details: [] as any[]
                        };
                  
                        for (const studentDoc of studentsSnapshot.docs) {
                            const studentData = studentDoc.data();
                            const parentPhoneNumber = studentData.parentPhone || studentData.parentPhoneNumber;

                            if (!parentPhoneNumber || String(parentPhoneNumber).toLowerCase() === 'n/a') continue;
                            if (studentData.muteReminders) continue;

                            const attendance = studentData.attendance || [];
                            const daysPresentInPeriod = attendance.filter((a: any) => a.attended && (!currentPeriodId || a.periodId === currentPeriodId)).length;

                            let dailyAccrued = 0;
                            dailyCategories.forEach((cat: any) => {
                                const studentRate = (studentData.dailyFees || []).find((f: any) => f.categoryId === cat.id)?.rate || 0;
                                dailyAccrued += daysPresentInPeriod * Number(studentRate);
                            });

                            const ledger = studentData.ledger || [];
                            const dailyLedger = ledger.filter((t: any) => {
                                if (t.isVoided) return false;
                                if (t.periodId && t.periodId !== currentPeriodId) return false;
                                
                                let isDaily = false;
                                if (t.categoryId) {
                                    const cat: any = categories.find((c: any) => c.id === t.categoryId);
                                    if (cat && cat.isDaily) isDaily = true;
                                } else {
                                    const catValue = String(t.category || "").toLowerCase().trim();
                                    const cat: any = categories.find((c: any) => c.id.toLowerCase() === catValue || c.name.toLowerCase() === catValue);
                                    if (cat?.isDaily) isDaily = true;
                                    if (t.id && (t.id.startsWith('auto-df-') || t.id.startsWith('auto-feeding-') || t.id.startsWith('feeding-') || t.id.startsWith('mig-df-') || t.id.startsWith('mig-fa-'))) isDaily = true;
                                    if (!cat || cat.isDaily) {
                                        const markers = ['feeding', 'daily', 'canteen', 'extra classes', 'late feeding'];
                                        if (markers.some(m => catValue.includes(m))) isDaily = true;
                                    }
                                }
                                return isDaily;
                            });

                            const manualDebits = dailyLedger.reduce((sum: number, t: any) => {
                                const isAutomated = t.id && (t.id.startsWith('auto-df-') || t.id.startsWith('auto-feeding-') || t.id.startsWith('feeding-') || t.id.startsWith('mig-df-') || t.id.startsWith('mig-fa-'));
                                return sum + (isAutomated ? 0 : (Number(t.debit) || 0));
                            }, 0);

                            const totalBilled = dailyAccrued + manualDebits;
                            const totalPaid = dailyLedger.reduce((sum: number, t: any) => sum + (t.credit || 0), 0);
                            const outstandingBalance = Math.max(0, totalBilled - totalPaid);

                            if (outstandingBalance > 0) {
                                const message = (settings.message || "Your ward {name} has an outstanding daily fee balance of {balance}. Please make payment. Thank you.")
                                    .replace(/{balance}/g, `GHS ${outstandingBalance.toFixed(2)}`)
                                    .replace(/{name}/g, studentData.name || "your ward");
                                
                                const clientId = schoolData.hubtelSmsClientId?.trim();
                                const clientSecret = schoolData.hubtelSmsClientSecret?.trim();
                                let hubtelSenderId = schoolData.hubtelSenderId?.trim() || schoolData.name || 'ZipSMA';
                                hubtelSenderId = hubtelSenderId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 11);

                                if (clientId && clientSecret) {
                                    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
                                    const formattedPhone = formatPhoneNumber(parentPhoneNumber);
                                    
                                    if (formattedPhone) {
                                        schoolLog.attempted++;
                                        if (dryRun) {
                                            schoolLog.sent++;
                                            totalMessagesSent++;
                                        } else {
                                            try {
                                                const response = await fetch('https://api.hubtel.com/v1/messages/send', {
                                                    method: 'POST',
                                                    headers: { 
                                                        'Content-Type': 'application/json', 
                                                        'Authorization': `Basic ${auth}`
                                                    },
                                                    body: JSON.stringify({ 
                                                        From: hubtelSenderId, 
                                                        To: formattedPhone, 
                                                        Content: message,
                                                        Type: 0,
                                                        clientid: clientId,
                                                        ClientReference: `cron_daily_${Date.now()}_${Math.floor(Math.random() * 1000)}`
                                                    }),
                                                });

                                                if (response.ok) {
                                                    schoolLog.sent++;
                                                    totalMessagesSent++;
                                                } else {
                                                    schoolLog.failed++;
                                                    totalMessagesFailed++;
                                                    const responseText = await response.text();
                                                    const errorMsg = `CRON: Failed to send daily fee SMS to ${parentPhoneNumber} (School: ${schoolId}). Status: ${response.status}. Body: ${responseText}`;
                                                    console.error(errorMsg);
                                                    errors.push(errorMsg);
                                                    schoolLog.details.push({ phone: parentPhoneNumber, error: responseText });
                                                }
                                            } catch (smsError: any) {
                                                console.error(`CRON: Network error while sending SMS: ${smsError.message}`);
                                            }
                                        }
                                    }
                                }

                                // Push Notification
                                try {
                                    const notificationPayload = {
                                        title: 'Daily Fee Reminder',
                                        body: message,
                                        data: { schoolId, type: 'daily_fee_reminder', studentId: studentDoc.id }
                                    };
                                    sendNotificationToUser(studentDoc.id, notificationPayload);
                                    if (studentData.parentId) {
                                        sendNotificationToUser(studentData.parentId, notificationPayload);
                                    }
                                } catch (fcmError) {}
                            }
                        }
                      
                        executionLogs.push(schoolLog);
                      
                        if (schoolLog.attempted > 0 && !dryRun && !isManualTrigger) {
                            await db.collection('schools').doc(schoolId).collection('settings').doc('dailyFeeReminders').set({
                                lastRunDate: new Date().toISOString().split('T')[0]
                            }, { merge: true });
                        }
                    }
                }
            }
        } // end daily fee reminders

        // -------------------------
        // 2. CALENDAR REMINDERS
        // -------------------------
        if (!type || type === 'calendar') {
            const settingsDoc = await db.collection('schools').doc(schoolId).collection('settings').doc('calendarReminders').get();
            const settings = settingsDoc.data();
            
            if (!settings) {
                console.log(`CRON: Skipping calendar for school ${schoolId}. Reason: No reminder settings found.`);
                skippedSchools.push({ schoolId, type: 'calendar', reason: 'No settings' });
            } else {
                const { shouldSend, reason } = isManualTrigger ? { shouldSend: true, reason: '' } : isCalendarTimeToSend(settings, schoolId);
                if (!shouldSend) {
                    console.log(`CRON: Skipping calendar for school ${schoolId}. Reason: ${reason}`);
                    skippedSchools.push({ schoolId, type: 'calendar', reason });
                } else {
                    console.log(`CRON: Processing calendar for school ${schoolId}.`);
                    
                    const eventsSnapshot = await db.collection('schoolCalendar').where('schoolId', '==', schoolId.toUpperCase()).get();
                    const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }) as any);

                    const today = new Date();
                    const todayStr = today.toISOString().split('T')[0];
                    const todayTime = new Date(todayStr).getTime();

                    // Find events that are 7 days or 1 day away
                    const eventsToRemind = events.filter((event: any) => {
                        if (!event.date) return false;
                        const eventDateStr = event.date; // assuming YYYY-MM-DD
                        const eventTime = new Date(eventDateStr).getTime();
                        const diffDays = Math.round((eventTime - todayTime) / (1000 * 60 * 60 * 24));
                        
                        return diffDays === 7 || diffDays === 1;
                    });

                    if (eventsToRemind.length > 0) {
                        const studentsSnapshot = await db.collection('students').where('schoolId', '==', schoolId.toUpperCase()).get();
                        
                        schoolsProcessed++;
                        const schoolLog = {
                            schoolId,
                            schoolName: schoolData.name,
                            type: 'calendar',
                            attempted: 0,
                            sent: 0,
                            failed: 0,
                            details: [] as any[]
                        };

                        for (const event of eventsToRemind) {
                            const messageTemplate = settings.message || "Reminder: {title} is on {date}";
                            
                            // Format date nicely (e.g. 15th June 2026)
                            const eventDateObj = new Date(event.date);
                            const day = eventDateObj.getDate();
                            const month = eventDateObj.toLocaleDateString('en-GB', { month: 'long' });
                            const year = eventDateObj.getFullYear();
                            const getOrdinal = (n: number) => {
                                const s = ["th", "st", "nd", "rd"];
                                const v = n % 100;
                                return n + (s[(v - 20) % 10] || s[v] || s[0]);
                            };
                            const formattedDate = `${getOrdinal(day)} ${month} ${year}`;

                            const message = messageTemplate
                                .replace(/{title}/g, event.title || 'Event')
                                .replace(/{date}/g, formattedDate);

                            const clientId = schoolData.hubtelSmsClientId?.trim();
                            const clientSecret = schoolData.hubtelSmsClientSecret?.trim();
                            let hubtelSenderId = schoolData.hubtelSenderId?.trim() || schoolData.name || 'ZipSMA';
                            hubtelSenderId = hubtelSenderId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 11);

                            // Send to all students
                            for (const studentDoc of studentsSnapshot.docs) {
                                const studentData = studentDoc.data();
                                const parentPhoneNumber = studentData.parentPhone || studentData.parentPhoneNumber;

                                if (!parentPhoneNumber || String(parentPhoneNumber).toLowerCase() === 'n/a') continue;

                                if (clientId && clientSecret) {
                                    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
                                    const formattedPhone = formatPhoneNumber(parentPhoneNumber);
                                    
                                    if (formattedPhone) {
                                        schoolLog.attempted++;
                                        if (dryRun) {
                                            schoolLog.sent++;
                                            totalMessagesSent++;
                                        } else {
                                            try {
                                                const response = await fetch('https://api.hubtel.com/v1/messages/send', {
                                                    method: 'POST',
                                                    headers: { 
                                                        'Content-Type': 'application/json', 
                                                        'Authorization': `Basic ${auth}`
                                                    },
                                                    body: JSON.stringify({ 
                                                        From: hubtelSenderId, 
                                                        To: formattedPhone, 
                                                        Content: message,
                                                        Type: 0,
                                                        clientid: clientId,
                                                        ClientReference: `cron_cal_${Date.now()}_${Math.floor(Math.random() * 1000)}`
                                                    }),
                                                });

                                                if (response.ok) {
                                                    schoolLog.sent++;
                                                    totalMessagesSent++;
                                                } else {
                                                    schoolLog.failed++;
                                                    totalMessagesFailed++;
                                                    const responseText = await response.text();
                                                    const errorMsg = `CRON: Failed to send calendar SMS to ${parentPhoneNumber} (School: ${schoolId}). Status: ${response.status}. Body: ${responseText}`;
                                                    console.error(errorMsg);
                                                    errors.push(errorMsg);
                                                    schoolLog.details.push({ phone: parentPhoneNumber, error: responseText });
                                                }
                                            } catch (smsError: any) {
                                                console.error(`CRON: Network error while sending calendar SMS: ${smsError.message}`);
                                            }
                                        }
                                    }
                                }

                                // Push Notification
                                try {
                                    const notificationPayload = {
                                        title: 'School Calendar Reminder',
                                        body: message,
                                        data: { schoolId, type: 'calendar_reminder', eventId: event.id }
                                    };
                                    sendNotificationToUser(studentDoc.id, notificationPayload);
                                    if (studentData.parentId) {
                                        sendNotificationToUser(studentData.parentId, notificationPayload);
                                    }
                                } catch (fcmError) {}
                            }
                        }

                        executionLogs.push(schoolLog);
                        
                        if (schoolLog.attempted > 0 && !dryRun && !isManualTrigger) {
                            await db.collection('schools').doc(schoolId).collection('settings').doc('calendarReminders').set({
                                lastRunDate: new Date().toISOString().split('T')[0]
                            }, { merge: true });
                        }
                    } else {
                        console.log(`CRON: No upcoming events exactly 7 or 1 days away for school ${schoolId}.`);
                    }
                }
            }
        } // end calendar reminders

        // -------------------------
        // 3. ATTENDANCE REMINDERS
        // -------------------------
        if (!type || type === 'attendance') {
            const settingsDoc = await db.collection('schools').doc(schoolId).collection('settings').doc('attendanceReminders').get();
            const settings = settingsDoc.data();
            
            if (!settings) {
                console.log(`CRON: Skipping attendance for school ${schoolId}. Reason: No reminder settings found.`);
                skippedSchools.push({ schoolId, type: 'attendance', reason: 'No settings' });
            } else {
                const { shouldSend, reason } = isManualTrigger ? { shouldSend: true, reason: '' } : isTimeToSend(settings, schoolId);
                if (!shouldSend) {
                    console.log(`CRON: Skipping attendance for school ${schoolId}. Reason: ${reason}`);
                    skippedSchools.push({ schoolId, type: 'attendance', reason });
                } else {
                    console.log(`CRON: Processing attendance for school ${schoolId}.`);
                    
                    const studentsSnapshot = await db.collection('students').where('schoolId', '==', schoolId.toUpperCase()).get();
                    const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    const todayStr = new Date().toISOString().split('T')[0];

                    // Group students by class
                    const studentsByClass = students.reduce((acc: any, student: any) => {
                        const className = student.className || 'Unassigned';
                        if (!acc[className]) acc[className] = [];
                        acc[className].push(student);
                        return acc;
                    }, {});

                    schoolsProcessed++;
                    const schoolLog = {
                        schoolId,
                        schoolName: schoolData.name,
                        type: 'attendance',
                        attempted: 0,
                        sent: 0,
                        failed: 0,
                        details: [] as any[]
                    };

                    const clientId = schoolData.hubtelSmsClientId?.trim();
                    const clientSecret = schoolData.hubtelSmsClientSecret?.trim();
                    let hubtelSenderId = schoolData.hubtelSenderId?.trim() || schoolData.name || 'ZipSMA';
                    hubtelSenderId = hubtelSenderId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 11);

                    for (const [className, classStudents] of Object.entries(studentsByClass)) {
                        // Check if anyone in this class was marked today
                        const classStudentsArr = classStudents as any[];
                        const anyMarkedToday = classStudentsArr.some(s => 
                            s.attendance?.some((a: any) => a.date === todayStr)
                        );

                        if (!anyMarkedToday) {
                            console.log(`CRON: Skipping attendance SMS for ${className} at ${schoolId} because no attendance was taken today.`);
                            continue;
                        }

                        // Send to anyone who was not marked present today
                        for (const studentData of classStudentsArr) {
                            const parentPhoneNumber = studentData.parentPhone || studentData.parentPhoneNumber;
                            if (!parentPhoneNumber || String(parentPhoneNumber).toLowerCase() === 'n/a') continue;
                            if (studentData.muteReminders) continue;

                            const isPresentToday = studentData.attendance?.some((a: any) => a.date === todayStr && a.attended);
                            
                            if (!isPresentToday) {
                                const messageTemplate = settings.message || "Dear Parent, your ward {name} was marked absent today at ZipSMA. Please let us know if they are well.";
                                const message = messageTemplate.replace(/{name}/g, studentData.name || "your ward");

                                if (clientId && clientSecret) {
                                    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
                                    const formattedPhone = formatPhoneNumber(parentPhoneNumber);
                                    
                                    if (formattedPhone) {
                                        schoolLog.attempted++;
                                        if (dryRun) {
                                            schoolLog.sent++;
                                            totalMessagesSent++;
                                        } else {
                                            try {
                                                const response = await fetch('https://api.hubtel.com/v1/messages/send', {
                                                    method: 'POST',
                                                    headers: { 
                                                        'Content-Type': 'application/json', 
                                                        'Authorization': `Basic ${auth}`
                                                    },
                                                    body: JSON.stringify({ 
                                                        From: hubtelSenderId, 
                                                        To: formattedPhone, 
                                                        Content: message,
                                                        Type: 0,
                                                        clientid: clientId,
                                                        ClientReference: `cron_att_${Date.now()}_${Math.floor(Math.random() * 1000)}`
                                                    }),
                                                });

                                                if (response.ok) {
                                                    schoolLog.sent++;
                                                    totalMessagesSent++;
                                                } else {
                                                    schoolLog.failed++;
                                                    totalMessagesFailed++;
                                                    const responseText = await response.text();
                                                    const errorMsg = `CRON: Failed to send attendance SMS to ${parentPhoneNumber} (School: ${schoolId}). Status: ${response.status}. Body: ${responseText}`;
                                                    console.error(errorMsg);
                                                    errors.push(errorMsg);
                                                    schoolLog.details.push({ phone: parentPhoneNumber, error: responseText });
                                                }
                                            } catch (smsError: any) {
                                                console.error(`CRON: Network error while sending attendance SMS: ${smsError.message}`);
                                            }
                                        }
                                    }
                                }

                                // Push Notification
                                try {
                                    const notificationPayload = {
                                        title: 'Attendance Reminder',
                                        body: message,
                                        data: { schoolId, type: 'attendance_reminder', studentId: studentData.id }
                                    };
                                    sendNotificationToUser(studentData.id, notificationPayload);
                                    if (studentData.parentId) {
                                        sendNotificationToUser(studentData.parentId, notificationPayload);
                                    }
                                } catch (fcmError) {}
                            }
                        }
                    }

                    executionLogs.push(schoolLog);
                    
                    if (schoolLog.attempted > 0 && !dryRun && !isManualTrigger) {
                        await db.collection('schools').doc(schoolId).collection('settings').doc('attendanceReminders').set({
                            lastRunDate: new Date().toISOString().split('T')[0]
                        }, { merge: true });
                    }
                }
            }
        } // end attendance reminders

      } // closes for loop of schools

      // --- Log the execution to Firestore ---
      const logEntry = {
          schoolId: testSchoolId || 'global',
          timestamp: new Date().toISOString(),
          dryRun,
          manual: isManualTrigger,
          type: type || 'all',
          schoolsProcessed,
          totalSent: totalMessagesSent,
          totalFailed: totalMessagesFailed,
          schoolLogs: executionLogs,
          skippedSchools,
          errors: errors.length > 0 ? errors : null
      };
      
      await db.collection('cron_logs').add(logEntry);
      
      const finalMessage = `CRON: Process completed. Sent: ${totalMessagesSent}, Failed: ${totalMessagesFailed} across ${schoolsProcessed} schools.`;
      console.log(finalMessage);
      return NextResponse.json({ ...logEntry, message: finalMessage });

    } catch (error) {
      console.error('CRON: Unhandled error in cron job:', error);
      return NextResponse.json({ error: 'A failure occurred while processing reminders.' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('CRON: Critical error initializing database or fetching schools:', error);
    return NextResponse.json({ error: 'Failed to initialize cron job.' }, { status: 500 });
  }
}
