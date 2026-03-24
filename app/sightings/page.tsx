'use client';
import { useState, useEffect } from 'react';
import { Eye, Plus, Clock, User, X, Link, ShieldCheck } from 'lucide-react';
import { EveNav } from '@/components/eve-nav';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { SUI_CONFIG } from '@/lib/sui-config';
import type { ItemType, SolarSystem } from '@/lib/eve-api';
import type { Sighting } from '@/lib/sightings-store';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--eve-bg)',
  border: '1px solid var(--eve-border)',
  color: 'var(--eve-text)',
  padding: '0.6rem 0.75rem',
  fontSize: '13px',
  outline: 'none',
  fontFamily: "'Share Tech Mono', monospace",
};

export default function SightingsPage() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [systems, setSystems] = useState<SolarSystem[]>([]);
  const [items, setItems] = useState<ItemType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('24h');
  const [submitting, setSubmitting] = useState(false);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [form, setForm] = useState({ systemId: '', itemId: '', quantity: '1', reportedBy: '', notes: '' });
  const [verifications, setVerifications] = useState<Map<string, number>>(new Map()); // "systemId-itemId" → count
  const [verifying, setVerifying] = useState<string | null>(null); // sighting id currently verifying

  useEffect(() => {
    Promise.all([
      fetch('/api/sightings').then((r) => r.json()),
      fetch('/api/systems?limit=500').then((r) => r.json()),
      fetch('/api/types').then((r) => r.json()),
    ]).then(([s, sys, it]) => { setSightings(s); setSystems(sys); setItems(it); });
    // Load verification counts from chain
    fetch('/api/verifications').then(r => r.json()).then((v: Record<string, number>) => {
      setVerifications(new Map(Object.entries(v)));
    }).catch(() => {});
  }, []);

  function handleVerify(s: Sighting) {
    if (!account) return;
    setVerifying(s.id);
    const tx = new Transaction();
    tx.moveCall({
      target: `${SUI_CONFIG.packageId}::sightings::verify_sighting`,
      arguments: [
        tx.object(SUI_CONFIG.registryId),
        tx.object('0x6'),
        tx.pure.u64(s.systemId),
        tx.pure.u64(s.itemId),
        tx.pure.string(account.address.slice(0, 20)),
      ],
    });
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          const key = `${s.systemId}-${s.itemId}`;
          setVerifications(prev => {
            const next = new Map(prev);
            next.set(key, (next.get(key) ?? 0) + 1);
            return next;
          });
          setVerifying(null);
        },
        onError: () => setVerifying(null),
      },
    );
  }

  const filtered = sightings.filter((s) => {
    if (filter === '24h') return Date.now() - new Date(s.reportedAt).getTime() < 86400000;
    if (filter === '7d') return Date.now() - new Date(s.reportedAt).getTime() < 604800000;
    return true;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setTxError(null);
    const sys = systems.find((s) => String(s.id) === form.systemId);
    const item = items.find((i) => String(i.id) === form.itemId);
    const payload = {
      systemId: Number(form.systemId), systemName: sys?.name || '',
      itemId: Number(form.itemId), itemName: item?.name || '',
      quantity: Number(form.quantity), reportedBy: form.reportedBy, notes: form.notes,
    };

    // Save to local store first (as draft)
    const res = await fetch('/api/sightings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { setSubmitting(false); return; }
    const newS = await res.json();

    setForm({ systemId: '', itemId: '', quantity: '1', reportedBy: '', notes: '' });
    setShowForm(false);
    setSubmitting(false);

    if (account) {
      // Wallet connected: require on-chain signature
      try {
        const tx = new Transaction();
        tx.moveCall({
          target: `${SUI_CONFIG.packageId}::sightings::report_sighting`,
          arguments: [
            tx.object(SUI_CONFIG.registryId),
            tx.object('0x6'),
            tx.pure.u64(payload.systemId),
            tx.pure.string(payload.systemName),
            tx.pure.u64(payload.itemId),
            tx.pure.string(payload.itemName),
            tx.pure.u64(payload.quantity),
            tx.pure.string(payload.reportedBy.slice(0, 50)),
            tx.pure.string(payload.notes.slice(0, 200)),
          ],
        });
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
              setTxDigest(result.digest);
              setSightings((prev) => [{ ...newS, onChain: true } as any, ...prev]);
            },
            onError: (err) => {
              // Rollback: delete local draft since user rejected / tx failed
              fetch(`/api/sightings?id=${newS.id}`, { method: 'DELETE' });
              setTxError(
                err.message?.includes('Rejected') || err.message?.includes('reject')
                  ? 'Transaction rejected — sighting was not saved.'
                  : 'Transaction failed — sighting was not saved.',
              );
            },
          },
        );
      } catch {
        fetch(`/api/sightings?id=${newS.id}`, { method: 'DELETE' });
        setTxError('Failed to build transaction.');
      }
    } else {
      // No wallet: show as local-only
      setSightings((prev) => [newS, ...prev]);
    }
  }

  const filterOptions = [
    { value: '24h', label: 'Last 24h' },
    { value: '7d', label: 'Last 7 days' },
    { value: 'all', label: 'All time' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--eve-bg)' }}>
      <EveNav />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 2rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Eye size={16} style={{ color: 'var(--eve-accent)' }} />
              <h1 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: 'var(--eve-text)' }}>
                Resource Sightings
              </h1>
              <span style={{ background: 'rgba(255,71,0,0.1)', border: '1px solid var(--eve-accent)', color: 'var(--eve-accent)', fontFamily: "'Exo 2', sans-serif", fontSize: '10px', letterSpacing: '0.1em', padding: '2px 8px' }}>
                {filtered.length} REPORTS
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(100,220,120,0.08)', border: '1px solid rgba(100,220,120,0.3)', color: '#64dc78', fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', padding: '2px 8px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#64dc78', display: 'inline-block' }} />
                SUI TESTNET
              </span>
            </div>

            <div style={{ display: 'flex', gap: '1px', background: 'var(--eve-border)' }}>
              {filterOptions.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setFilter(o.value)}
                  style={{
                    background: filter === o.value ? 'var(--eve-accent)' : 'var(--eve-panel)',
                    color: filter === o.value ? '#080806' : 'var(--eve-text-muted)',
                    border: 'none',
                    padding: '6px 14px',
                    fontSize: '10px',
                    fontFamily: "'Exo 2', sans-serif",
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    fontWeight: filter === o.value ? 700 : 400,
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="eve-dash"><span /><span /><span /><span /></div>
        </div>

        {/* Tx success banner */}
        {txDigest && txDigest !== 'pending' && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(100,220,120,0.08)', border: '1px solid rgba(100,220,120,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#64dc78', fontFamily: "'Share Tech Mono', monospace", fontSize: '11px' }}>
              ✓ SIGHTING RECORDED ON-CHAIN
            </span>
            <a
              href={`https://suiexplorer.com/txblock/${txDigest}?network=testnet`}
              target="_blank" rel="noopener noreferrer"
              style={{ color: '#64dc78', fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Link size={10} /> VIEW TX
            </a>
          </div>
        )}

        {/* Tx error banner */}
        {txError && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(255,71,0,0.06)', border: '1px solid rgba(255,71,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--eve-accent)', fontFamily: "'Share Tech Mono', monospace", fontSize: '11px' }}>
              ✕ {txError}
            </span>
            <button onClick={() => setTxError(null)} style={{ background: 'none', border: 'none', color: 'var(--eve-text-muted)', cursor: 'pointer', fontSize: '14px' }}>×</button>
          </div>
        )}

        {/* Report button */}
        <div style={{ marginBottom: '1rem' }}>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: showForm ? 'var(--eve-accent)' : 'var(--eve-panel)',
              border: `1px solid ${showForm ? 'var(--eve-accent)' : 'var(--eve-border)'}`,
              color: showForm ? '#080806' : 'var(--eve-accent)',
              padding: '0.6rem 1.25rem',
              fontFamily: "'Exo 2', sans-serif",
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? 'Cancel' : 'Report Sighting'}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div style={{ background: 'var(--eve-panel)', borderLeft: '2px solid var(--eve-accent)', padding: '1.5rem', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '11px', letterSpacing: '0.15em', color: 'var(--eve-text-muted)', marginBottom: '1.25rem' }}>
              SUBMIT RESOURCE REPORT
            </h2>
            {account ? (
              <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: '#64dc78', marginBottom: '1.25rem' }}>
                ◆ WALLET CONNECTED — report will be signed on-chain · {account.address.slice(0, 10)}...
              </p>
            ) : (
              <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: 'var(--eve-text-muted)', marginBottom: '1.25rem' }}>
                ◇ Connect wallet (nav bar) to record this sighting on Sui testnet. Without wallet, saved locally only.
              </p>
            )}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--eve-border)', marginBottom: '1px' }}>
                <div style={{ background: 'var(--eve-bg)', padding: '1rem' }}>
                  <label className="eve-label" style={{ display: 'block', marginBottom: '6px' }}>Solar System</label>
                  <select value={form.systemId} onChange={(e) => setForm((f) => ({ ...f, systemId: e.target.value }))} style={inputStyle}>
                    <option value="" style={{ background: '#080806' }}>Select system...</option>
                    {systems.slice(0, 50).map((s) => (
                      <option key={s.id} value={String(s.id)} style={{ background: '#080806' }}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ background: 'var(--eve-bg)', padding: '1rem' }}>
                  <label className="eve-label" style={{ display: 'block', marginBottom: '6px' }}>Resource / Item</label>
                  <select value={form.itemId} onChange={(e) => setForm((f) => ({ ...f, itemId: e.target.value }))} style={inputStyle}>
                    <option value="" style={{ background: '#080806' }}>Select item...</option>
                    {items.map((i) => (
                      <option key={i.id} value={String(i.id)} style={{ background: '#080806' }}>{i.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ background: 'var(--eve-bg)', padding: '1rem' }}>
                  <label className="eve-label" style={{ display: 'block', marginBottom: '6px' }}>Quantity</label>
                  <input type="number" min={1} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ background: 'var(--eve-bg)', padding: '1rem' }}>
                  <label className="eve-label" style={{ display: 'block', marginBottom: '6px' }}>Capsuleer Name</label>
                  <input placeholder="Your handle..." value={form.reportedBy} onChange={(e) => setForm((f) => ({ ...f, reportedBy: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ background: 'var(--eve-bg)', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--eve-border)' }}>
                <label className="eve-label" style={{ display: 'block', marginBottom: '6px' }}>Notes (optional)</label>
                <input placeholder="e.g. near stargate, belt 3..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} style={inputStyle} />
              </div>
              <button
                type="submit"
                disabled={submitting || !form.systemId || !form.itemId || !form.reportedBy}
                style={{
                  background: submitting || !form.systemId || !form.itemId || !form.reportedBy ? 'rgba(255,71,0,0.2)' : 'var(--eve-accent)',
                  color: '#080806',
                  border: 'none',
                  padding: '0.7rem 2rem',
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: '11px',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity: submitting || !form.systemId || !form.itemId || !form.reportedBy ? 0.6 : 1,
                }}
              >
                {submitting ? 'TRANSMITTING...' : 'SUBMIT REPORT'}
              </button>
            </form>
          </div>
        )}

        {/* Sightings list */}
        <div style={{ background: 'var(--eve-border)', display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {filtered.length === 0 ? (
            <div style={{ background: 'var(--eve-panel)', padding: '3rem', textAlign: 'center', color: 'var(--eve-text-dim)', fontFamily: "'Exo 2', sans-serif", letterSpacing: '0.1em', fontSize: '12px' }}>
              NO SIGHTINGS REPORTED — BE THE FIRST CAPSULEER
            </div>
          ) : filtered.map((s) => (
            <div
              key={s.id}
              style={{
                background: 'var(--eve-panel)',
                padding: '0.9rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderLeft: '2px solid transparent',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderLeftColor = 'var(--eve-accent)'}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderLeftColor = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '4px', height: '4px', background: 'var(--eve-accent)', flexShrink: 0 }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ color: 'var(--eve-text)', fontSize: '13px', fontFamily: "'Exo 2', sans-serif", fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {s.itemName}
                    </span>
                    <span style={{ color: 'var(--eve-accent)', fontSize: '12px' }}>×{s.quantity}</span>
                    {(s as any).onChain && (
                      <a
                        href={`https://suiexplorer.com/object/${s.id}?network=testnet`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(100,220,120,0.1)', border: '1px solid rgba(100,220,120,0.3)', color: '#64dc78', fontSize: '9px', padding: '1px 5px', textDecoration: 'none', fontFamily: "'Share Tech Mono', monospace" }}
                      >
                        <Link size={8} /> ON-CHAIN
                      </a>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--eve-text-muted)' }}>
                    <span>{s.systemName || `System #${s.systemId}`}</span>
                    {s.notes && <><span style={{ color: 'var(--eve-text-dim)' }}>—</span><span>{s.notes}</span></>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                {/* Verification badge + button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  {(() => {
                    const vCount = verifications.get(`${s.systemId}-${s.itemId}`) ?? 0;
                    return (
                      <>
                        {vCount > 0 && (
                          <span style={{
                            display: 'flex', alignItems: 'center', gap: '3px',
                            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                            color: '#22c55e', fontSize: '9px', padding: '2px 6px',
                            fontFamily: "'Share Tech Mono', monospace",
                          }}>
                            <ShieldCheck size={9} /> {vCount} VERIFIED
                          </span>
                        )}
                        {account && (
                          <button
                            onClick={() => handleVerify(s)}
                            disabled={verifying === s.id}
                            style={{
                              background: 'rgba(34,197,94,0.06)',
                              border: '1px solid rgba(34,197,94,0.25)',
                              color: '#22c55e',
                              fontSize: '9px',
                              fontFamily: "'Exo 2', sans-serif",
                              letterSpacing: '0.08em',
                              padding: '2px 8px',
                              cursor: verifying === s.id ? 'wait' : 'pointer',
                              opacity: verifying === s.id ? 0.5 : 1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {verifying === s.id ? 'SIGNING...' : 'VERIFY'}
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
                {/* Reporter info */}
                <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--eve-text-dim)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end', marginBottom: '2px' }}>
                    <User size={10} />
                    <span>{s.reportedBy}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
                    <Clock size={10} />
                    <span>{timeAgo(s.reportedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
