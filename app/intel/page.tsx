import { getSightings } from '@/lib/sightings-store';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { SUI_CONFIG } from '@/lib/sui-config';
import { EveNav } from '@/components/eve-nav';
import Link from 'next/link';
import { Radio, CheckCircle, AlertCircle } from 'lucide-react';

export const revalidate = 30;

interface FeedItem {
  id: string;
  type: 'report' | 'verify';
  systemId: number;
  systemName: string;
  itemName: string;
  quantity?: number;
  actor: string;
  ts: string;
  onChain: boolean;
  txDigest?: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function shortAddr(addr: string) {
  return addr.length > 12 ? addr.slice(0, 6) + '…' + addr.slice(-4) : addr;
}

async function getFeedItems(): Promise<FeedItem[]> {
  const items: FeedItem[] = [];

  // Local sightings
  const local = getSightings();
  for (const s of local) {
    items.push({
      id: `local-${s.id}`,
      type: 'report',
      systemId: s.systemId,
      systemName: s.systemName,
      itemName: s.itemName,
      quantity: s.quantity,
      actor: s.reportedBy || 'unknown',
      ts: s.reportedAt,
      onChain: (s as any).onChain ?? false,
    });
  }

  try {
    const client = new SuiJsonRpcClient({ url: SUI_CONFIG.rpcUrl, network: 'testnet' });

    const [reportEvents, verifyEvents] = await Promise.all([
      client.queryEvents({
        query: { MoveEventType: `${SUI_CONFIG.packageId}::sightings::SightingReported` },
        limit: 100,
        order: 'descending',
      }),
      client.queryEvents({
        query: { MoveEventType: `${SUI_CONFIG.packageId}::sightings::SightingVerified` },
        limit: 100,
        order: 'descending',
      }),
    ]);

    const seenIds = new Set(local.map((s) => s.id));

    for (const ev of reportEvents.data) {
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
      if (seenIds.has(f.sighting_id)) continue; // already in local
      items.push({
        id: `chain-report-${f.sighting_id}`,
        type: 'report',
        systemId: Number(f.system_id),
        systemName: f.system_name,
        itemName: f.item_name,
        quantity: Number(f.quantity),
        actor: f.reported_by,
        ts: new Date(Number(f.reported_at)).toISOString(),
        onChain: true,
        txDigest: (ev as any).id?.txDigest,
      });
    }

    for (const ev of verifyEvents.data) {
      const f = ev.parsedJson as {
        system_id: string;
        system_name: string;
        item_id: string;
        item_name: string;
        verifier: string;
        verified_at: string;
      };
      items.push({
        id: `verify-${(ev as any).id?.txDigest ?? Math.random()}`,
        type: 'verify',
        systemId: Number(f.system_id),
        systemName: f.system_name,
        itemName: f.item_name,
        actor: f.verifier,
        ts: new Date(Number(f.verified_at)).toISOString(),
        onChain: true,
        txDigest: (ev as any).id?.txDigest,
      });
    }
  } catch {
    // Chain unavailable — show local only
  }

  return items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 100);
}

export default async function IntelPage() {
  const items = await getFeedItems();
  const reports = items.filter((i) => i.type === 'report');
  const verifications = items.filter((i) => i.type === 'verify');
  const onChainCount = items.filter((i) => i.onChain).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--eve-bg)' }}>
      <EveNav />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 2rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
            <Radio size={18} style={{ color: 'var(--eve-accent)' }} />
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
              INTEL FEED
            </h1>
            {/* Live dot */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.3)',
                color: '#22c55e',
                fontSize: '9px',
                fontFamily: "'Exo 2', sans-serif",
                letterSpacing: '0.12em',
                padding: '3px 8px',
                marginLeft: '4px',
              }}
            >
              <span
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 4px #22c55e',
                }}
              />
              LIVE
            </span>
          </div>
          <p
            style={{
              color: 'var(--eve-text-muted)',
              fontFamily: "'Exo 2', sans-serif",
              fontSize: '13px',
              letterSpacing: '0.05em',
            }}
          >
            Aggregated sighting reports and on-chain verifications from all capsuleers
          </p>
          <div className="eve-dash" style={{ marginTop: '1rem' }}>
            <span /><span /><span /><span />
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          {[
            { label: 'TOTAL EVENTS', value: items.length, color: 'var(--eve-accent)' },
            { label: 'REPORTS', value: reports.length, color: '#60a5fa' },
            { label: 'VERIFICATIONS', value: verifications.length, color: '#22c55e' },
          ].map(({ label, value, color }) => (
            <div key={label} className="eve-panel" style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color,
                  lineHeight: 1,
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: '10px',
                  color: 'var(--eve-text-dim)',
                  letterSpacing: '0.12em',
                  marginTop: '6px',
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Feed */}
        {items.length === 0 ? (
          <div className="eve-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <p style={{ color: 'var(--eve-text-dim)', fontSize: '13px', fontFamily: "'Exo 2', sans-serif" }}>
              No intel available. Be the first to report a sighting.
            </p>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--eve-border)', overflow: 'hidden' }}>
            {items.map((item, idx) => {
              const isReport = item.type === 'report';
              const typeColor = isReport ? '#60a5fa' : '#22c55e';
              const TypeIcon = isReport ? AlertCircle : CheckCircle;

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem 1.25rem',
                    borderBottom: idx < items.length - 1 ? '1px solid var(--eve-border)' : 'none',
                    background: 'var(--eve-panel)',
                  }}
                >
                  {/* Type icon */}
                  <div style={{ flexShrink: 0 }}>
                    <TypeIcon size={14} style={{ color: typeColor }} />
                  </div>

                  {/* Type badge */}
                  <div style={{ flexShrink: 0, width: '80px' }}>
                    <span
                      style={{
                        fontFamily: "'Exo 2', sans-serif",
                        fontSize: '9px',
                        letterSpacing: '0.1em',
                        color: typeColor,
                        border: `1px solid ${typeColor}30`,
                        padding: '2px 6px',
                        background: `${typeColor}0a`,
                      }}
                    >
                      {isReport ? 'REPORT' : 'VERIFY'}
                    </span>
                  </div>

                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "'Exo 2', sans-serif",
                        fontSize: '12px',
                        color: 'var(--eve-text)',
                        letterSpacing: '0.03em',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ color: 'var(--eve-text-muted)', fontSize: '11px' }}>
                        {shortAddr(item.actor)}
                      </span>
                      <span style={{ color: 'var(--eve-text-dim)' }}>
                        {isReport ? 'reported' : 'verified'}
                      </span>
                      <span
                        style={{
                          background: 'rgba(255,71,0,0.1)',
                          border: '1px solid rgba(255,71,0,0.2)',
                          color: 'var(--eve-accent)',
                          padding: '0px 5px',
                          fontSize: '11px',
                        }}
                      >
                        {item.itemName}
                      </span>
                      {item.quantity != null && item.quantity > 0 && (
                        <span style={{ color: 'var(--eve-text-dim)', fontSize: '11px' }}>
                          ×{item.quantity}
                        </span>
                      )}
                      <span style={{ color: 'var(--eve-text-dim)' }}>in</span>
                      <Link
                        href={`/map?system=${item.systemId}`}
                        style={{
                          fontFamily: "'Share Tech Mono', monospace",
                          fontSize: '11px',
                          color: '#60a5fa',
                          textDecoration: 'none',
                          borderBottom: '1px solid rgba(96,165,250,0.3)',
                        }}
                      >
                        {item.systemName}
                      </Link>
                    </div>
                  </div>

                  {/* On-chain badge */}
                  {item.onChain && (
                    <div style={{ flexShrink: 0 }}>
                      {item.txDigest ? (
                        <a
                          href={`https://suiexplorer.com/txblock/${item.txDigest}?network=testnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '9px',
                            fontFamily: "'Exo 2', sans-serif",
                            letterSpacing: '0.06em',
                            color: '#22c55e',
                            border: '1px solid rgba(34,197,94,0.3)',
                            padding: '1px 5px',
                            textDecoration: 'none',
                          }}
                        >
                          ⬡ ON-CHAIN
                        </a>
                      ) : (
                        <span
                          style={{
                            fontSize: '9px',
                            fontFamily: "'Exo 2', sans-serif",
                            letterSpacing: '0.06em',
                            color: '#22c55e',
                            border: '1px solid rgba(34,197,94,0.3)',
                            padding: '1px 5px',
                          }}
                        >
                          ⬡ ON-CHAIN
                        </span>
                      )}
                    </div>
                  )}

                  {/* Time */}
                  <div
                    style={{
                      flexShrink: 0,
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: '10px',
                      color: 'var(--eve-text-dim)',
                      whiteSpace: 'nowrap',
                      minWidth: '70px',
                      textAlign: 'right',
                    }}
                  >
                    {timeAgo(item.ts)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        <div
          style={{
            marginTop: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: 'var(--eve-text-dim)',
            fontSize: '10px',
            fontFamily: "'Exo 2', sans-serif",
            letterSpacing: '0.08em',
          }}
        >
          <span>SHOWING LAST 100 EVENTS · LOCAL + SUI TESTNET</span>
          <span>{onChainCount} ON-CHAIN EVENTS</span>
        </div>
      </div>
    </div>
  );
}
