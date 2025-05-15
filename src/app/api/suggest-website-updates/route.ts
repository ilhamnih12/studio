import { NextResponse } from 'next/server';
import { suggestWebsiteUpdates } from '@/ai/flows/suggest-website-updates';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await suggestWebsiteUpdates(body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}