'use client';
import { ConnectModal, useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { useState, useRef, useEffect } from 'react';

export function WalletButton() {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const [connectOpen, setConnectOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropOpen]);

  if (account) {
    return (
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          onClick={() => setDropOpen(v => !v)}
          style={{
            background: 'transparent',
            border: `1px solid ${dropOpen ? 'rgba(100,220,120,0.8)' : 'rgba(100,220,120,0.45)'}`,
            color: '#64dc78',
            fontFamily: "'Exo 2', sans-serif",
            fontSize: '10px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '4px 12px',
            borderRadius: 0,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ◆ {account.address.slice(0, 6)}...{account.address.slice(-4)}
          <span style={{ fontSize: '8px', opacity: 0.7 }}>{dropOpen ? '▲' : '▼'}</span>
        </button>

        {dropOpen && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            width: '280px',
            background: 'var(--eve-panel)',
            border: '1px solid var(--eve-border)',
            borderTop: '2px solid rgba(100,220,120,0.5)',
            zIndex: 200,
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          }}>
            {/* Address */}
            <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--eve-border)' }}>
              <p style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '9px', letterSpacing: '0.15em', color: 'var(--eve-text-muted)', marginBottom: '5px' }}>ADDRESS</p>
              <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: 'var(--eve-text)', wordBreak: 'break-all', lineHeight: 1.5 }}>
                {account.address}
              </p>
            </div>

            {/* Network */}
            <div style={{ padding: '0.7rem 1rem', borderBottom: '1px solid var(--eve-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#64dc78', boxShadow: '0 0 5px #64dc78', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '10px', color: '#64dc78' }}>Sui Testnet</span>
            </div>

            {/* Explorer */}
            <a
              href={`https://suiexplorer.com/address/${account.address}?network=testnet`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setDropOpen(false)}
              style={{
                display: 'block',
                padding: '0.7rem 1rem',
                fontFamily: "'Exo 2', sans-serif",
                fontSize: '10px',
                letterSpacing: '0.1em',
                color: 'var(--eve-text-muted)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--eve-border)',
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLElement).style.color = 'var(--eve-text)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--eve-text-muted)'; }}
            >
              VIEW ON SUI EXPLORER ↗
            </a>

            {/* Disconnect */}
            <button
              onClick={() => { disconnect(); setDropOpen(false); }}
              style={{
                width: '100%',
                padding: '0.7rem 1rem',
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,71,0,0.7)',
                fontFamily: "'Exo 2', sans-serif",
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,71,0,0.06)'; e.currentTarget.style.color = 'var(--eve-accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,71,0,0.7)'; }}
            >
              DISCONNECT
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <ConnectModal
      trigger={
        <button
          style={{
            background: 'transparent',
            border: '1px solid var(--eve-border)',
            color: 'var(--eve-text)',
            fontFamily: "'Exo 2', sans-serif",
            fontSize: '10px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '4px 12px',
            borderRadius: 0,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--eve-accent)'; e.currentTarget.style.color = 'var(--eve-accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--eve-border)'; e.currentTarget.style.color = 'var(--eve-text)'; }}
        >
          CONNECT WALLET
        </button>
      }
      open={connectOpen}
      onOpenChange={setConnectOpen}
    />
  );
}
