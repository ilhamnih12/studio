import { NextResponse } from 'next/server';
import { generateWebsite } from '@/ai/flows/generate-website-from-text';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await generateWebsite(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Generate website error details:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
