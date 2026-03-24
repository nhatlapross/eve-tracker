import Link from 'next/link';
import { getItemTypes, getSolarSystems, getTribes } from '@/lib/eve-api';
import { getSightings } from '@/lib/sightings-store';
import { Map as MapIcon, Calculator, Database, Eye, Clock, Trophy } from 'lucide-react';
import { EveNav } from '@/components/eve-nav';
import { StatCards } from '@/components/stat-cards';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function Dashboard() {
  const timeout = (ms: number) => new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
  const [systems, types, tribes, sightings] = await Promise.all([
    Promise.race([getSolarSystems(), timeout(5000)]).catch(() => [] as Awaited<ReturnType<typeof getSolarSystems>>),
    Promise.race([getItemTypes(), timeout(5000)]).catch(() => [] as Awaited<ReturnType<typeof getItemTypes>>),
    Promise.race([getTribes(), timeout(5000)]).catch(() => [] as Awaited<ReturnType<typeof getTribes>>),
    Promise.resolve(getSightings()),
  ]);
  const recentSightings = sightings.slice(0, 6);

  const stats = [
    { label: 'Solar Systems', value: systems.length.toLocaleString(), icon: 'Globe' as const },
    { label: 'Item Types', value: types.length.toLocaleString(), icon: 'Package' as const },
    { label: 'Tribes', value: tribes.length.toLocaleString(), icon: 'Users' as const },
    { label: 'Sightings', value: sightings.length.toLocaleString(), icon: 'Eye' as const },
  ];

  const navCards = [
    { href: '/map', label: 'Star Map', desc: 'Interactive universe map with gate connections and resource highlights', icon: MapIcon },
    { href: '/resources', label: 'Resource Browser', desc: 'Browse and filter all 390+ item types by category', icon: Database },
    { href: '/calculator', label: 'Industry Calculator', desc: 'Calculate volumes, masses, and cargo runs', icon: Calculator },
    { href: '/sightings', label: 'Resource Sightings', desc: 'Crowdsourced resource node reports from capsuleers', icon: Eye },
    { href: '/leaderboard', label: 'Leaderboard', desc: 'Top resource scouts ranked by on-chain contributions', icon: Trophy },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--eve-bg)' }}>
      <EveNav />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 2rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', display: 'inline-block' }} />
            <span className="eve-label">System Online — Utopia Server</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--eve-text)', marginBottom: '0.25rem', lineHeight: 1 }}>
            Industry &amp; Resource Tracker
          </h1>
          <p style={{ color: 'var(--eve-text-muted)', fontFamily: "'Exo 2', sans-serif", fontSize: '13px', letterSpacing: '0.05em' }}>
            The galaxy wants you dead. Seize any advantage to survive.
          </p>
          <div className="eve-dash" style={{ marginTop: '1rem' }}>
            <span /><span /><span /><span />
          </div>
        </div>

        {/* Stats */}
        <StatCards stats={stats} />

        {/* Nav Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: 'var(--eve-border)', marginBottom: '2rem' }}>
          {navCards.map((c) => (
            <Link key={c.href} href={c.href} style={{ textDecoration: 'none' }}>
              <div className="eve-hover-card" style={{ padding: '1.5rem', cursor: 'pointer', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
                  <c.icon size={16} style={{ color: 'var(--eve-accent)' }} />
                  <h3 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: '13px', letterSpacing: '0.1em', color: 'var(--eve-text)' }}>
                    {c.label}
                  </h3>
                </div>
                <p style={{ color: 'var(--eve-text-muted)', fontSize: '12px', lineHeight: 1.6 }}>{c.desc}</p>
                <div style={{ marginTop: '1rem', color: 'var(--eve-accent)', fontSize: '11px', fontFamily: "'Exo 2', sans-serif", letterSpacing: '0.1em' }}>
                  ENTER →
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Sightings */}
        <div className="eve-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Eye size={14} style={{ color: 'var(--eve-accent)' }} />
              <h2 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: '13px', letterSpacing: '0.1em', color: 'var(--eve-text)' }}>
                Recent Sightings
              </h2>
            </div>
            <Link href="/sightings" style={{ color: 'var(--eve-accent)', fontSize: '11px', fontFamily: "'Exo 2', sans-serif", letterSpacing: '0.1em', textDecoration: 'none' }}>
              VIEW ALL →
            </Link>
          </div>

          {recentSightings.length === 0 ? (
            <p style={{ color: 'var(--eve-text-dim)', fontSize: '12px', textAlign: 'center', padding: '2rem 0' }}>
              No sightings reported yet.{' '}
              <Link href="/sightings" style={{ color: 'var(--eve-accent)', textDecoration: 'none' }}>Be the first.</Link>
            </p>
          ) : (
            <div>
              {recentSightings.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0',
                    borderTop: i === 0 ? '1px solid var(--eve-border)' : 'none',
                    borderBottom: '1px solid var(--eve-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '4px', background: 'var(--eve-accent)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--eve-text)', fontSize: '13px' }}>{s.itemName}</span>
                    <span style={{ color: 'var(--eve-accent)', fontSize: '12px' }}>×{s.quantity}</span>
                    <span style={{ color: 'var(--eve-text-dim)', fontSize: '11px' }}>in</span>
                    <span style={{ color: 'var(--eve-text-muted)', fontSize: '12px' }}>{s.systemName || `#${s.systemId}`}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--eve-text-dim)', fontSize: '11px' }}>
                    <Clock size={11} />
                    {timeAgo(s.reportedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--eve-text-dim)', fontSize: '11px', fontFamily: "'Exo 2', sans-serif", letterSpacing: '0.1em' }}>
          EVE FRONTIER × SUI HACKATHON 2026 — TOOLKIT FOR CIVILIZATION
        </div>
      </div>
    </div>
  );
}
