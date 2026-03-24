import { type NextRequest, NextResponse } from 'next/server';
import { getSolarSystems } from '@/lib/eve-api';
import type { SolarSystem } from '@/lib/eve-api';

export const revalidate = 3600;

/* ── Module-level cache ── */
let cachedSystems: SolarSystem[] | null = null;
let cachedAdjacency: Map<number, number[]> | null = null;

function dist(a: SolarSystem, b: SolarSystem): number {
  const dx = a.location.x - b.location.x;
  const dy = a.location.y - b.location.y;
  const dz = a.location.z - b.location.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

async function getAdjacency(): Promise<{ systems: SolarSystem[]; adjacency: Map<number, number[]> }> {
  if (cachedSystems && cachedAdjacency) {
    return { systems: cachedSystems, adjacency: cachedAdjacency };
  }

  const systems = await getSolarSystems();
  const adjacency = new Map<number, number[]>();
  for (const s of systems) adjacency.set(s.id, []);

  // 1. Use gateLinks if available
  for (const s of systems) {
    if (s.gateLinks) {
      for (const t of s.gateLinks) {
        adjacency.get(s.id)?.push(t);
        if (!adjacency.has(t)) adjacency.set(t, []);
        adjacency.get(t)?.push(s.id);
      }
    }
  }

  // 2. If no gateLinks, build proximity graph:
  //    Connect each system to its nearest neighbors within same constellation,
  //    plus cross-constellation bridges via closest pairs.
  const hasAnyLinks = systems.some(s => s.gateLinks && s.gateLinks.length > 0);
  if (!hasAnyLinks) {
    // Group by constellation
    const constellations = new Map<number, SolarSystem[]>();
    for (const s of systems) {
      if (!constellations.has(s.constellationId)) constellations.set(s.constellationId, []);
      constellations.get(s.constellationId)!.push(s);
    }

    const addEdge = (a: number, b: number) => {
      if (a === b) return;
      const aN = adjacency.get(a)!;
      const bN = adjacency.get(b)!;
      if (!aN.includes(b)) { aN.push(b); bN.push(a); }
    };

    // Within each constellation: connect each system to its K nearest neighbors
    const K = 3;
    for (const group of constellations.values()) {
      for (const s of group) {
        const sorted = group
          .filter(o => o.id !== s.id)
          .map(o => ({ id: o.id, d: dist(s, o) }))
          .sort((a, b) => a.d - b.d)
          .slice(0, K);
        for (const n of sorted) addEdge(s.id, n.id);
      }
    }

    // Cross-constellation bridges: for each pair of constellations, connect closest pair
    const constIds = Array.from(constellations.keys());
    for (let i = 0; i < constIds.length; i++) {
      const groupA = constellations.get(constIds[i])!;
      // Find the closest constellation (up to 3 bridges)
      const crossDists: { j: number; d: number; aId: number; bId: number }[] = [];
      for (let j = i + 1; j < constIds.length; j++) {
        const groupB = constellations.get(constIds[j])!;
        let bestD = Infinity, bestA = 0, bestB = 0;
        // Sample: compare first 20 from each to keep O(n) reasonable
        const sampleA = groupA.slice(0, 20);
        const sampleB = groupB.slice(0, 20);
        for (const a of sampleA) {
          for (const b of sampleB) {
            const d = dist(a, b);
            if (d < bestD) { bestD = d; bestA = a.id; bestB = b.id; }
          }
        }
        crossDists.push({ j, d: bestD, aId: bestA, bId: bestB });
      }
      // Connect to 3 nearest constellations
      crossDists.sort((a, b) => a.d - b.d);
      for (const c of crossDists.slice(0, 3)) {
        addEdge(c.aId, c.bId);
      }
    }
  }

  cachedSystems = systems;
  cachedAdjacency = adjacency;
  return { systems, adjacency };
}

export async function GET(req: NextRequest) {
  const fromParam = req.nextUrl.searchParams.get('from');
  const toParam = req.nextUrl.searchParams.get('to');

  if (!fromParam || !toParam) {
    return NextResponse.json({ error: 'Missing from or to parameter' }, { status: 400 });
  }

  const fromId = parseInt(fromParam, 10);
  const toId = parseInt(toParam, 10);

  if (isNaN(fromId) || isNaN(toId)) {
    return NextResponse.json({ error: 'Invalid system ID' }, { status: 400 });
  }

  if (fromId === toId) {
    const { systems } = await getAdjacency();
    const sys = systems.find(s => s.id === fromId);
    if (!sys) return NextResponse.json({ error: 'System not found' }, { status: 404 });
    return NextResponse.json({ path: [{ id: sys.id, name: sys.name }], hops: 0 });
  }

  const { systems, adjacency } = await getAdjacency();

  const nameMap = new Map<number, string>();
  for (const s of systems) nameMap.set(s.id, s.name);

  if (!adjacency.has(fromId) || !adjacency.has(toId)) {
    return NextResponse.json({ error: 'System not found' }, { status: 404 });
  }

  /* ── BFS ── */
  const visited = new Set<number>();
  const parent = new Map<number, number>();
  const queue: number[] = [fromId];
  visited.add(fromId);
  let found = false;

  outer: while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      parent.set(neighbor, current);
      if (neighbor === toId) { found = true; break outer; }
      queue.push(neighbor);
    }
  }

  if (!found) {
    return NextResponse.json({ error: 'No route found between these systems' }, { status: 404 });
  }

  /* Reconstruct path */
  const pathIds: number[] = [];
  let cur = toId;
  while (cur !== fromId) {
    pathIds.unshift(cur);
    cur = parent.get(cur)!;
  }
  pathIds.unshift(fromId);

  const path = pathIds.map(id => ({ id, name: nameMap.get(id) ?? String(id) }));
  return NextResponse.json({ path, hops: path.length - 1 });
}
