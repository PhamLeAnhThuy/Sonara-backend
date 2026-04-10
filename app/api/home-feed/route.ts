import { NextRequest, NextResponse } from 'next/server';
import { getHomeFeed } from '@/lib/music';

export async function GET(request: NextRequest) {
  const feed = await getHomeFeed(request);
  return NextResponse.json(feed);
}
