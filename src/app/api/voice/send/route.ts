import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/index';
import { getFirebaseConfig } from '@/firebase/config';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { sendArkeselVoiceBroadcast } from '@/lib/arkesel';

export async function POST(request: Request) {
    try {
        // Initialize Firebase lazily inside the handler to prevent deployment timeouts
        const { db } = initializeFirebase(getFirebaseConfig());
        const body = await request.json();
        const { schoolId, message, recipient, specificParent, voiceFileUrl } = body;

        if (!schoolId || (!message && !voiceFileUrl) || !recipient) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // 1. Fetch Arkesel credentials from the specific school
        const normalizedSchoolId = schoolId.toUpperCase();
        const schoolDocRef = doc(db, 'schools', normalizedSchoolId);
        const schoolDoc = await getDoc(schoolDocRef);
        
        if (!schoolDoc.exists()) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }
        
        const schoolData = schoolDoc.data();
        const arkeselApiKey = schoolData?.arkeselApiKey?.trim();
        const arkeselVoiceCallerId = schoolData?.arkeselVoiceCallerId?.trim();
        
        if (!arkeselApiKey) {
            return NextResponse.json({ error: 'Missing Arkesel setup for this school. Please ensure API Key is saved in Settings.' }, { status: 400 });
        }

        // 2. Fetch recipients
        let targetPhones = new Set<string>();

        if (recipient === 'all') {
            const parentsRef = collection(db, 'parents');
            const pq = query(parentsRef, where('schoolId', '==', schoolId.toUpperCase()));
            const parentsSnapshot = await getDocs(pq);
            parentsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.phone && data.phone.trim() !== '') {
                    targetPhones.add(data.phone.trim());
                }
            });

            const studentsRef = collection(db, 'students');
            const q = query(studentsRef, where('schoolId', '==', schoolId.toUpperCase()));
            const studentsSnapshot = await getDocs(q);
            studentsSnapshot.forEach(doc => {
                const data = doc.data();
                if (!data.parentId && data.parentPhone && data.parentPhone.trim() !== '') {
                    targetPhones.add(data.parentPhone.trim());
                }
            });
        } else if (recipient === 'specific' && specificParent) {
            const parentDocRef = doc(db, 'parents', specificParent);
            const parentDoc = await getDoc(parentDocRef);
            
            if (parentDoc.exists()) {
                const data = parentDoc.data();
                if (data.schoolId === schoolId.toUpperCase() && data.phone) {
                    targetPhones.add(data.phone.trim());
                }
            } else {
                const studentDocRef = doc(db, 'students', specificParent);
                const studentDoc = await getDoc(studentDocRef);
                
                if (studentDoc.exists()) {
                    const data = studentDoc.data();
                    if (data.schoolId === schoolId.toUpperCase()) {
                        if (data.parentId) {
                            const pDoc = await getDoc(doc(db, 'parents', data.parentId));
                            if (pDoc.exists() && pDoc.data().phone) {
                                targetPhones.add(pDoc.data().phone.trim());
                            }
                        } else if (data.parentPhone) {
                            targetPhones.add(data.parentPhone.trim());
                        }
                    }
                } else {
                     const studentsRef = collection(db, 'students');
                     const q = query(studentsRef, 
                         where('schoolId', '==', schoolId.toUpperCase()), 
                         where('parentId', '==', specificParent)
                     );
                     const parentStudentsSnapshot = await getDocs(q);
                     parentStudentsSnapshot.forEach(doc => {
                         const data = doc.data();
                         if (!data.parentId && data.parentPhone) {
                             targetPhones.add(data.parentPhone.trim());
                         }
                     });
                }
            }
        }

        const recipientsList = Array.from(targetPhones).map(phone => {
            // Ensure phone is in international format (e.g. 233...)
            return phone.startsWith('0') ? '233' + phone.substring(1) : phone;
        });

        if (recipientsList.length === 0) {
            return NextResponse.json({ error: 'No valid phone numbers found for the selected recipients.' }, { status: 400 });
        }

        // 3. Generate TTS Audio if message is provided
        let voiceFileData: { buffer: Buffer, ext: string, mime: string } | undefined;

        if (message && !voiceFileUrl) {
            const apiKey = process.env.GOOGLE_TTS_API_KEY;
            if (!apiKey) {
                return NextResponse.json({ error: 'TTS API Key not configured in server environment.' }, { status: 500 });
            }

            const cleanText = message
                .replace(/\*\*/g, '')
                .replace(/\*/g, '')
                .replace(/__/g, '')
                .replace(/#/g, '')
                .replace(/\[(.*?)\]\(.*?\)/g, '$1')
                .replace(/`/g, '');

            try {
                const ttsResponse = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        input: { text: cleanText },
                        voice: { languageCode: 'en-US', name: 'en-US-Journey-F' },
                        audioConfig: { audioEncoding: 'MP3', speakingRate: 0.85 }
                    })
                });

                if (!ttsResponse.ok) {
                    const errorData = await ttsResponse.json();
                    console.error('Google TTS Error:', errorData);
                    return NextResponse.json({ error: 'Failed to generate TTS audio for broadcast.' }, { status: 500 });
                }

                const ttsData = await ttsResponse.json();
                if (ttsData.audioContent) {
                    voiceFileData = {
                        buffer: Buffer.from(ttsData.audioContent, 'base64'),
                        ext: 'mp3',
                        mime: 'audio/mp3'
                    };
                } else {
                    return NextResponse.json({ error: 'No audio content received from TTS.' }, { status: 500 });
                }
            } catch (ttsErr: any) {
                console.error('TTS Generation exception:', ttsErr);
                return NextResponse.json({ error: 'Exception generating TTS audio.' }, { status: 500 });
            }
        }

        // 4. Send Voice SMS via Arkesel
        try {
            const result = await sendArkeselVoiceBroadcast({
                apiKey: arkeselApiKey,
                recipients: recipientsList,
                voiceFileData: voiceFileData,
                voiceFileUrl: voiceFileUrl,
                callerId: arkeselVoiceCallerId
            });

            return NextResponse.json({ 
                success: true, 
                message: `Successfully queued Voice SMS to ${recipientsList.length} recipient(s).`,
                details: result
            });
        } catch (apiError: any) {
            return NextResponse.json({ 
                error: `Voice SMS sending failed: ${apiError.message}. Check Arkesel credentials.` 
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('API /voice/send exception:', error);
        return NextResponse.json({ error: error.message || 'Internal server error while processing Voice SMS.' }, { status: 500 });
    }
}
