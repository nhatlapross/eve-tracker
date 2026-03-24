'use client';
import { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';
import { Globe, Package, Users, Eye } from 'lucide-react';

const ICONS = { Globe, Package, Users, Eye } as const;
type IconKey = keyof typeof ICONS;

interface Stat {
  label: string;
  value: string;
  icon: IconKey;
}

export function StatCards({ stats }: { stats: Stat[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const numbersRef = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const cards = containerRef.current.querySelectorAll('.stat-card');

    // Fade + slide in cards with stagger
    animate(cards, {
      opacity: [0, 1],
      translateY: [18, 0],
      duration: 550,
      delay: stagger(90),
      easing: 'easeOutCubic',
    });

    // Count-up each number
    numbersRef.current.forEach((el, i) => {
      if (!el) return;
      const raw = stats[i].value.replace(/,/g, '');
      const target = parseInt(raw, 10);
      if (isNaN(target)) return;

      const obj = { val: 0 };
      animate(obj, {
        val: target,
        duration: 1200,
        delay: i * 90 + 200,
        easing: 'easeOutExpo',
        onUpdate: () => {
          if (el) el.textContent = Math.round(obj.val).toLocaleString();
        },
      });
    });
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1px',
        background: 'var(--eve-border)',
        marginBottom: '2rem',
      }}
    >
      {stats.map(({ label, value, icon }, i) => {
        const Icon = ICONS[icon];
        return (
        <div
          key={label}
          className="stat-card"
          style={{
            background: 'var(--eve-panel)',
            padding: '1.25rem 1.5rem',
            opacity: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
            <Icon size={14} style={{ color: 'var(--eve-accent)' }} />
            <span style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: '9px',
              letterSpacing: '0.18em',
              color: 'var(--eve-text-muted)',
              textTransform: 'uppercase',
            }}>
              {label}
            </span>
          </div>
          <span
            ref={el => { numbersRef.current[i] = el; }}
            style={{
              fontFamily: "'Exo 2', sans-serif",
              fontWeight: 900,
              fontSize: '2rem',
              color: 'var(--eve-text)',
              lineHeight: 1,
            }}
          >
            0
          </span>
        </div>
        );
      })}
    </div>
  );
}
