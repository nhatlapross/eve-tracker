import { NextResponse } from 'next/server';
import { getSightings, Sighting } from '@/lib/sightings-store';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { SUI_CONFIG } from '@/lib/sui-config';

export const revalidate = 60;

type SightingWithChain = Sighting & { onChain?: boolean };

type Reporter = {
  address: string;
  count: number;
  onChainCount: number;
  lastSighting: string;
  topItems: string[];
  topSystems: string[];
};

export async function GET() {
  // 1. Fetch local sightings
  const localSightings: SightingWithChain[] = getSightings().map((s) => ({
    ...s,
    onChain: (s as any).onChain ?? false,
  }));

  let merged: SightingWithChain[] = [...localSightings];

  // 2. Try fetching on-chain sightings
  try {
    const client = new SuiJsonRpcClient({ url: SUI_CONFIG.rpcUrl, network: 'testnet' });
    const events = await client.queryEvents({
      query: {
        MoveEventType: `${SUI_CONFIG.packageId}::sightings::SightingReported`,
      },
      limit: 500,
      order: 'descending',
    });

    // 3. Map on-chain events to sighting objects
    const onChainSightings: SightingWithChain[] = events.data.map((ev: any) => {
      const f = ev.parsedJson as {
        sighting_id: string;
        system_id: string;
        system_name: string;
        item_id: string;
        item_name: string;
        quantity: string;
        reported_by: string;
        reported_at: string;
      };
      return {
        id: f.sighting_id,
        systemId: Number(f.system_id),
        systemName: f.system_name,
        itemId: Number(f.item_id),
        itemName: f.item_name,
        quantity: Number(f.quantity),
        reportedBy: f.reported_by,
        notes: '',
        reportedAt: new Date(Number(f.reported_at)).toISOString(),
        onChain: true,
      };
    });

    // 4. Merge: combine local + on-chain, deduplicate by id
    const seen = new Set<string>(localSightings.map((s) => s.id));
    for (const s of onChainSightings) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        merged.push(s);
      }
    }
  } catch {
    // Fallback to local only — merged already contains localSightings
  }

  // 5. Group by reportedBy
  const reporterMap = new Map<string, Reporter>();

  for (const s of merged) {
    const addr = s.reportedBy || 'unknown';
    const existing = reporterMap.get(addr);

    if (!existing) {
      reporterMap.set(addr, {
        address: addr,
        count: 1,
        onChainCount: s.onChain ? 1 : 0,
        lastSighting: s.reportedAt,
        topItems: s.itemName ? [s.itemName] : [],
        topSystems: s.systemName ? [s.systemName] : [],
      });
    } else {
      existing.count += 1;
      if (s.onChain) existing.onChainCount += 1;

      // Track most recent sighting date
      if (new Date(s.reportedAt) > new Date(existing.lastSighting)) {
        existing.lastSighting = s.reportedAt;
      }

      // Accumulate unique item names (up to 3)
      if (s.itemName && !existing.topItems.includes(s.itemName)) {
        if (existing.topItems.length < 3) existing.topItems.push(s.itemName);
      }

      // Accumulate unique system names (up to 3)
      if (s.systemName && !existing.topSystems.includes(s.systemName)) {
        if (existing.topSystems.length < 3) existing.topSystems.push(s.systemName);
      }
    }
  }

  // 6. Sort by count descending, return top 50
  const reporters = Array.from(reporterMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  return NextResponse.json(reporters);
}
