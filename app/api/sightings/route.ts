import { NextRequest, NextResponse } from 'next/server';
import { getSightings, addSighting, deleteSighting } from '@/lib/sightings-store';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { SUI_CONFIG } from '@/lib/sui-config';

/* ── Fetch sightings from Sui chain via events ── */
async function getSuiSightings(systemId?: number) {
  try {
    const client = new SuiJsonRpcClient({ url: SUI_CONFIG.rpcUrl, network: 'testnet' });
    const events = await client.queryEvents({
      query: {
        MoveEventType: `${SUI_CONFIG.packageId}::sightings::SightingReported`,
      },
      limit: 200,
      order: 'descending',
    });

    const sightings = events.data.map((ev: any) => {
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

    if (systemId !== undefined) {
      return sightings.filter((s: any) => s.systemId === systemId);
    }
    return sightings;
  } catch {
    return null; // fallback to local on error
  }
}

export async function GET(req: NextRequest) {
  const systemIdParam = req.nextUrl.searchParams.get('systemId');
  const systemId = systemIdParam ? parseInt(systemIdParam) : undefined;

  // Try chain first, fallback to local JSON
  const chainSightings = await getSuiSightings(systemId);
  if (chainSightings !== null && chainSightings.length > 0) {
    return NextResponse.json(chainSightings);
  }

  // Fallback: local JSON store
  let sightings = getSightings();
  if (systemId !== undefined) {
    sightings = sightings.filter((s) => s.systemId === systemId);
  }
  return NextResponse.json(sightings);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const ok = deleteSighting(id);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'not found' }, { status: 404 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { systemId, systemName, itemId, itemName, quantity, reportedBy, notes } = body;

  if (!systemId || !itemId || !reportedBy) {
    return NextResponse.json({ error: 'systemId, itemId, reportedBy are required' }, { status: 400 });
  }

  // Always persist locally as backup
  const sighting = addSighting({
    systemId: Number(systemId),
    systemName: String(systemName || ''),
    itemId: Number(itemId),
    itemName: String(itemName || ''),
    quantity: Math.max(1, Number(quantity) || 1),
    reportedBy: String(reportedBy).slice(0, 50),
    notes: String(notes || '').slice(0, 200),
  });

  // Return the sighting + on-chain submission instructions for the frontend
  return NextResponse.json({
    ...sighting,
    sui: {
      packageId: SUI_CONFIG.packageId,
      registryId: SUI_CONFIG.registryId,
      // Frontend uses these to build a PTB with user's wallet
      module: 'sightings',
      function: 'report_sighting',
    },
  }, { status: 201 });
}
