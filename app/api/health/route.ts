import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ ok: true, service: 'sonara-backend', timestamp: new Date().toISOString() });
}
