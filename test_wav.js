const fs = require('fs');

async function test() {
    const response = await fetch('https://abena.mobobi.com/playground/api/v1/tts/synthesize/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Hello', voice: 'akua_eng' })
    });
    const data = await response.json();
    const buffer = Buffer.from(data.audio_base64, 'base64');
    
    const chunkId = buffer.toString('utf8', 0, 4);
    const chunkSize = buffer.readUInt32LE(4);
    const format = buffer.toString('utf8', 8, 12);
    const subchunk1Id = buffer.toString('utf8', 12, 16);
    const subchunk1Size = buffer.readUInt32LE(16);
    const audioFormat = buffer.readUInt16LE(20);
    const numChannels = buffer.readUInt16LE(22);
    const sampleRate = buffer.readUInt32LE(24);
    const byteRate = buffer.readUInt32LE(28);
    const blockAlign = buffer.readUInt16LE(32);
    const bitsPerSample = buffer.readUInt16LE(34);
    
    console.log({ chunkId, chunkSize, format, subchunk1Id, subchunk1Size, audioFormat, numChannels, sampleRate, byteRate, blockAlign, bitsPerSample });
}

test();
