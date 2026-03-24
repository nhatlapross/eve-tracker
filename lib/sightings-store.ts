import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'sightings.json');

export interface Sighting {
  id: string;
  systemId: number;
  systemName: string;
  itemId: number;
  itemName: string;
  quantity: number;
  reportedBy: string;
  notes: string;
  reportedAt: string;
}

function read(): Sighting[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function write(data: Sighting[]) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export function getSightings(): Sighting[] {
  return read().sort(
    (a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime(),
  );
}

export function addSighting(s: Omit<Sighting, 'id' | 'reportedAt'>): Sighting {
  const sightings = read();
  const entry: Sighting = {
    ...s,
    id: crypto.randomUUID(),
    reportedAt: new Date().toISOString(),
  };
  sightings.push(entry);
  write(sightings);
  return entry;
}

export function deleteSighting(id: string): boolean {
  const all = read();
  const next = all.filter((s) => s.id !== id);
  if (next.length === all.length) return false;
  write(next);
  return true;
}

export function getSightingsBySystem(): Record<number, Sighting[]> {
  const all = getSightings();
  const map: Record<number, Sighting[]> = {};
  for (const s of all) {
    if (!map[s.systemId]) map[s.systemId] = [];
    map[s.systemId].push(s);
  }
  return map;
}
