import { type NextRequest, NextResponse } from 'next/server';
import { getSolarSystems } from '@/lib/eve-api';

export const revalidate = 3600;

export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '500');
  const q = req.nextUrl.searchParams.get('q')?.trim().toLowerCase();

  // For search we need full dataset; for limit-only queries fetch exactly what we need
  const fetchCount = q ? Infinity : limit;
  const systems = await getSolarSystems(fetchCount);

  if (q) {
    const filtered = systems.filter((s) => s.name.toLowerCase().includes(q));
    return NextResponse.json(filtered.slice(0, 50));
  }
  return NextResponse.json(systems.slice(0, limit));
}
