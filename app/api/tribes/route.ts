import { NextResponse } from 'next/server';
import { getTribes } from '@/lib/eve-api';

export const revalidate = 3600;

export async function GET() {
  const tribes = await getTribes();
  return NextResponse.json(tribes);
}
