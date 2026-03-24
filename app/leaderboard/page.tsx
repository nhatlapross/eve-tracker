import { getSightings, Sighting } from '@/lib/sightings-store';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { SUI_CONFIG } from '@/lib/sui-config';
import { EveNav } from '@/components/eve-nav';
import { Trophy, Clock } from 'lucide-react';

type SightingWithChain = Sighting & { onChain?: boolean };

type Reporter = {
  address: string;
  count: number;
  onChainCount: number;
  lastSighting: string;
  topItems: string[];
  topSystems: string[];
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function shortAddr(addr: string): string {
  return addr.length > 12 ? addr.slice(0, 6) + '\u2026' + addr.slice(-4) : addr;
}

async function getReporters(): Promise<Reporter[]> {
  const localSightings: SightingWithChain[] = getSightings().map((s) => ({
    ...s,
    onChain: (s as any).onChain ?? false,
  }));

  let merged: SightingWithChain[] = [...localSightings];

  try {
    const client = new SuiJsonRpcClient({ url: SUI_CONFIG.rpcUrl, network: 'testnet' });
    const events = await client.queryEvents({
      query: {
        MoveEventType: `${SUI_CONFIG.packageId}::sightings::SightingReported`,
      },
      limit: 500,
      order: 'descending',
    });

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

    const seen = new Set<string>(localSightings.map((s) => s.id));
    for (const s of onChainSightings) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        merged.push(s);
      }
    }
  } catch {
    // Fallback to local only
  }

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

      if (new Date(s.reportedAt) > new Date(existing.lastSighting)) {
        existing.lastSighting = s.reportedAt;
      }

      if (s.itemName && !existing.topItems.includes(s.itemName)) {
        if (existing.topItems.length < 3) existing.topItems.push(s.itemName);
      }

      if (s.systemName && !existing.topSystems.includes(s.systemName)) {
        if (existing.topSystems.length < 3) existing.topSystems.push(s.systemName);
      }
    }
  }

  return Array.from(reporterMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);
}

const rankColors: Record<number, string> = {
  1: '#ffd700',
  2: '#c0c0c0',
  3: '#cd7f32',
};

export default async function LeaderboardPage() {
  const reporters = await getReporters();
  const top20 = reporters.slice(0, 20);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--eve-bg)' }}>
      <EveNav />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 2rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
            <Trophy size={18} style={{ color: 'var(--eve-accent)' }} />
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 900,
                color: 'var(--eve-text)',
                lineHeight: 1,
                fontFamily: "'Exo 2', sans-serif",
                letterSpacing: '0.1em',
              }}
            >
              CAPSULEER LEADERBOARD
            </h1>
          </div>
          <p
            style={{
              color: 'var(--eve-text-muted)',
              fontFamily: "'Exo 2', sans-serif",
              fontSize: '13px',
              letterSpacing: '0.05em',
            }}
          >
            Top resource scouts ranked by on-chain contributions
          </p>
          <div className="eve-dash" style={{ marginTop: '1rem' }}>
            <span /><span /><span /><span />
          </div>
        </div>

        {/* Empty state */}
        {top20.length === 0 ? (
          <div className="eve-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <p style={{ color: 'var(--eve-text-dim)', fontSize: '13px', fontFamily: "'Exo 2', sans-serif" }}>
              No sightings reported yet.
            </p>
          </div>
        ) : (
          <div
            style={{
              border: '1px solid var(--eve-border)',
              overflow: 'hidden',
            }}
          >
            {top20.map((reporter, idx) => {
              const rank = idx + 1;
              const rankColor = rankColors[rank] ?? 'var(--eve-text-dim)';

              return (
                <div
                  key={reporter.address}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem',
                    padding: '0.875rem 1.5rem',
                    borderBottom: '1px solid var(--eve-border)',
                    background: 'var(--eve-panel)',
                  }}
                >
                  {/* Rank */}
                  <div
                    style={{
                      width: '48px',
                      flexShrink: 0,
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: rankColor,
                      textAlign: 'center',
                    }}
                  >
                    #{rank}
                  </div>

                  {/* Address */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontFamily: "'Share Tech Mono', monospace",
                        fontSize: '13px',
                        color: 'var(--eve-text)',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {shortAddr(reporter.address)}
                    </span>
                  </div>

                  {/* Count badge */}
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div
                      style={{
                        fontFamily: "'Share Tech Mono', monospace",
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: 'var(--eve-text)',
                        lineHeight: 1,
                      }}
                    >
                      {reporter.count}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Exo 2', sans-serif",
                        fontSize: '10px',
                        color: 'var(--eve-text-dim)',
                        letterSpacing: '0.08em',
                        marginTop: '2px',
                      }}
                    >
                      reports
                    </div>
                    {reporter.onChainCount > 0 && (
                      <div
                        style={{
                          marginTop: '4px',
                          fontSize: '9px',
                          fontFamily: "'Exo 2', sans-serif",
                          letterSpacing: '0.06em',
                          color: '#22c55e',
                          border: '1px solid rgba(34,197,94,0.3)',
                          padding: '1px 5px',
                          display: 'inline-block',
                        }}
                      >
                        &#x2B21; ON-CHAIN
                      </div>
                    )}
                  </div>

                  {/* Top items */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '4px',
                      flexShrink: 0,
                      maxWidth: '200px',
                    }}
                  >
                    {reporter.topItems.map((item) => (
                      <span
                        key={item}
                        style={{
                          background: 'rgba(255,71,0,0.08)',
                          border: '1px solid rgba(255,71,0,0.2)',
                          color: 'var(--eve-text-muted)',
                          fontSize: '10px',
                          padding: '1px 6px',
                          fontFamily: "'Exo 2', sans-serif",
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  {/* Last seen */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: 'var(--eve-text-dim)',
                      fontSize: '11px',
                      fontFamily: "'Exo 2', sans-serif",
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Clock size={11} />
                    {timeAgo(reporter.lastSighting)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: '2rem',
            textAlign: 'center',
            color: 'var(--eve-text-dim)',
            fontSize: '11px',
            fontFamily: "'Exo 2', sans-serif",
            letterSpacing: '0.1em',
          }}
        >
          EVE FRONTIER × SUI HACKATHON 2026 — TOOLKIT FOR CIVILIZATION
        </div>
      </div>
    </div>
  );
}
