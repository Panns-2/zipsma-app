import { NextResponse } from 'next/server';
import { landingChatFlow } from '@/ai/flows/landing-chat-flow';

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const response = await landingChatFlow({ message, history });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Landing Chat API Error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request.', details: error.message },
      { status: 500 }
    );
  }
}
