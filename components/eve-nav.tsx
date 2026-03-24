'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, Package, Calculator, Eye, Home, Trophy } from 'lucide-react';
import { WalletButton } from './wallet-button';

const links = [
  { href: '/', label: 'Overview', icon: Home },
  { href: '/map', label: 'Star Map', icon: Map },
  { href: '/resources', label: 'Resources', icon: Package },
  { href: '/calculator', label: 'Calculator', icon: Calculator },
  { href: '/sightings', label: 'Sightings', icon: Eye },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

export function EveNav() {
  const path = usePathname();
  return (
    <nav
      style={{
        background: 'var(--eve-panel)',
        borderBottom: '1px solid var(--eve-border)',
        padding: '0 2rem',
        display: 'flex',
        alignItems: 'stretch',
        gap: 0,
        height: '48px',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginRight: '2rem',
          paddingRight: '2rem',
          borderRight: '1px solid var(--eve-border)',
        }}
      >
        <span
          style={{
            fontFamily: "'Exo 2', sans-serif",
            fontWeight: 700,
            fontSize: '13px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--eve-text)',
          }}
        >
          EVE<span style={{ color: 'var(--eve-accent)', margin: '0 4px' }}>//</span>TRACKER
        </span>
      </div>

      {/* Nav links */}
      {links.map(({ href, label, icon: Icon }) => {
        const active = path === href;
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 1.25rem',
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontFamily: "'Exo 2', sans-serif",
              fontWeight: 600,
              color: active ? 'var(--eve-accent)' : 'var(--eve-text-muted)',
              borderBottom: active ? '2px solid var(--eve-accent)' : '2px solid transparent',
              transition: 'color 0.15s, border-color 0.15s',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--eve-text)';
            }}
            onMouseLeave={(e) => {
              if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--eve-text-muted)';
            }}
          >
            <Icon size={13} />
            {label}
          </Link>
        );
      })}

      {/* Right side status indicator */}
      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '10px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontFamily: "'Exo 2', sans-serif",
          color: 'var(--eve-text-dim)',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#22c55e',
            display: 'inline-block',
            boxShadow: '0 0 6px #22c55e',
          }}
        />
        API Live
      </div>

      {/* Wallet connect */}
      <div style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', borderLeft: '1px solid var(--eve-border)', paddingLeft: '1rem' }}>
        <WalletButton />
      </div>
    </nav>
  );
}
