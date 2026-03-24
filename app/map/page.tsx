'use client';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Search, Eye, Crosshair } from 'lucide-react';
import { animate } from 'animejs';
import { EveNav } from '@/components/eve-nav';
import { StarDetail } from '@/components/star-detail';
import type { SolarSystem } from '@/lib/eve-api';
import type { Sighting } from '@/lib/sightings-store';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

/* ── Types ── */
interface GraphNode {
  id: number;
  name: string;
  constellationId: number;
  hasSighting: boolean;
  x?: number;
  y?: number;
}
interface GraphLink { source: number; target: number; }
interface GraphData { nodes: GraphNode[]; links: GraphLink[]; }

/* ── Constellation colour palette (EVE-ish blue/teal/purple family) ── */
const CONST_COLORS = [
  '#4a8fff', '#3ab8d4', '#7a60f0', '#38c8a8',
  '#6688dd', '#50d0e0', '#9966ee', '#44b8c8',
  '#5577cc', '#60e0b0', '#aa55dd', '#3388bb',
];
function constellationColor(id: number) {
  return CONST_COLORS[Math.abs(id) % CONST_COLORS.length];
}

/* ── Background stars (generated once, reduced count) ── */
const BG_STARS = Array.from({ length: 120 }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: Math.random() * 0.9 + 0.15,
  a: Math.random() * 0.55 + 0.1,
}));

/* ── Offscreen BG canvas (draw nebula+stars once, blit every frame) ── */
let bgCacheCanvas: HTMLCanvasElement | null = null;
let bgCacheW = 0;
let bgCacheH = 0;
function getBgCache(w: number, h: number): HTMLCanvasElement {
  if (!bgCacheCanvas || bgCacheW !== w || bgCacheH !== h) {
    bgCacheCanvas = document.createElement('canvas');
    bgCacheCanvas.width = w;
    bgCacheCanvas.height = h;
    bgCacheW = w; bgCacheH = h;
    const bx = bgCacheCanvas.getContext('2d')!;
    NEBULAS.forEach(n => {
      const grd = bx.createRadialGradient(n.x * w, n.y * h, 0, n.x * w, n.y * h, n.r);
      grd.addColorStop(0, `rgba(${n.color[0]},${n.color[1]},${n.color[2]},0.18)`);
      grd.addColorStop(0.5, `rgba(${n.color[0]},${n.color[1]},${n.color[2]},0.07)`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      bx.fillStyle = grd;
      bx.beginPath();
      bx.arc(n.x * w, n.y * h, n.r, 0, Math.PI * 2);
      bx.fill();
    });
    BG_STARS.forEach(s => {
      bx.globalAlpha = s.a;
      bx.fillStyle = '#ffffff';
      bx.beginPath();
      bx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      bx.fill();
    });
    bx.globalAlpha = 1;
  }
  return bgCacheCanvas;
}

/* ── Nebula blobs (fixed screen-space) ── */
const NEBULAS = [
  { x: 0.22, y: 0.38, r: 320, color: [0, 40, 120] },
  { x: 0.78, y: 0.22, r: 260, color: [60, 0, 130] },
  { x: 0.55, y: 0.72, r: 280, color: [0, 90, 70] },
  { x: 0.85, y: 0.65, r: 200, color: [100, 20, 0] },
];

export default function MapPage() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [selectedSightings, setSelectedSightings] = useState<Sighting[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const [prevZoom, setPrevZoom] = useState(1);
  const [clickOrigin, setClickOrigin] = useState<{ x: number; y: number } | null>(null);
  const [search, setSearch] = useState('');
  const [sightingIds, setSightingIds] = useState<Set<number>>(new Set());
  const [routeFrom, setRouteFrom] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [routePath, setRoutePath] = useState<number[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const graphRef = useRef<any>(null);

  /* Resolve system name or numeric ID string → node id */
  function resolveSystemId(nameOrId: string): number | null {
    const byId = graphData.nodes.find(n => String(n.id) === nameOrId);
    if (byId) return byId.id;
    const byName = graphData.nodes.find(n => n.name.toLowerCase() === nameOrId.toLowerCase());
    return byName?.id ?? null;
  }

  /* Client-side BFS using the map's own graph links (same data shown on screen) */
  function findRoute() {
    if (!routeFrom || !routeTo) return;
    setRouteLoading(true);
    setRouteError('');
    setRoutePath([]);
    const fromId = resolveSystemId(routeFrom);
    const toId = resolveSystemId(routeTo);
    if (!fromId || !toId) {
      setRouteError('System not found');
      setRouteLoading(false);
      return;
    }
    if (fromId === toId) {
      setRoutePath([fromId]);
      setRouteLoading(false);
      return;
    }
    // Build adjacency from currently displayed links
    const adj = new Map<number, number[]>();
    for (const l of graphData.links) {
      const src = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const tgt = typeof l.target === 'object' ? (l.target as any).id : l.target;
      if (!adj.has(src)) adj.set(src, []);
      if (!adj.has(tgt)) adj.set(tgt, []);
      adj.get(src)!.push(tgt);
      adj.get(tgt)!.push(src);
    }
    // BFS
    const visited = new Set<number>([fromId]);
    const parent = new Map<number, number>();
    const queue = [fromId];
    let found = false;
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const nb of (adj.get(cur) ?? [])) {
        if (visited.has(nb)) continue;
        visited.add(nb);
        parent.set(nb, cur);
        if (nb === toId) { found = true; break; }
        queue.push(nb);
      }
      if (found) break;
    }
    if (!found) {
      setRouteError('No route found');
      setRouteLoading(false);
      return;
    }
    const path: number[] = [];
    let cur = toId;
    while (cur !== fromId) { path.unshift(cur); cur = parent.get(cur)!; }
    path.unshift(fromId);
    setRoutePath(path);
    setRouteLoading(false);
  }

  /* Memoised route sets for canvas highlighting */
  const routeSet = useMemo(() => new Set(routePath), [routePath]);
  const routeEdgeSet = useMemo(() => {
    const s = new Set<string>();
    for (let i = 0; i < routePath.length - 1; i++) {
      s.add(`${routePath[i]}-${routePath[i + 1]}`);
      s.add(`${routePath[i + 1]}-${routePath[i]}`);
    }
    return s;
  }, [routePath]);

  /* Animation loop throttled to ~15 fps for pulse effects */
  useEffect(() => {
    let last = 0;
    const tick = (ts: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (ts - last < 66) return; // ~15 fps
      last = ts;
      frameRef.current = (frameRef.current + 1) % 120;
      graphRef.current?.refresh?.();
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  /* Load data */
  useEffect(() => {
    Promise.all([
      fetch('/api/systems?limit=600').then(r => r.json()),
      fetch('/api/sightings').then(r => r.json()),
    ]).then(([systems, sightings]: [SolarSystem[], Sighting[]]) => {
      const ids = new Set(sightings.map(s => s.systemId));
      setSightingIds(ids);
      const nodes: GraphNode[] = systems.map(s => {
        const fx = s.location?.x ? s.location.x / 1e15 : Math.random() * 1000;
        const fy = s.location?.y ? s.location.y / 1e15 : Math.random() * 1000;
        return {
          id: s.id,
          name: s.name,
          constellationId: s.constellationId,
          hasSighting: ids.has(s.id),
          x: fx, y: fy,
          fx, fy, // freeze positions — no force simulation movement
        };
      });
      // Build links: use gateLinks if available, otherwise proximity-based
      const nodeIds = new Set(nodes.map(n => n.id));
      const links: GraphLink[] = [];
      const hasGates = systems.some(s => s.gateLinks && s.gateLinks.length > 0);
      if (hasGates) {
        systems.forEach(s => {
          s.gateLinks?.forEach(t => {
            if (nodeIds.has(t) && s.id < t) links.push({ source: s.id, target: t });
          });
        });
      } else {
        // Group by constellation, connect K nearest within each group
        const byConst = new Map<number, typeof nodes>();
        nodes.forEach(n => {
          if (!byConst.has(n.constellationId)) byConst.set(n.constellationId, []);
          byConst.get(n.constellationId)!.push(n);
        });
        const edgeSet = new Set<string>();
        const addLink = (a: number, b: number) => {
          const key = a < b ? `${a}-${b}` : `${b}-${a}`;
          if (edgeSet.has(key)) return;
          edgeSet.add(key);
          links.push({ source: a, target: b });
        };
        const d2 = (a: { x?: number; y?: number }, b: { x?: number; y?: number }) =>
          ((a.x ?? 0) - (b.x ?? 0)) ** 2 + ((a.y ?? 0) - (b.y ?? 0)) ** 2;
        // Intra-constellation: 2 nearest
        for (const group of byConst.values()) {
          for (const n of group) {
            const near = group.filter(o => o.id !== n.id).sort((a, b) => d2(n, a) - d2(n, b)).slice(0, 2);
            near.forEach(o => addLink(n.id, o.id));
          }
        }
        // Cross-constellation: connect nearest pair between adjacent constellations
        const constIds = Array.from(byConst.keys());
        for (let i = 0; i < constIds.length; i++) {
          const gA = byConst.get(constIds[i])!;
          const crossDists: { d: number; a: number; b: number }[] = [];
          for (let j = i + 1; j < constIds.length; j++) {
            const gB = byConst.get(constIds[j])!;
            let best = Infinity, bA = 0, bB = 0;
            for (const a of gA.slice(0, 10)) {
              for (const b of gB.slice(0, 10)) {
                const dd = d2(a, b);
                if (dd < best) { best = dd; bA = a.id; bB = b.id; }
              }
            }
            crossDists.push({ d: best, a: bA, b: bB });
          }
          crossDists.sort((a, b) => a.d - b.d);
          crossDists.slice(0, 2).forEach(c => addLink(c.a, c.b));
        }
      }
      setGraphData({ nodes, links });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  /* Background: blit cached offscreen canvas (no redraw every frame) */
  const onRenderFramePre = useCallback((ctx: CanvasRenderingContext2D) => {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(getBgCache(w, h), 0, 0);
    ctx.restore();
  }, []);

  /* Node rendering — no shadowBlur, minimal gradients */
  const nodeCanvasObject = useCallback((
    node: object,
    ctx: CanvasRenderingContext2D,
    globalScale: number,
  ) => {
    const n = node as GraphNode & { x: number; y: number };
    const hasSighting = n.hasSighting;
    const isSelected = selected?.id === n.id;
    const pulse = (Math.sin(frameRef.current * 0.16) + 1) / 2; // 0–1

    const baseColor = hasSighting ? '#ff7700' : constellationColor(n.constellationId);
    const dotR = (hasSighting ? 3.5 : isSelected ? 3.2 : 2.2) / globalScale;

    // --- Outer glow halo (only for sightings + selected) ---
    if (hasSighting || isSelected) {
      const haloR = (hasSighting ? 16 : 12) / globalScale;
      const haloAlpha = hasSighting ? 0.22 + pulse * 0.15 : 0.28;
      const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, haloR);
      halo.addColorStop(0, hasSighting
        ? `rgba(255,100,0,${haloAlpha})`
        : `rgba(255,200,100,${haloAlpha})`);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(n.x, n.y, haloR, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Sighting pulse ring (cheap stroke, no gradient) ---
    if (hasSighting) {
      const ringR = (7 + pulse * 5) / globalScale;
      ctx.strokeStyle = `rgba(255,100,0,${0.45 - pulse * 0.35})`;
      ctx.lineWidth = 0.8 / globalScale;
      ctx.beginPath();
      ctx.arc(n.x, n.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // --- Main star dot (solid fill, no shadowBlur) ---
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.arc(n.x, n.y, dotR, 0, Math.PI * 2);
    ctx.fill();

    // --- Bright core (tiny highlight) ---
    ctx.fillStyle = hasSighting ? '#ffddaa' : '#d0e8ff';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(n.x, n.y, dotR * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // --- Route highlight ---
    if (routeSet.size > 0 && routeSet.has(n.id)) {
      // Outer glow halo
      const routeR = 14 / globalScale;
      const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, routeR);
      glow.addColorStop(0, 'rgba(34,197,94,0.35)');
      glow.addColorStop(1, 'rgba(34,197,94,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(n.x, n.y, routeR, 0, Math.PI * 2);
      ctx.fill();

      // Animated pulse ring
      const routePulse = (Math.sin(frameRef.current * 0.2) + 1) / 2;
      const pulseR = (8 + routePulse * 6) / globalScale;
      ctx.strokeStyle = `rgba(34,197,94,${0.6 - routePulse * 0.4})`;
      ctx.lineWidth = 1.2 / globalScale;
      ctx.beginPath();
      ctx.arc(n.x, n.y, pulseR, 0, Math.PI * 2);
      ctx.stroke();

      // Bright core diamond marker
      const dSize = 3 / globalScale;
      ctx.fillStyle = '#22c55e';
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-dSize, -dSize, dSize * 2, dSize * 2);
      ctx.restore();
    }

    // --- Label (only at high zoom) ---
    if (globalScale > 3.5) {
      const fs = 9 / globalScale;
      ctx.font = `${fs}px 'Share Tech Mono', monospace`;
      ctx.textAlign = 'left';
      ctx.fillStyle = isSelected ? '#ffffff'
        : hasSighting ? `rgba(255,180,80,0.9)`
        : `rgba(160,200,255,0.6)`;
      ctx.fillText(n.name, n.x + dotR + 1 / globalScale, n.y + fs * 0.35);
    }
  }, [selected, frameRef, routeSet]);

  /* Link rendering — skip when zoomed out (too many lines = lag) */
  const linkCanvasObject = useCallback((
    link: object,
    ctx: CanvasRenderingContext2D,
    globalScale: number,
  ) => {
    const l = link as { source: { x: number; y: number; id?: number } | number; target: { x: number; y: number; id?: number } | number };
    const src = (l.source as any).id ?? l.source;
    const tgt = (l.target as any).id ?? l.target;
    const isRoute = routeEdgeSet.size > 0 && routeEdgeSet.has(`${src}-${tgt}`);
    if (isRoute) {
      const ls = l.source as { x: number; y: number };
      const lt = l.target as { x: number; y: number };
      // Outer glow line
      ctx.strokeStyle = 'rgba(34,197,94,0.15)';
      ctx.lineWidth = 6 / globalScale;
      ctx.beginPath();
      ctx.moveTo(ls.x, ls.y);
      ctx.lineTo(lt.x, lt.y);
      ctx.stroke();
      // Main route line
      ctx.strokeStyle = 'rgba(34,197,94,0.9)';
      ctx.lineWidth = 2 / globalScale;
      ctx.beginPath();
      ctx.moveTo(ls.x, ls.y);
      ctx.lineTo(lt.x, lt.y);
      ctx.stroke();
      return;
    }
    if (globalScale < 1.5) return; // invisible at low zoom anyway
    const ls2 = l.source as { x: number; y: number };
    const lt2 = l.target as { x: number; y: number };
    if (!ls2?.x || !lt2?.x) return;
    ctx.strokeStyle = 'rgba(80, 140, 220, 0.18)';
    ctx.lineWidth = 0.5 / globalScale;
    ctx.beginPath();
    ctx.moveTo(ls2.x, ls2.y);
    ctx.lineTo(lt2.x, lt2.y);
    ctx.stroke();
  }, [routeEdgeSet]);

  function handleNodeClick(node: object) {
    const n = node as GraphNode & { x: number; y: number };
    const currentZoom = graphRef.current?.zoom() ?? 1;
    setPrevZoom(currentZoom);
    setSelected(n);
    setSelectedSightings([]);

    // Capture screen-space coords of the clicked star for the reveal animation
    const sc = graphRef.current?.graph2ScreenCoords?.(n.x, n.y);
    setClickOrigin(sc ? { x: sc.x, y: sc.y } : null);

    // Show panel immediately — clip-path circle(0) keeps it invisible until animated
    setShowDetail(true);

    // Zoom toward the star concurrently with the panel reveal
    const proxy = { zoom: currentZoom, cx: 0, cy: 0 };
    const graph = graphRef.current;
    if (graph) {
      const cc = graph.centerAt();
      proxy.cx = (cc as any)?.x ?? 0;
      proxy.cy = (cc as any)?.y ?? 0;
      animate(proxy, {
        zoom: 12,
        cx: n.x,
        cy: n.y,
        duration: 700,
        easing: 'easeInOutCubic',
        onUpdate: () => {
          graph.centerAt(proxy.cx, proxy.cy);
          graph.zoom(proxy.zoom);
        },
      });
    }

    fetch(`/api/sightings?systemId=${n.id}`).then(r => r.json()).then(setSelectedSightings);
  }

  function handleCloseDetail() {
    setShowDetail(false);
    const targetZoom = prevZoom < 2 ? 2 : prevZoom;
    const graph = graphRef.current;
    if (graph) {
      const proxy = { zoom: graph.zoom() ?? 12 };
      animate(proxy, {
        zoom: targetZoom,
        duration: 750,
        easing: 'easeOutCubic',
        onUpdate: () => graph.zoom(proxy.zoom),
        onComplete: () => setSelected(null),
      });
    } else {
      setTimeout(() => setSelected(null), 700);
    }
  }

  const displayNodes = search.trim()
    ? graphData.nodes.filter(n => n.name.toLowerCase().includes(search.toLowerCase()))
    : graphData.nodes;

  return (
    <div style={{ height: '100vh', background: 'var(--eve-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <EveNav />

      {/* Toolbar */}
      <div style={{
        padding: '0.6rem 1.5rem',
        background: 'rgba(8,8,6,0.92)',
        borderBottom: '1px solid var(--eve-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        backdropFilter: 'blur(4px)',
        zIndex: 20,
      }}>
        <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: '11px', letterSpacing: '0.14em', color: 'var(--eve-text)' }}>
          STAR MAP
        </span>
        <span style={{ background: 'rgba(255,71,0,0.12)', border: '1px solid rgba(255,71,0,0.35)', color: 'var(--eve-accent)', fontFamily: "'Exo 2', sans-serif", fontSize: '10px', letterSpacing: '0.1em', padding: '1px 8px' }}>
          {graphData.nodes.length} SYSTEMS
        </span>
        {sightingIds.size > 0 && (
          <span style={{ background: 'rgba(255,120,0,0.08)', border: '1px solid rgba(255,120,0,0.3)', color: '#ff8844', fontFamily: "'Exo 2', sans-serif", fontSize: '10px', letterSpacing: '0.1em', padding: '1px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Eye size={10} />
            {sightingIds.size} SIGHTINGS
          </span>
        )}

        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <Search size={11} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--eve-text-muted)' }} />
          <input
            placeholder="Search system..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'rgba(250,250,229,0.04)',
              border: '1px solid var(--eve-border)',
              color: 'var(--eve-text)',
              padding: '4px 10px 4px 26px',
              fontSize: '11px',
              outline: 'none',
              width: '200px',
              fontFamily: "'Share Tech Mono', monospace",
            }}
          />
        </div>
      </div>

      {/* Map container */}
      <div style={{ flex: 1, height: 0, position: 'relative', overflow: 'hidden', background: '#050503' }}>

        {loading ? (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem',
          }}>
            <div style={{
              width: '40px', height: '40px', border: '2px solid var(--eve-border)',
              borderTopColor: 'var(--eve-accent)', borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <span style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '11px', letterSpacing: '0.15em', color: 'var(--eve-text-muted)' }}>
              LOADING UNIVERSE...
            </span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            <ForceGraph2D
              ref={graphRef}
              graphData={{ nodes: displayNodes, links: graphData.links }}
              backgroundColor="#050503"
              nodeLabel=""
              nodeRelSize={1}
              linkDirectionalParticles={0}
              onRenderFramePre={onRenderFramePre}
              nodeCanvasObject={nodeCanvasObject}
              nodeCanvasObjectMode={() => 'replace'}
              nodePointerAreaPaint={(node, color, ctx, globalScale) => {
                const n = node as GraphNode & { x: number; y: number };
                ctx.fillStyle = color;
                ctx.beginPath();
                // 10px hit area regardless of zoom — much easier to click
                ctx.arc(n.x, n.y, Math.max(10 / globalScale, 3), 0, Math.PI * 2);
                ctx.fill();
              }}
              linkCanvasObject={linkCanvasObject}
              linkCanvasObjectMode={() => 'replace'}
              onNodeClick={handleNodeClick}
              enableNodeDrag={false}
              cooldownTicks={0}
              warmupTicks={0}
            />

            {/* Scanline overlay */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
              background: 'repeating-linear-gradient(transparent 0px, transparent 3px, rgba(0,0,0,0.05) 3px, rgba(0,0,0,0.05) 4px)',
            }} />

            {/* Vignette overlay */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4,
              background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.6) 100%)',
            }} />

            {/* Route Planner Panel */}
            <div style={{
              position: 'absolute', bottom: '1rem', left: '1rem', zIndex: 10,
              background: 'rgba(5,5,3,0.9)',
              border: '1px solid var(--eve-border)',
              padding: '0.75rem 1rem',
              minWidth: '240px',
            }}>
              <p style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '9px', letterSpacing: '0.15em', color: 'var(--eve-text-muted)', marginBottom: '0.6rem' }}>ROUTE PLANNER</p>
              <datalist id="systems-list">
                {graphData.nodes.map(n => <option key={n.id} value={n.name} />)}
              </datalist>
              <input
                list="systems-list"
                placeholder="From system..."
                value={routeFrom}
                onChange={e => setRouteFrom(e.target.value)}
                style={{
                  background: 'rgba(250,250,229,0.04)',
                  border: '1px solid var(--eve-border)',
                  color: 'var(--eve-text)',
                  padding: '4px 8px',
                  fontSize: '11px',
                  width: '100%',
                  fontFamily: "'Share Tech Mono', monospace",
                  marginBottom: '4px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <input
                list="systems-list"
                placeholder="To system..."
                value={routeTo}
                onChange={e => setRouteTo(e.target.value)}
                style={{
                  background: 'rgba(250,250,229,0.04)',
                  border: '1px solid var(--eve-border)',
                  color: 'var(--eve-text)',
                  padding: '4px 8px',
                  fontSize: '11px',
                  width: '100%',
                  fontFamily: "'Share Tech Mono', monospace",
                  marginBottom: '4px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <button
                onClick={findRoute}
                disabled={routeLoading || !routeFrom || !routeTo}
                style={{
                  background: 'rgba(255,71,0,0.12)',
                  border: '1px solid rgba(255,71,0,0.4)',
                  color: 'var(--eve-accent)',
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: '10px',
                  letterSpacing: '0.12em',
                  padding: '5px',
                  width: '100%',
                  cursor: routeLoading || !routeFrom || !routeTo ? 'not-allowed' : 'pointer',
                  marginTop: '6px',
                  opacity: routeLoading || !routeFrom || !routeTo ? 0.5 : 1,
                }}
              >
                FIND ROUTE
              </button>
              {routeLoading && (
                <p style={{ color: 'var(--eve-text-muted)', fontSize: '10px', marginTop: '6px', fontFamily: "'Exo 2', sans-serif", letterSpacing: '0.1em' }}>
                  CALCULATING...
                </p>
              )}
              {routeError && (
                <p style={{ color: '#ff4444', fontSize: '10px', marginTop: '6px', fontFamily: "'Share Tech Mono', monospace" }}>
                  {routeError}
                </p>
              )}
              {routePath.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <span style={{
                    background: 'rgba(34,197,94,0.15)',
                    border: '1px solid rgba(34,197,94,0.4)',
                    color: '#22c55e',
                    fontFamily: "'Exo 2', sans-serif",
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    padding: '2px 8px',
                  }}>
                    {routePath.length - 1} HOPS
                  </span>
                  <button
                    onClick={() => { setRoutePath([]); setRouteFrom(''); setRouteTo(''); setRouteError(''); graphRef.current?.refresh?.(); }}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--eve-border)',
                      color: 'var(--eve-text-muted)',
                      fontFamily: "'Exo 2', sans-serif",
                      fontSize: '9px',
                      letterSpacing: '0.1em',
                      padding: '2px 6px',
                      cursor: 'pointer',
                    }}
                  >
                    CLEAR
                  </button>
                </div>
              )}
            </div>

            {/* Legend */}
            <div style={{
              position: 'absolute', top: '1rem', right: '1rem', zIndex: 10,
              background: 'rgba(5,5,3,0.85)',
              border: '1px solid var(--eve-border)',
              backdropFilter: 'blur(4px)',
              padding: '0.75rem 1rem',
            }}>
              <p style={{ fontFamily: "'Exo 2', sans-serif", fontSize: '9px', letterSpacing: '0.15em', color: 'var(--eve-text-muted)', marginBottom: '0.6rem' }}>LEGEND</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {[
                  { color: '#4a8fff', glow: '#4a8fff', label: 'Solar System' },
                  { color: '#ff8844', glow: '#ff4400', label: 'Has Sightings', pulse: true },
                ].map(({ color, glow, label, pulse }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: pulse ? '#ff8844' : 'var(--eve-text-muted)' }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: color,
                      boxShadow: `0 0 6px ${glow}`,
                      flexShrink: 0,
                    }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Coordinates hint */}
            <div style={{
              position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 10,
              color: 'var(--eve-text-dim)', fontSize: '10px',
              fontFamily: "'Share Tech Mono', monospace",
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <Crosshair size={11} style={{ color: 'var(--eve-accent)' }} />
              SCROLL TO ZOOM · DRAG TO PAN · CLICK FOR INFO
            </div>

            {/* Star Detail Overlay */}
            {selected && showDetail && (
              <StarDetail
                node={selected}
                sightings={selectedSightings}
                onClose={handleCloseDetail}
                origin={clickOrigin ?? undefined}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
