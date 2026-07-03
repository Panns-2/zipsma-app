import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'TTS API Key not configured in .env.local' }, { status: 500 });
    }

    // Strip Markdown symbols so the TTS doesn't read them out loud
    const cleanText = text
      .replace(/\*\*/g, '')      // Remove bold asterisks
      .replace(/\*/g, '')        // Remove italic/bullet asterisks
      .replace(/__/g, '')        // Remove bold underscores
      .replace(/#/g, '')         // Remove header hashes
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Convert links [text](url) to just text
      .replace(/`/g, '');        // Remove code backticks

    // Call Google Cloud TTS REST API directly
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: cleanText },
        voice: { 
          languageCode: 'en-US',
          name: 'en-US-Journey-F' // Using the premium natural "Journey" voice
        },
        audioConfig: { 
          audioEncoding: 'MP3' 
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google TTS API Error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    // data.audioContent contains the base64 encoded MP3 audio
    return NextResponse.json({ audioContent: data.audioContent });

  } catch (error: any) {
    console.error('TTS API Error:', error);
    return NextResponse.json({ error: 'Failed to generate audio', details: error.message }, { status: 500 });
  }
}
