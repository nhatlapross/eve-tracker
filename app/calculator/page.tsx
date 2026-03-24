'use client';
import { useState, useEffect } from 'react';
import { Calculator } from 'lucide-react';
import { EveNav } from '@/components/eve-nav';
import type { ItemType } from '@/lib/eve-api';

const SHIPS = [
  { name: 'Shuttle', cargo: 50 },
  { name: 'Hauler', cargo: 500 },
  { name: 'Industrial', cargo: 3000 },
  { name: 'Freighter', cargo: 15000 },
  { name: 'Jump Freighter', cargo: 300000 },
];

function tripsColor(trips: number): string {
  if (trips === 0) return 'var(--eve-text-dim)';
  if (trips === 1) return '#22c55e';
  if (trips <= 5) return '#eab308';
  return 'var(--eve-accent)';
}

export default function CalculatorPage() {
  const [items, setItems] = useState<ItemType[]>([]);
  const [bom, setBom] = useState<Array<{ itemId: string; qty: number }>>([{ itemId: '', qty: 1 }]);
  const [cargoSize, setCargoSize] = useState(500);

  useEffect(() => {
    fetch('/api/types').then((r) => r.json()).then(setItems).catch(() => {});
  }, []);

  const bomResolved = bom.map(row => ({
    ...row,
    item: items.find(it => String(it.id) === row.itemId),
  }));
  const totalVolume = bomResolved.reduce((s, r) => s + (r.item?.volume ?? 0) * r.qty, 0);
  const totalMass = bomResolved.reduce((s, r) => s + (r.item?.mass ?? 0) * r.qty, 0);
  const tripsNeeded = cargoSize > 0 && totalVolume > 0 ? Math.ceil(totalVolume / cargoSize) : 0;

  function updateRow(index: number, patch: Partial<{ itemId: string; qty: number }>) {
    setBom(prev => prev.map((row, i) => i === index ? { ...row, ...patch } : row));
  }

  function addRow() {
    setBom(prev => [...prev, { itemId: '', qty: 1 }]);
  }

  function removeRow(index: number) {
    setBom(prev => prev.filter((_, i) => i !== index));
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--eve-bg)' }}>
      <EveNav />
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2.5rem 2rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
            <Calculator size={16} style={{ color: 'var(--eve-accent)' }} />
            <h1 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: 'var(--eve-text)' }}>
              Industry Calculator
            </h1>
          </div>
          <div className="eve-dash"><span /><span /><span /><span /></div>
        </div>

        {/* Two-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--eve-border)' }}>

          {/* LEFT — Cargo Manifest */}
          <div style={{ background: 'var(--eve-panel)', padding: '1.5rem' }}>
            <h2 style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '11px', letterSpacing: '0.15em', color: 'var(--eve-text-muted)', marginBottom: '1rem' }}>
              CARGO MANIFEST
            </h2>

            {bomResolved.map((row, index) => (
              <div key={index} style={{ marginBottom: '1px' }}>
                {/* Item row */}
                <div style={{ display: 'flex', gap: '1px', background: 'var(--eve-border)', marginBottom: '1px' }}>
                  <select
                    value={row.itemId}
                    onChange={(e) => updateRow(index, { itemId: e.target.value })}
                    style={{
                      flex: 1,
                      background: 'var(--eve-panel)',
                      border: 'none',
                      color: 'var(--eve-text)',
                      padding: '6px 8px',
                      fontSize: '11px',
                      fontFamily: "'Share Tech Mono', monospace",
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">— select item —</option>
                    {items.map((it) => (
                      <option key={it.id} value={String(it.id)}>
                        {it.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={row.qty}
                    onChange={(e) => updateRow(index, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                    style={{
                      width: '60px',
                      background: 'var(--eve-panel)',
                      border: 'none',
                      borderLeft: '1px solid var(--eve-border)',
                      color: 'var(--eve-text)',
                      padding: '6px 8px',
                      fontSize: '11px',
                      fontFamily: "'Share Tech Mono', monospace",
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => removeRow(index)}
                    disabled={bom.length === 1}
                    style={{
                      background: 'var(--eve-panel)',
                      border: 'none',
                      borderLeft: '1px solid var(--eve-border)',
                      color: 'var(--eve-text-dim)',
                      padding: '6px 10px',
                      cursor: bom.length === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: bom.length === 1 ? 0.3 : 1,
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Per-row volume/mass */}
                {row.item && (
                  <div style={{
                    padding: '3px 8px 5px',
                    fontSize: '10px',
                    fontFamily: "'Share Tech Mono', monospace",
                    color: 'var(--eve-text-dim)',
                    background: 'var(--eve-panel)',
                    marginBottom: '1px',
                  }}>
                    {(row.item.volume * row.qty).toFixed(2)} m³ · {(row.item.mass * row.qty).toFixed(0)} kg
                  </div>
                )}
              </div>
            ))}

            {/* Add Item button */}
            <button
              onClick={addRow}
              style={{
                width: '100%',
                background: 'rgba(250,250,229,0.02)',
                border: '1px dashed var(--eve-border)',
                color: 'var(--eve-text-muted)',
                padding: '8px',
                fontFamily: "'Exo 2', sans-serif",
                fontSize: '10px',
                letterSpacing: '0.12em',
                cursor: 'pointer',
                marginTop: '1px',
              }}
            >
              + ADD ITEM
            </button>
          </div>

          {/* RIGHT — Summary & Ship Comparison */}
          <div style={{ background: 'var(--eve-panel)', padding: '1.5rem' }}>
            <h2 style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '11px', letterSpacing: '0.15em', color: 'var(--eve-text-muted)', marginBottom: '1rem' }}>
              SUMMARY
            </h2>

            {/* Stat boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--eve-border)', marginBottom: '1px' }}>
              {[
                { label: 'TOTAL VOLUME', value: `${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 1 })} m³` },
                { label: 'TOTAL MASS', value: `${totalMass.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg` },
                { label: 'TRIPS', value: tripsNeeded ? String(tripsNeeded) : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--eve-panel)', padding: '0.75rem 1rem' }}>
                  <div style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '9px', letterSpacing: '0.15em', color: 'var(--eve-text-muted)', marginBottom: '4px' }}>
                    {label}
                  </div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '1.5rem', fontWeight: 900, color: 'var(--eve-text)', lineHeight: 1 }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Ship class selector */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '9px', letterSpacing: '0.15em', color: 'var(--eve-text-muted)', marginBottom: '6px' }}>
                SHIP CLASS
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1px' }}>
                {SHIPS.map((ship) => {
                  const active = cargoSize === ship.cargo;
                  return (
                    <button
                      key={ship.name}
                      onClick={() => setCargoSize(ship.cargo)}
                      style={{
                        background: 'var(--eve-panel)',
                        border: `1px solid ${active ? 'var(--eve-accent)' : 'var(--eve-border)'}`,
                        color: active ? 'var(--eve-accent)' : 'var(--eve-text-dim)',
                        padding: '4px 10px',
                        fontFamily: "'Exo 2', sans-serif",
                        fontSize: '10px',
                        letterSpacing: '0.08em',
                        cursor: 'pointer',
                      }}
                    >
                      {ship.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom cargo input */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '9px', letterSpacing: '0.15em', color: 'var(--eve-text-muted)', marginBottom: '6px' }}>
                CUSTOM CARGO (m³)
              </div>
              <input
                type="number"
                min="1"
                value={cargoSize}
                onChange={(e) => setCargoSize(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: '100%',
                  background: 'var(--eve-bg)',
                  border: '1px solid var(--eve-border)',
                  color: 'var(--eve-text)',
                  padding: '6px 8px',
                  fontSize: '11px',
                  fontFamily: "'Share Tech Mono', monospace",
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Ship comparison table */}
            <div>
              <div style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '9px', letterSpacing: '0.15em', color: 'var(--eve-text-muted)', marginBottom: '6px' }}>
                COMPARISON
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--eve-border)' }}>
                {SHIPS.map((ship) => {
                  const shipTrips = totalVolume > 0 ? Math.ceil(totalVolume / ship.cargo) : 0;
                  const isActive = cargoSize === ship.cargo;
                  return (
                    <div
                      key={ship.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--eve-panel)',
                        padding: '6px 10px',
                        borderLeft: isActive ? '2px solid var(--eve-accent)' : '2px solid transparent',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '11px', color: isActive ? 'var(--eve-text)' : 'var(--eve-text-muted)' }}>
                          {ship.name}
                        </span>
                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: 'var(--eve-text-dim)' }}>
                          {ship.cargo.toLocaleString()} m³
                        </span>
                      </div>
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', fontWeight: 700, color: tripsColor(shipTrips) }}>
                        {shipTrips === 0 ? '—' : `${shipTrips}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div style={{ marginTop: '1px', background: 'var(--eve-panel)', padding: '1rem 1.25rem' }}>
          <p style={{ color: 'var(--eve-text-dim)', fontSize: '11px', fontFamily: "'Share Tech Mono', monospace" }}>
            // Full crafting recipes pending Utopia API update. Join EVE Frontier Discord (#builder) for latest endpoints.
          </p>
        </div>
      </div>
    </div>
  );
}
