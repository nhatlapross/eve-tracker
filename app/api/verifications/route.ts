import { NextResponse } from 'next/server';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { SUI_CONFIG } from '@/lib/sui-config';

export const revalidate = 60;

export async function GET() {
  const counts: Record<string, number> = {};

  try {
    const client = new SuiJsonRpcClient({ url: SUI_CONFIG.rpcUrl, network: 'testnet' });
    const events = await client.queryEvents({
      query: {
        MoveEventType: `${SUI_CONFIG.packageId}::sightings::SightingVerified`,
      },
      limit: 500,
      order: 'descending',
    });

    for (const ev of events.data) {
      const f = ev.parsedJson as { system_id: string; item_id: string };
      const key = `${f.system_id}-${f.item_id}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  } catch {
    // Chain unavailable — return empty
  }

  return NextResponse.json(counts);
}
