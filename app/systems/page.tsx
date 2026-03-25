'use client';
import { useState, useEffect, useCallback } from 'react';
import { EveNav } from '@/components/eve-nav';
import Link from 'next/link';
import { Search, MapPin, Eye, ExternalLink } from 'lucide-react';

interface System {
  id: number;
  name: string;
  constellationId: number;
  regionId?: number;
  location: { x: number; y: number; z: number };
}

interface SightingCount {
  [systemId: number]: number;
}

const AU = 1.496e11; // metres per AU

function distance3d(a: System, b: System): number {
  const dx = a.location.x - b.location.x;
  const dy = a.location.y - b.location.y;
  const dz = a.location.z - b.location.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function fmtDist(m: number): string {
  const ly = m / 9.461e15;
  if (ly >= 1) return `${ly.toFixed(2)} LY`;
  const au = m / AU;
  return `${au.toFixed(0)} AU`;
}

function fmtCoord(n: number): string {
  const au = n / AU;
  return (au >= 0 ? '+' : '') + au.toFixed(0) + ' AU';
}

export default function SystemsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<System[]>([]);
  const [selected, setSelected] = useState<System | null>(null);
  const [sightingCounts, setSightingCounts] = useState<SightingCount>({});
  const [nearby, setNearby] = useState<(System & { dist: number })[]>([]);
  const [loading, setLoading] = useState(false);

  // Load sighting counts once
  useEffect(() => {
    fetch('/api/sightings')
      .then((r) => r.json())
      .then((data: { systemId: number }[]) => {
        const counts: SightingCount = {};
        for (const s of data) counts[s.systemId] = (counts[s.systemId] ?? 0) + 1;
        setSightingCounts(counts);
      })
      .catch(() => {});
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/systems?q=${encodeURIComponent(q)}`);
      const data: System[] = await res.json();
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const selectSystem = useCallback(async (sys: System) => {
    setSelected(sys);
    setResults([]);
    setQuery(sys.name);
    setNearby([]);

    // Fetch all systems to compute nearby
    try {
      const res = await fetch('/api/systems?limit=5000');
      const all: System[] = await res.json();
      const dists = all
        .filter((s) => s.id !== sys.id)
        .map((s) => ({ ...s, dist: distance3d(s, sys) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 8);
      setNearby(dists);
    } catch {}
  }, []);

  const clearSelection = () => {
    setSelected(null);
    setQuery('');
    setResults([]);
    setNearby([]);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--eve-bg)' }}>
      <EveNav />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 2rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
            <Search size={18} style={{ color: 'var(--eve-accent)' }} />
            <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--eve-text)', lineHeight: 1, fontFamily: "'Exo 2', sans-serif", letterSpacing: '0.1em' }}>
              SYSTEM EXPLORER
            </h1>
          </div>
          <p style={{ color: 'var(--eve-text-muted)', fontFamily: "'Exo 2', sans-serif", fontSize: '13px', letterSpacing: '0.05em' }}>
            Search all 24,502 solar systems — coordinates, constellation, nearby systems, resource sightings
          </p>
          <div className="eve-dash" style={{ marginTop: '1rem' }}>
            <span /><span /><span /><span />
          </div>
        </div>

        {/* Search box */}
        <div style={{ position: 'relative', marginBottom: selected ? '2rem' : '0' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--eve-text-dim)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a system name…"
              style={{
                width: '100%',
                background: 'var(--eve-panel)',
                border: '1px solid var(--eve-border)',
                color: 'var(--eve-text)',
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: '14px',
                padding: '0.875rem 1rem 0.875rem 2.5rem',
                outline: 'none',
                letterSpacing: '0.05em',
                boxSizing: 'border-box',
              }}
              autoFocus
            />
            {loading && (
              <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--eve-text-dim)', fontSize: '10px', fontFamily: "'Exo 2', sans-serif", letterSpacing: '0.1em' }}>
                SCANNING…
              </span>
            )}
          </div>

          {/* Dropdown results */}
          {results.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--eve-panel)',
                border: '1px solid var(--eve-border)',
                borderTop: 'none',
                zIndex: 50,
                maxHeight: '320px',
                overflowY: 'auto',
              }}
            >
              {results.map((sys) => (
                <button
                  key={sys.id}
                  onClick={() => selectSystem(sys)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--eve-border)',
                    color: 'var(--eve-text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    gap: '1rem',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,71,0,0.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '13px' }}>{sys.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    {sightingCounts[sys.id] > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--eve-accent)', fontSize: '11px', fontFamily: "'Exo 2', sans-serif" }}>
                        <Eye size={10} /> {sightingCounts[sys.id]}
                      </span>
                    )}
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', color: 'var(--eve-text-dim)' }}>
                      CON-{sys.constellationId}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected system detail */}
        {selected && (
          <div>
            {/* System card */}
            <div
              className="eve-panel"
              style={{ padding: '1.75rem', marginBottom: '1.5rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <MapPin size={15} style={{ color: 'var(--eve-accent)' }} />
                    <h2 style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '1.5rem', fontWeight: 700, color: 'var(--eve-text)', letterSpacing: '0.06em' }}>
                      {selected.name}
                    </h2>
                    {sightingCounts[selected.id] > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,71,0,0.1)', border: '1px solid rgba(255,71,0,0.3)', color: 'var(--eve-accent)', fontSize: '10px', fontFamily: "'Exo 2', sans-serif', letterSpacing: '0.1em'", padding: '2px 8px' }}>
                        <Eye size={10} /> {sightingCounts[selected.id]} SIGHTING{sightingCounts[selected.id] > 1 ? 'S' : ''}
                      </span>
                    )}
                  </div>
                  <span style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '11px', color: 'var(--eve-text-dim)', letterSpacing: '0.08em' }}>
                    SYSTEM ID: {selected.id}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link
                    href={`/sightings?system=${selected.id}`}
                    style={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontSize: '11px',
                      letterSpacing: '0.08em',
                      color: 'var(--eve-accent)',
                      border: '1px solid rgba(255,71,0,0.4)',
                      padding: '5px 10px',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Eye size={11} /> VIEW SIGHTINGS
                  </Link>
                  <button
                    onClick={clearSelection}
                    style={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontSize: '11px',
                      letterSpacing: '0.08em',
                      color: 'var(--eve-text-dim)',
                      border: '1px solid var(--eve-border)',
                      padding: '5px 10px',
                      background: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    CLEAR
                  </button>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: 'var(--eve-border)' }}>
                {[
                  { label: 'CONSTELLATION', value: `CON-${selected.constellationId}` },
                  { label: 'REGION', value: selected.regionId ? `REG-${selected.regionId}` : '—' },
                  { label: 'X COORDINATE', value: fmtCoord(selected.location.x) },
                  { label: 'Y COORDINATE', value: fmtCoord(selected.location.y) },
                  { label: 'Z COORDINATE', value: fmtCoord(selected.location.z) },
                  { label: 'RESOURCE SIGHTINGS', value: sightingCounts[selected.id]?.toString() ?? '0' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: 'var(--eve-bg)', padding: '1rem 1.25rem' }}>
                    <div style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '10px', letterSpacing: '0.12em', color: 'var(--eve-text-dim)', marginBottom: '4px' }}>
                      {label}
                    </div>
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '14px', color: 'var(--eve-text)' }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nearby systems */}
            {nearby.length > 0 && (
              <div>
                <h3 style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '11px', letterSpacing: '0.14em', color: 'var(--eve-text-dim)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                  Nearest Systems (by 3D distance)
                </h3>
                <div style={{ border: '1px solid var(--eve-border)', overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px 100px 60px',
                    padding: '0.5rem 1.25rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderBottom: '1px solid var(--eve-border)',
                    fontFamily: "'Exo 2', sans-serif",
                    fontSize: '10px',
                    letterSpacing: '0.12em',
                    color: 'var(--eve-text-dim)',
                    textTransform: 'uppercase',
                  }}>
                    <div>System</div>
                    <div>Constellation</div>
                    <div style={{ textAlign: 'right' }}>Distance</div>
                    <div style={{ textAlign: 'right' }}>Sightings</div>
                  </div>

                  {nearby.map((sys) => (
                    <div
                      key={sys.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 140px 100px 60px',
                        padding: '0.65rem 1.25rem',
                        borderBottom: '1px solid var(--eve-border)',
                        background: 'var(--eve-panel)',
                        alignItems: 'center',
                      }}
                    >
                      <button
                        onClick={() => selectSystem(sys)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '12px', color: '#60a5fa' }}>
                          {sys.name}
                        </span>
                        <ExternalLink size={10} style={{ color: 'var(--eve-text-dim)' }} />
                      </button>
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', color: 'var(--eve-text-dim)' }}>
                        CON-{sys.constellationId}
                      </span>
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '12px', color: 'var(--eve-text)', textAlign: 'right' }}>
                        {fmtDist(sys.dist)}
                      </span>
                      <span style={{ textAlign: 'right', fontFamily: "'Share Tech Mono', monospace", fontSize: '12px', color: sightingCounts[sys.id] > 0 ? 'var(--eve-accent)' : 'var(--eve-text-dim)' }}>
                        {sightingCounts[sys.id] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state hint */}
        {!selected && !loading && results.length === 0 && query.length < 2 && (
          <div style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--eve-text-dim)', fontFamily: "'Exo 2', sans-serif", fontSize: '12px', letterSpacing: '0.06em' }}>
            <Search size={32} style={{ color: 'rgba(255,255,255,0.08)', marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
            Search any of the 24,502 solar systems in the cluster.<br />
            <span style={{ color: 'var(--eve-text-dim)', fontSize: '11px' }}>
              Click a result to see coordinates, nearby systems, and reported sightings.
            </span>
          </div>
        )}

        <div style={{ marginTop: '2.5rem', color: 'var(--eve-text-dim)', fontSize: '10px', fontFamily: "'Exo 2', sans-serif", letterSpacing: '0.08em', textAlign: 'center' }}>
          DATA SOURCE: EVE FRONTIER WORLD API · COORDINATES IN ASTRONOMICAL UNITS
        </div>
      </div>
    </div>
  );
}
