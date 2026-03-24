import { NextResponse } from 'next/server';
import { getItemTypes } from '@/lib/eve-api';

export const revalidate = 3600;

export async function GET() {
  const types = await getItemTypes();
  return NextResponse.json(types);
}
