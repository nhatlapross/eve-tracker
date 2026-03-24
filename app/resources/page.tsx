'use client';
import { useState, useEffect } from 'react';
import { Package, Search } from 'lucide-react';
import { EveNav } from '@/components/eve-nav';
import type { ItemType } from '@/lib/eve-api';

export default function ResourcesPage() {
  const [items, setItems] = useState<ItemType[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/types')
      .then((r) => r.json())
      .then((d) => { setItems(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const categories = ['all', ...Array.from(new Set(items.map((i) => i.categoryName).filter(Boolean)))];

  const filtered = items.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' || i.categoryName === category;
    return matchSearch && matchCat;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--eve-bg)' }}>
      <EveNav />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 2rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
            <Package size={16} style={{ color: 'var(--eve-accent)' }} />
            <h1 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: 'var(--eve-text)' }}>
              Resource Browser
            </h1>
            <span style={{
              background: 'var(--eve-accent-dim)',
              border: '1px solid var(--eve-accent)',
              color: 'var(--eve-accent)',
              fontFamily: "'Exo 2', sans-serif",
              fontSize: '10px',
              letterSpacing: '0.1em',
              padding: '2px 8px',
            }}>
              {filtered.length} ITEMS
            </span>
          </div>
          <div className="eve-dash"><span /><span /><span /><span /></div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1px', marginBottom: '1.5rem', background: 'var(--eve-border)' }}>
          <div style={{ position: 'relative', flex: 1, background: 'var(--eve-panel)' }}>
            <Search size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--eve-text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resources..."
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--eve-text)',
                padding: '0.75rem 1rem 0.75rem 2.25rem',
                fontSize: '13px',
              }}
            />
          </div>
          <div style={{ background: 'var(--eve-panel)', display: 'flex', alignItems: 'center' }}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--eve-text)',
                padding: '0.75rem 1rem',
                fontSize: '12px',
                fontFamily: "'Exo 2', sans-serif",
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                minWidth: '180px',
              }}
            >
              {categories.map((c) => (
                <option key={c} value={c} style={{ background: '#0f0e09' }}>
                  {c === 'all' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--eve-text-muted)', padding: '4rem 0', fontFamily: "'Exo 2', sans-serif", letterSpacing: '0.1em' }}>
            LOADING RESOURCES...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--eve-text-dim)', padding: '4rem 0', fontFamily: "'Exo 2', sans-serif', letterSpacing: '0.1em" }}>
            NO ITEMS FOUND
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--eve-border)' }}>
            {filtered.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'var(--eve-panel)',
                  padding: '1rem 1.25rem',
                  borderLeft: '2px solid transparent',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderLeftColor = 'var(--eve-accent)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,71,0,0.03)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderLeftColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.background = 'var(--eve-panel)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{
                    fontFamily: "'Exo 2', sans-serif",
                    fontWeight: 600,
                    fontSize: '12px',
                    letterSpacing: '0.06em',
                    color: 'var(--eve-text)',
                    textTransform: 'uppercase',
                  }}>
                    {item.name}
                  </h3>
                  <span style={{
                    background: 'rgba(255,71,0,0.1)',
                    border: '1px solid rgba(255,71,0,0.3)',
                    color: 'var(--eve-accent)',
                    fontSize: '9px',
                    fontFamily: "'Exo 2', sans-serif",
                    letterSpacing: '0.08em',
                    padding: '1px 6px',
                    textTransform: 'uppercase',
                    flexShrink: 0,
                    marginLeft: '8px',
                  }}>
                    {item.groupName || item.categoryName}
                  </span>
                </div>
                {item.description && (
                  <p style={{ color: 'var(--eve-text-muted)', fontSize: '11px', lineHeight: 1.5, marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.description}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '1rem', fontSize: '11px', color: 'var(--eve-text-dim)', borderTop: '1px solid var(--eve-border)', paddingTop: '0.5rem', marginTop: 'auto' }}>
                  {item.volume > 0 && <span>VOL {item.volume}m³</span>}
                  {item.mass > 0 && <span>MASS {item.mass.toLocaleString()}kg</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
