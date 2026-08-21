// src/lib/arkesel.ts

/**
 * Arkesel Voice API Utility
 * 
 * Sends a Voice broadcast (TTS via buffer or pre-recorded audio URL) using the Arkesel Voice API.
 */

interface ArkeselVoiceBroadcastOptions {
  apiKey: string;
  recipients: string[];
  voiceFileData?: { buffer: Buffer, ext: string, mime: string }; // For TTS
  voiceFileUrl?: string; // For pre-recorded audio
  callerId?: string; // Optional, usually provided by Arkesel or configured
}

function processWavBuffer(buffer: Buffer, delaySeconds: number, volumeFactor: number): Buffer {
    let dataOffset = 12;
    while (dataOffset < buffer.length) {
        const chunkId = buffer.toString('utf8', dataOffset, dataOffset + 4);
        const chunkSize = buffer.readUInt32LE(dataOffset + 4);
        if (chunkId === 'data') {
            break;
        }
        dataOffset += 8 + chunkSize;
    }
    
    if (dataOffset >= buffer.length) {
        return buffer;
    }
    
    const headerSize = dataOffset + 8;
    const pcmDataLength = buffer.readUInt32LE(dataOffset + 4);
    const byteRate = buffer.readUInt32LE(28); 
    
    const pcmData = Buffer.alloc(pcmDataLength);
    buffer.copy(pcmData, 0, headerSize, headerSize + pcmDataLength);
    
    for (let i = 0; i < pcmData.length; i += 2) {
        let sample = pcmData.readInt16LE(i);
        sample = Math.round(sample * volumeFactor);
        if (sample > 32767) sample = 32767;
        if (sample < -32768) sample = -32768;
        pcmData.writeInt16LE(sample, i);
    }
    
    const silenceBytes = Math.floor(delaySeconds * byteRate);
    const adjustedSilenceBytes = silenceBytes % 2 === 0 ? silenceBytes : silenceBytes + 1;
    const silenceBuffer = Buffer.alloc(adjustedSilenceBytes, 0);
    
    const newPcmDataLength = adjustedSilenceBytes + pcmDataLength;
    const newHeader = Buffer.alloc(headerSize);
    buffer.copy(newHeader, 0, 0, headerSize);
    
    const fileChunkSizeOffset = 4;
    newHeader.writeUInt32LE(newHeader.length - 8 + newPcmDataLength, fileChunkSizeOffset);
    newHeader.writeUInt32LE(newPcmDataLength, dataOffset + 4);
    
    return Buffer.concat([newHeader, silenceBuffer, pcmData]);
}

export async function generateTtsAudioBuffer(message: string, language: string = 'en-GH'): Promise<{ buffer: Buffer, ext: string, mime: string }> {
    const abenaApiKey = process.env.ABENA_API_KEY;

    const cleanText = message
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/__/g, '')
        .replace(/#/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/`/g, '');

    // Use Abena AI entirely
    const voiceId = language === 'tw' ? 'abena_twi_lite' : 'akua_eng';

    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    if (abenaApiKey) {
        headers['Authorization'] = `Bearer ${abenaApiKey}`;
    }

    const ttsResponse = await fetch(`https://abena.mobobi.com/playground/api/v1/tts/synthesize/`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            text: cleanText,
            voice: voiceId
        })
    });

    if (!ttsResponse.ok) {
        let errorData;
        try {
            errorData = await ttsResponse.json();
        } catch(e) {
            errorData = await ttsResponse.text();
        }
        console.error('Abena AI TTS Error:', errorData);
        throw new Error('Failed to generate TTS audio.');
    }

    const ttsData = await ttsResponse.json();
    if (ttsData.audio_base64) {
        let rawBuffer = Buffer.from(ttsData.audio_base64, 'base64');
        try {
            // Add 2.5 seconds of silence and increase volume by 2.0x (approx +6dB)
            rawBuffer = processWavBuffer(rawBuffer, 2.5, 2.0) as any;
        } catch (e) {
            console.error('Failed to process WAV buffer:', e);
        }
        
        return {
            buffer: rawBuffer,
            ext: 'wav',
            mime: 'audio/wav'
        };
    } else {
        throw new Error('No audio content received from TTS.');
    }
}

export async function sendArkeselVoiceBroadcast({
  apiKey,
  recipients,
  voiceFileData,
  voiceFileUrl,
  callerId
}: ArkeselVoiceBroadcastOptions) {
  if (!apiKey) {
    throw new Error('Arkesel API Key is required.');
  }

  if (!recipients || recipients.length === 0) {
    throw new Error('At least one recipient is required.');
  }

  if (!voiceFileData && !voiceFileUrl) {
    throw new Error('Either a voice file buffer data (TTS) or a voice file URL is required.');
  }

  const url = 'https://sms.arkesel.com/api/v2/sms/voice/send';
  
  // Build FormData for Arkesel's V2 API
  const formData = new FormData();
  
  recipients.forEach(recipient => {
      formData.append('recipients[]', recipient);
  });

  if (callerId) {
      formData.append('voice_id', callerId);
  }

  if (voiceFileData) {
      // If we generated TTS locally, append the audio buffer
      // Wrap the Buffer in a Uint8Array to satisfy TypeScript's BlobPart type
      const blob = new Blob([new Uint8Array(voiceFileData.buffer)], { type: voiceFileData.mime });
      formData.append('voice_file', blob, `announcement.${voiceFileData.ext}`);
  } else if (voiceFileUrl) {
      // If using an external URL, append the URL.
      // NOTE: If Arkesel requires the actual file and doesn't accept a URL directly as 'voice_file',
      // we might need to fetch the URL first, but we'll pass it as string for now if it supports it.
      // Most likely, if it's a URL, Arkesel might not accept it in `voice_file`. 
      // If the dashboard only uses TTS for now, voiceFileData is primarily used.
      formData.append('voice_file', voiceFileUrl);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        // Let the browser/Node fetch API set the correct Content-Type for FormData (multipart/form-data with boundary)
      },
      body: formData
    });

    const textResponse = await response.text();
    let data;
    try {
        data = JSON.parse(textResponse);
    } catch (e) {
        console.error('Arkesel raw HTML error:', response.status, textResponse);
        throw new Error(`Arkesel API returned a non-JSON error (Status: ${response.status}). Details logged to console.`);
    }

    if (!response.ok) {
      console.error('Arkesel Voice API Error:', data);
      throw new Error(data.message || 'Failed to send voice broadcast.');
    }

    return data;
  } catch (error) {
    console.error('Error sending Arkesel voice broadcast:', error);
    throw error;
  }
}
