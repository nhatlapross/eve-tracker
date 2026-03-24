import { type NextRequest, NextResponse } from 'next/server';
import { getSolarSystems } from '@/lib/eve-api';

export const revalidate = 3600;

export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '500');
  const systems = await getSolarSystems();
  return NextResponse.json(systems.slice(0, limit));
}
