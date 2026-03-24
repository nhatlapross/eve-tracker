'use client';
import { useEffect, useRef } from 'react';
import { animate, createTimeline, stagger } from 'animejs';
import { X, Hash, Layers, Eye, Crosshair, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import type { Sighting } from '@/lib/sightings-store';

interface StarNode {
  id: number;
  name: string;
  constellationId: number;
  hasSighting: boolean;
}

interface StarDetailProps {
  node: StarNode;
  sightings: Sighting[];
  onClose: () => void;
  origin?: { x: number; y: number };
}

const CONST_COLORS = [
  '#4a8fff','#3ab8d4','#7a60f0','#38c8a8',
  '#6688dd','#50d0e0','#9966ee','#44b8c8',
  '#5577cc','#60e0b0','#aa55dd','#3388bb',
];

function starColor(node: StarNode) {
  if (node.hasSighting) return {
    gradient: 'radial-gradient(circle at 38% 32%, #fff8cc, #ffcc44, #ff7700, #441100)',
    glow: '#ff6600',
    glowMid: 'rgba(255,120,0,0.35)',
    glowOuter: 'rgba(255,60,0,0.12)',
    ring: 'rgba(255,180,60,0.35)',
    coronaColor: 'rgba(255,140,0,0.12)',
  };
  const c = CONST_COLORS[Math.abs(node.constellationId) % CONST_COLORS.length];
  return {
    gradient: `radial-gradient(circle at 38% 32%, #eef8ff, #aad4ff, ${c}, #001133)`,
    glow: c,
    glowMid: `${c}55`,
    glowOuter: `${c}22`,
    ring: `${c}55`,
    coronaColor: `${c}18`,
  };
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

export function StarDetail({ node, sightings, onClose, origin }: StarDetailProps) {
  const colors = starColor(node);
  const backdropRef = useRef<HTMLDivElement>(null);
  const starRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = backdropRef.current;
    if (!el) return;

    const ox = origin?.x ?? window.innerWidth / 2;
    const oy = origin?.y ?? window.innerHeight / 2;
    const maxR = Math.hypot(window.innerWidth, window.innerHeight) * 1.1;

    // 1. Clip-path circle expand from star — starts immediately
    const proxy = { r: 0 };
    animate(proxy, {
      r: maxR,
      duration: 520,
      easing: 'easeOutQuart',
      onUpdate: () => {
        el.style.clipPath = `circle(${proxy.r}px at ${ox}px ${oy}px)`;
      },
      onComplete: () => { el.style.clipPath = 'none'; },
    });

    // 2. Star sphere scale-in, slightly delayed
    if (starRef.current) {
      animate(starRef.current, {
        opacity: [0, 1],
        scale: [0.4, 1],
        duration: 480,
        delay: 180,
        easing: 'easeOutBack',
      });
    }

    // 3. Stat rows slide from right, staggered after star
    if (statsRef.current) {
      const rows = statsRef.current.querySelectorAll('.stat-row');
      animate(rows, {
        opacity: [0, 1],
        translateX: [24, 0],
        duration: 320,
        delay: stagger(50, { start: 280 }),
        easing: 'easeOutCubic',
      });
    }
  }, []);

  function handleClose() {
    const el = backdropRef.current;
    if (!el) { onClose(); return; }

    const ox = origin?.x ?? window.innerWidth / 2;
    const oy = origin?.y ?? window.innerHeight / 2;
    const maxR = Math.hypot(window.innerWidth, window.innerHeight) * 1.1;

    const proxy = { r: maxR };
    el.style.clipPath = `circle(${maxR}px at ${ox}px ${oy}px)`;

    animate(proxy, {
      r: 0,
      duration: 420,
      easing: 'easeInCubic',
      onUpdate: () => {
        el.style.clipPath = `circle(${proxy.r}px at ${ox}px ${oy}px)`;
      },
      onComplete: onClose,
    });
  }

  const stats = [
    { label: 'System ID', value: String(node.id), icon: Hash },
    { label: 'Constellation', value: String(node.constellationId), icon: Layers },
    { label: 'Security Status', value: node.hasSighting ? 'RESOURCE SPOTTED' : 'SURVEYED — CLEAR', icon: Crosshair, accent: node.hasSighting },
    { label: 'Sighting Reports', value: String(sightings.length), icon: Eye },
  ];

  return (
    <div
      ref={backdropRef}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(3,3,2,0.92)',
        opacity: 1,
        clipPath: 'circle(0px at 50% 50%)',
      }}
    >
      {/* Close button top-right */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: '1.5rem',
          right: '1.5rem',
          background: 'rgba(250,250,229,0.05)',
          border: '1px solid var(--eve-border)',
          color: 'var(--eve-text-muted)',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'border-color 0.15s, color 0.15s',
          zIndex: 60,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--eve-accent)';
          (e.currentTarget as HTMLElement).style.color = 'var(--eve-accent)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--eve-border)';
          (e.currentTarget as HTMLElement).style.color = 'var(--eve-text-muted)';
        }}
      >
        <X size={14} />
      </button>

      {/* Center layout */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5rem',
        padding: '2rem',
      }}>

        {/* ── 3D Star ── */}
        <div ref={starRef} style={{
          position: 'relative',
          width: '300px',
          height: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
        }}>

          {/* Outer corona glow */}
          <div style={{
            position: 'absolute',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${colors.glowMid} 0%, ${colors.glowOuter} 45%, transparent 70%)`,
            animation: 'glow-breathe 3s ease-in-out infinite',
          }} />

          {/* Spinning corona ring (faint) */}
          <div style={{
            position: 'absolute',
            width: '210px',
            height: '210px',
            borderRadius: '50%',
            background: `conic-gradient(transparent 0%, ${colors.coronaColor} 25%, transparent 50%, ${colors.coronaColor} 75%, transparent 100%)`,
            animation: 'corona-spin 8s linear infinite',
          }} />

          {/* Orbital ring 1 — wide, gently tilted */}
          <div style={{
            position: 'absolute',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            border: `1px solid ${colors.ring}`,
            animation: 'orbit-0 8s linear infinite',
            boxShadow: `inset 0 0 8px ${colors.ring}`,
          }} />

          {/* Orbital ring 2 — mid, opposite direction */}
          <div style={{
            position: 'absolute',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            border: `1px solid ${colors.ring.replace('0.35', '0.25')}`,
            animation: 'orbit-1 5s linear infinite',
          }}>
            {/* Small satellite dot on ring */}
            <div style={{
              position: 'absolute',
              top: '-3px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: colors.glow,
              boxShadow: `0 0 8px ${colors.glow}`,
            }} />
          </div>

          {/* Orbital ring 3 — inner, fast */}
          <div style={{
            position: 'absolute',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            border: `1px solid ${colors.ring.replace('0.35', '0.15')}`,
            animation: 'orbit-2 3.5s linear infinite',
          }} />

          {/* Star sphere */}
          <div style={{
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            background: colors.gradient,
            boxShadow: `0 0 25px ${colors.glow}, 0 0 60px ${colors.glowMid}, 0 0 100px ${colors.glowOuter}`,
            animation: 'star-pulse 4s ease-in-out infinite',
            zIndex: 2,
          }} />

          {/* System name below star */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: 0,
            right: 0,
            textAlign: 'center',
          }}>
            <p style={{
              fontFamily: "'Exo 2', sans-serif",
              fontWeight: 700,
              fontSize: '11px',
              letterSpacing: '0.2em',
              color: 'var(--eve-text-muted)',
              textTransform: 'uppercase',
            }}>
              {node.hasSighting ? '⬡ RESOURCES DETECTED' : '● NO ANOMALIES'}
            </p>
          </div>
        </div>

        {/* ── Stats Panels ── */}
        <div ref={statsRef} style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: '340px' }}>

          {/* System name header */}
          <div className="stat-row" style={{
            background: 'rgba(250,250,229,0.03)',
            border: '1px solid var(--eve-border)',
            borderLeft: `3px solid ${colors.glow}`,
            padding: '1.25rem 1.5rem',
            marginBottom: '1px',
            opacity: 0,
          }}>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '9px', letterSpacing: '0.2em', color: 'var(--eve-text-muted)', marginBottom: '6px' }}>
              SOLAR SYSTEM
            </p>
            <h2 style={{
              fontFamily: "'Exo 2', sans-serif",
              fontWeight: 900,
              fontSize: '1.75rem',
              letterSpacing: '0.08em',
              color: 'var(--eve-text)',
              lineHeight: 1,
            }}>
              {node.name}
            </h2>
          </div>

          {/* Stat rows */}
          {stats.map(({ label, value, icon: Icon, accent }) => (
            <div
              key={label}
              className="stat-row"
              style={{
                background: accent ? 'rgba(255,71,0,0.05)' : 'rgba(250,250,229,0.02)',
                border: `1px solid ${accent ? 'rgba(255,71,0,0.25)' : 'var(--eve-border)'}`,
                padding: '0.7rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon size={12} style={{ color: accent ? '#ff8844' : 'var(--eve-accent)', flexShrink: 0 }} />
                <span style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '10px', letterSpacing: '0.12em', color: 'var(--eve-text-muted)' }}>
                  {label}
                </span>
              </div>
              <span style={{
                fontFamily: accent ? "'Exo 2', sans-serif" : "'Share Tech Mono', monospace",
                fontSize: accent ? '10px' : '13px',
                letterSpacing: accent ? '0.1em' : '0.05em',
                color: accent ? '#ff8844' : 'var(--eve-text)',
                fontWeight: accent ? 700 : 400,
              }}>
                {value}
              </span>
            </div>
          ))}

          {/* Sightings list */}
          {sightings.length > 0 && (
            <div className="stat-row" style={{
              background: 'rgba(255,71,0,0.04)',
              border: '1px solid rgba(255,71,0,0.18)',
              padding: '0.75rem 1.5rem',
              opacity: 0,
            }}>
              <p style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '9px', letterSpacing: '0.15em', color: '#ff8844', marginBottom: '8px' }}>
                <AlertTriangle size={9} style={{ display: 'inline', marginRight: '5px' }} />
                RESOURCE INTEL
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {sightings.slice(0, 4).map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--eve-accent)', fontSize: '10px' }}>▸</span>
                      <span style={{ color: 'var(--eve-text)' }}>{s.itemName}</span>
                      <span style={{ color: 'var(--eve-text-dim)' }}>×{s.quantity}</span>
                    </div>
                    <span style={{ color: 'var(--eve-text-dim)', fontSize: '10px' }}>{timeAgo(s.reportedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="stat-row" style={{
            display: 'flex',
            gap: '1px',
            marginTop: '4px',
            opacity: 0,
          }}>
            <Link
              href="/sightings"
              style={{
                flex: 1,
                background: 'rgba(255,71,0,0.08)',
                border: '1px solid rgba(255,71,0,0.3)',
                color: 'var(--eve-accent)',
                padding: '0.6rem 1rem',
                fontFamily: "'Exo 2', sans-serif",
                fontSize: '10px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              + Report Sighting
            </Link>
            <button
              onClick={handleClose}
              style={{
                flex: 1,
                background: 'rgba(250,250,229,0.03)',
                border: '1px solid var(--eve-border)',
                color: 'var(--eve-text-muted)',
                padding: '0.6rem 1rem',
                fontFamily: "'Exo 2', sans-serif",
                fontSize: '10px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <X size={11} /> Close View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
