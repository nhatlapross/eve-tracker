import { getTribes } from '@/lib/eve-api';
import { EveNav } from '@/components/eve-nav';
import { Users } from 'lucide-react';

export const revalidate = 3600;

function taxColor(rate: number): string {
  if (rate <= 0.05) return '#22c55e';
  if (rate <= 0.1) return '#84cc16';
  if (rate <= 0.15) return '#eab308';
  if (rate <= 0.2) return '#f97316';
  return '#ef4444';
}

function taxLabel(rate: number): string {
  if (rate <= 0.05) return 'LOW';
  if (rate <= 0.1) return 'FAIR';
  if (rate <= 0.15) return 'MOD';
  if (rate <= 0.2) return 'HIGH';
  return 'VERY HIGH';
}

export default async function TribesPage() {
  const tribes = await getTribes();
  const sorted = [...tribes].sort((a, b) => a.taxRate - b.taxRate);

  const avgTax = tribes.reduce((sum, t) => sum + t.taxRate, 0) / tribes.length;
  const minTax = Math.min(...tribes.map((t) => t.taxRate));
  const maxTax = Math.max(...tribes.map((t) => t.taxRate));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--eve-bg)' }}>
      <EveNav />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 2rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
            <Users size={18} style={{ color: 'var(--eve-accent)' }} />
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
              TRIBES DIRECTORY
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
            {tribes.length} tribes — tax rates from {(minTax * 100).toFixed(1)}% to{' '}
            {(maxTax * 100).toFixed(1)}% — avg {(avgTax * 100).toFixed(1)}%
          </p>
          <div className="eve-dash" style={{ marginTop: '1rem' }}>
            <span /><span /><span /><span />
          </div>
        </div>

        {/* Summary stat row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          {[
            {
              label: 'TOTAL TRIBES',
              value: tribes.length,
              color: 'var(--eve-accent)',
            },
            {
              label: 'LOWEST TAX',
              value: (minTax * 100).toFixed(1) + '%',
              color: '#22c55e',
            },
            {
              label: 'HIGHEST TAX',
              value: (maxTax * 100).toFixed(1) + '%',
              color: '#ef4444',
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="eve-panel"
              style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}
            >
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

        {/* Tax rate legend */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
          }}
        >
          {[
            { label: 'LOW ≤5%', color: '#22c55e' },
            { label: 'FAIR ≤10%', color: '#84cc16' },
            { label: 'MOD ≤15%', color: '#eab308' },
            { label: 'HIGH ≤20%', color: '#f97316' },
            { label: 'VERY HIGH >20%', color: '#ef4444' },
          ].map(({ label, color }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontFamily: "'Exo 2', sans-serif",
                fontSize: '10px',
                color: 'var(--eve-text-dim)',
                letterSpacing: '0.08em',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                }}
              />
              {label}
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ border: '1px solid var(--eve-border)', overflow: 'hidden' }}>
          {/* Header row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '48px 1fr 80px 120px 100px',
              gap: 0,
              padding: '0.6rem 1.5rem',
              background: 'rgba(255,255,255,0.03)',
              borderBottom: '1px solid var(--eve-border)',
              fontFamily: "'Exo 2', sans-serif",
              fontSize: '10px',
              letterSpacing: '0.12em',
              color: 'var(--eve-text-dim)',
              textTransform: 'uppercase',
            }}
          >
            <div>#</div>
            <div>NAME</div>
            <div style={{ textAlign: 'center' }}>SHORT</div>
            <div style={{ textAlign: 'right' }}>TAX RATE</div>
            <div style={{ textAlign: 'right' }}>RATING</div>
          </div>

          {sorted.map((tribe, idx) => {
            const color = taxColor(tribe.taxRate);
            const label = taxLabel(tribe.taxRate);
            const pct = tribe.taxRate * 100;
            const barWidth = Math.min((tribe.taxRate / maxTax) * 100, 100);

            return (
              <div
                key={tribe.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '48px 1fr 80px 120px 100px',
                  gap: 0,
                  padding: '0.75rem 1.5rem',
                  borderBottom: '1px solid var(--eve-border)',
                  background: 'var(--eve-panel)',
                  alignItems: 'center',
                }}
              >
                {/* Index */}
                <div
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: '11px',
                    color: 'var(--eve-text-dim)',
                  }}
                >
                  {idx + 1}
                </div>

                {/* Name */}
                <div>
                  <div
                    style={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--eve-text)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {tribe.name}
                  </div>
                  {/* Tax bar */}
                  <div
                    style={{
                      marginTop: '4px',
                      height: '2px',
                      background: 'rgba(255,255,255,0.06)',
                      width: '160px',
                      maxWidth: '100%',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${barWidth}%`,
                        height: '100%',
                        background: color,
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </div>

                {/* Short name */}
                <div style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: '11px',
                      color: 'var(--eve-text-muted)',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--eve-border)',
                      padding: '2px 8px',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {tribe.nameShort}
                  </span>
                </div>

                {/* Tax rate */}
                <div
                  style={{
                    textAlign: 'right',
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: '14px',
                    fontWeight: 700,
                    color,
                  }}
                >
                  {pct.toFixed(1)}%
                </div>

                {/* Rating badge */}
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontSize: '9px',
                      letterSpacing: '0.1em',
                      color,
                      border: `1px solid ${color}40`,
                      padding: '2px 6px',
                    }}
                  >
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

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
          DATA SOURCE: EVE FRONTIER WORLD API · SORTED BY TAX RATE ASC
        </div>
      </div>
    </div>
  );
}
