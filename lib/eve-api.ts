const BASE_URL = 'https://world-api-stillness.live.tech.evefrontier.com/v2';

export interface SolarSystem {
  id: number;
  name: string;
  constellationId: number;
  regionId?: number;
  location: { x: number; y: number; z: number };
  gateLinks?: number[];
}

export interface ItemType {
  id: number;
  name: string;
  description: string;
  mass: number;
  volume: number;
  groupName: string;
  categoryName: string;
  iconUrl?: string;
}

export interface Tribe {
  id: number;
  name: string;
  nameShort: string;
  taxRate: number;
}

async function fetchPaginated<T>(endpoint: string): Promise<T[]> {
  const results: T[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await fetch(`${BASE_URL}${endpoint}?limit=${limit}&offset=${offset}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) break;
    const json = await res.json();
    const data = json.data || json;
    if (!Array.isArray(data) || data.length === 0) break;
    results.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }
  return results;
}

export async function getSolarSystems(): Promise<SolarSystem[]> {
  return fetchPaginated<SolarSystem>('/solarsystems');
}

export async function getSolarSystem(id: number): Promise<SolarSystem | null> {
  const res = await fetch(`${BASE_URL}/solarsystems/${id}`, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || json;
}

export async function getItemTypes(): Promise<ItemType[]> {
  return fetchPaginated<ItemType>('/types');
}

export async function getTribes(): Promise<Tribe[]> {
  return fetchPaginated<Tribe>('/tribes');
}
