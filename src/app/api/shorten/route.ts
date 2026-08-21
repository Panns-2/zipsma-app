import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const response = await fetch('https://cleanuri.com/api/v1/shorten', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `url=${encodeURIComponent(url)}`
        });
        
        if (response.ok) {
            const data = await response.json();
            return NextResponse.json({ shortUrl: data.result_url });
        } else {
            return NextResponse.json({ error: 'Failed to shorten URL' }, { status: response.status });
        }
    } catch (error) {
        console.error('Error shortening URL:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
