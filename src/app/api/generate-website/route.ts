import { NextResponse } from 'next/server';
import { generateWebsite, type GenerateWebsiteInput } from '@/ai/flows/generate-website-from-text';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.description || typeof body.description !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid description' },
        { status: 400 }
      );
    }

    const input: GenerateWebsiteInput = {
      description: body.description
    };

    const result = await generateWebsite(input);
    
    if (!result || !Array.isArray(result)) {
      throw new Error('Invalid response from AI service');
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Generate website error details:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}
