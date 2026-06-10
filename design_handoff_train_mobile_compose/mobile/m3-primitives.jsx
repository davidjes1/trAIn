// mobile/m3-primitives.jsx — Material 3 components + data viz + shells for trAIn

const { useMemo: useMemoM, useState: useStateM, useId: useIdM, useContext: useContextM, createContext: createContextM } = React;

const M3ThemeCtx = createContextM(null);
window.M3ThemeCtx = M3ThemeCtx;

// ============================================================
// Icons — line, currentColor, 1.75 stroke (Material symbols-ish)
// ============================================================
function MIcon({ name, size = 24, sw = 2, style, fill }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: fill || 'none', stroke: fill ? 'none' : 'currentColor', strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round', style };
  const paths = {
    today:     <><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4M8 14h3" /></>,
    insights:  <><path d="M21 12a8 8 0 1 1-3-6.2L21 4l-1 4.5A8 8 0 0 1 21 12z" /><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" /></>,
    plan:      <><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4" /><rect x="7" y="12" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" /></>,
    body:      <><path d="M22 12h-4l-3 9-6-18-3 9H2" /></>,
    you:       <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></>,
    search:    <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
    bell:      <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
    plus:      <><path d="M12 5v14M5 12h14" /></>,
    arrowUp:   <><path d="M12 19V5M5 12l7-7 7 7" /></>,
    arrowRight:<><path d="M5 12h14M13 5l7 7-7 7" /></>,
    chevDown:  <><path d="M6 9l6 6 6-6" /></>,
    chevRight: <><path d="M9 6l6 6-6 6" /></>,
    chevLeft:  <><path d="M15 6l-6 6 6 6" /></>,
    check:     <><path d="M20 6L9 17l-5-5" /></>,
    close:     <><path d="M18 6L6 18M6 6l12 12" /></>,
    heart:     <><path d="M12 21s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.6-9.5 9-9.5 9z" /></>,
    pulse:     <><path d="M3 12h4l2-6 4 12 2-6h6" /></>,
    bed:       <><path d="M3 18v-7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v7M3 14h18M7 11h3" /></>,
    battery:   <><rect x="2" y="7" width="16" height="10" rx="2.5" /><path d="M22 11v2" /></>,
    drop:      <><path d="M12 3s7 7.5 7 12a7 7 0 1 1-14 0c0-4.5 7-12 7-12z" /></>,
    flame:     <><path d="M12 22a7 7 0 0 0 4-13c-1.5 1-2 2-2 3 0-3-2-6-6-9 1 4-3 6-3 11a7 7 0 0 0 7 8z" /></>,
    moon:      <><path d="M21 12.8A8 8 0 1 1 11.2 3a6 6 0 0 0 9.8 9.8z" /></>,
    sun:       <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></>,
    bolt:      <><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></>,
    bike:      <><circle cx="6" cy="17" r="4" /><circle cx="18" cy="17" r="4" /><path d="M6 17l4-9h4l4 9M10 8h4" /></>,
    run:       <><circle cx="13" cy="4" r="2" /><path d="M5 21l3-6 4 2 3-6 5 4M9 11l-2-3-3 1" /></>,
    swim:      <><path d="M2 17c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M2 13c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" /></>,
    barbell:   <><path d="M3 9v6M7 7v10M21 9v6M17 7v10M7 12h10" /></>,
    weight:    <><rect x="3" y="6" width="18" height="12" rx="2.5" /><path d="M8 18v-3M16 18v-3M12 11v4M9 11h6" /></>,
    map:       <><path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" /></>,
    target:    <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /></>,
    settings:  <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
    play:      <><path d="M6 4l14 8-14 8z" fill="currentColor" stroke="none" /></>,
    refresh:   <><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" /></>,
    flag:      <><path d="M5 21V5a8 8 0 0 1 14 0H5z M5 13h14" /></>,
    spark:     <><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /></>,
    watch:     <><rect x="6" y="6" width="12" height="12" rx="3" /><path d="M9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 10v2.5l1.5 1" /></>,
    link:      <><path d="M9 15l6-6M11 6l1-1a4 4 0 0 1 6 6l-1 1M13 18l-1 1a4 4 0 0 1-6-6l1-1" /></>,
    dot:       <><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /></>,
    more:      <><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" /></>,
    edit:      <><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
    food:      <><path d="M5 3v8M3 3v5a2 2 0 0 0 2 2M7 3v5a2 2 0 0 1-2 2M16 3c-1.5 0-3 2-3 6 0 2 1 3 3 3v9M16 3v18" /></>,
    trophy:    <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /></>,
  };
  return <svg {...p}>{paths[name] ?? <circle cx="12" cy="12" r="7" />}</svg>;
}

// ============================================================
// Status bar
// ============================================================
function StatusBar({ time = '9:41' }) {
  return (
    <div className="statusbar">
      <span className="num">{time}</span>
      <div className="sb-icons">
        <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor"><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="4.5" y="5" width="3" height="7" rx="1"/><rect x="9" y="2.5" width="3" height="9.5" rx="1"/><rect x="13.5" y="0" width="3" height="12" rx="1"/></svg>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor"><path d="M8.5 11.5L.5 3.2a11 11 0 0116 0L8.5 11.5z"/></svg>
        <svg width="24" height="12" viewBox="0 0 24 12" fill="none"><rect x="0.5" y="0.5" width="20" height="11" rx="3" stroke="currentColor"/><rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor"/><rect x="21.5" y="4" width="1.5" height="4" rx="0.75" fill="currentColor"/></svg>
      </div>
    </div>
  );
}

// ============================================================
// Navigation bar — 5 destinations
// ============================================================
const NAV_DESTS = [
  ['today', 'Today', 'today'],
  ['insights', 'Insights', 'insights'],
  ['plan', 'Plan', 'plan'],
  ['body', 'Body', 'body'],
  ['you', 'You', 'you'],
];
function NavBar({ active = 'today' }) {
  return (
    <div className="navbar">
      {NAV_DESTS.map(([k, label, icon]) => (
        <button key={k} className={`dest ${active === k ? 'on' : ''}`}>
          <div className="ind"><MIcon name={icon} size={22} sw={active === k ? 2.25 : 1.9} /></div>
          <span className="lbl">{label}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================================
// Screen shell (frameless) — status bar + content + (optional) nav bar
// fab / sheet / snackbar render as overlays inside.
// ============================================================
function Screen({ children, active, noNav, time, inFrame, overlay }) {
  const ctxTheme = useContextM(M3ThemeCtx);
  return (
    <div className={`m3 m3-screen ${inFrame ? 'in-frame' : ''} ${ctxTheme ? `theme-${ctxTheme}` : ''}`} data-theme-locked={ctxTheme || undefined}>
      <StatusBar time={time} />
      <div className="scroll">{children}</div>
      {!noNav && <NavBar active={active} />}
      {overlay}
    </div>
  );
}

// ============================================================
// Device frame (dark) — wraps a Screen for the "hero" presentation
// ============================================================
function Device({ children, time }) {
  const ctxTheme = useContextM(M3ThemeCtx);
  return (
    <div className={`m3 m3-device ${ctxTheme ? `theme-${ctxTheme}` : ''}`} data-theme-locked={ctxTheme || undefined}>
      <div className="screen">
        {/* camera punch-hole */}
        <div style={{ position: 'absolute', left: '50%', top: 12, transform: 'translateX(-50%)', width: 11, height: 11, borderRadius: 99, background: '#000', zIndex: 30 }} />
        {children}
      </div>
    </div>
  );
}

// ============================================================
// App bar — small + large (collapsing)
// ============================================================
function AppBarSmall({ title, leading, actions, center }) {
  return (
    <div className="appbar">
      {leading}
      <div className="grow title-l nowrap" style={{ textAlign: center ? 'center' : 'left', paddingLeft: leading ? 0 : 4 }}>{title}</div>
      <div className="row g1">{actions}</div>
    </div>
  );
}

// ============================================================
// Segmented button (controlled)
// ============================================================
function Segmented({ items, value, onChange, fill }) {
  return (
    <div className={`seg ${fill ? 'fill' : ''}`}>
      {items.map(it => {
        const k = it.k ?? it;
        return (
          <button key={k} className={value === k ? 'on' : ''} onClick={() => onChange?.(k)}>
            {value === k && it.icon && <MIcon name="check" size={16} sw={2.5} />}
            {it.label ?? it}
          </button>
        );
      })}
    </div>
  );
}

// Tabs (scrollable)
function Tabs({ items, value, onChange }) {
  return (
    <div className="tabs" style={{ overflowX: 'auto' }}>
      {items.map(it => {
        const k = it.k ?? it;
        return <button key={k} className={`tab ${value === k ? 'on' : ''}`} onClick={() => onChange?.(k)}>{it.label ?? it}</button>;
      })}
    </div>
  );
}

// ============================================================
// Switch
// ============================================================
function Switch({ on, onChange }) {
  return <button className={`switch ${on ? 'on' : ''}`} onClick={() => onChange?.(!on)}><span className="knob" /></button>;
}

// ============================================================
// Score ring
// ============================================================
function ScoreRing({ value = 74, size = 132, label = 'READINESS', thickness = 10, tone, caption }) {
  const r = (size - thickness) / 2, c = 2 * Math.PI * r, off = c * (1 - value / 100);
  const color = tone === 'amber' ? 'var(--st-amber)' : tone === 'red' ? 'var(--st-red)' : tone === 'primary' ? 'var(--md-primary)'
    : value >= 67 ? 'var(--st-green)' : value >= 34 ? 'var(--st-amber)' : 'var(--st-red)';
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--md-surface-c-highest)" strokeWidth={thickness} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1, textAlign: 'center' }}>
        <div className="display-num" style={{ fontSize: size * 0.34, color }}>{value}</div>
        {label && <div className="kicker" style={{ marginTop: size * 0.04, fontSize: Math.max(9, size * 0.075) }}>{label}</div>}
        {caption && <div className="body-s" style={{ marginTop: 4 }}>{caption}</div>}
      </div>
    </div>
  );
}

// ============================================================
// Sparkline
// ============================================================
function Sparkline({ width = 140, height = 40, seed = 1, points = 28, tone, area = true, dot = true, baseline }) {
  const data = useMemoM(() => {
    let r = (seed * 9301 + 49297) % 233280; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    const a = []; let v = 0.5;
    for (let i = 0; i < points; i++) { v += (rnd() - 0.5) * 0.34; v = Math.max(0.1, Math.min(0.9, v)); a.push(v); }
    return a.map((p, i) => (p * 2 + (a[i-1] ?? p) + (a[i+1] ?? p)) / 4);
  }, [seed, points]);
  const stepX = width / (points - 1);
  const path = data.map((y, i) => `${i ? 'L' : 'M'} ${(i*stepX).toFixed(1)} ${(height - y*(height-6) - 3).toFixed(1)}`).join(' ');
  const last = { x: (points-1)*stepX, y: height - data[data.length-1]*(height-6) - 3 };
  const color = tone === 'green' ? 'var(--st-green)' : tone === 'amber' ? 'var(--st-amber)' : tone === 'red' ? 'var(--st-red)' : tone === 'primary' ? 'var(--md-primary)' : 'currentColor';
  const gid = `g${useIdM().replace(/:/g,'')}-${seed}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible', color }}>
      {area && <><defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.28" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <path d={`${path} L ${width} ${height} L 0 ${height} Z`} fill={`url(#${gid})`} /></>}
      {baseline != null && <line x1="0" y1={height - baseline*(height-6) - 3} x2={width} y2={height - baseline*(height-6) - 3} stroke="var(--md-outline)" strokeWidth="1" strokeDasharray="3 3" />}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {dot && <circle cx={last.x} cy={last.y} r="3.5" fill="var(--md-surface)" stroke={color} strokeWidth="2" />}
    </svg>
  );
}

// ============================================================
// Sub-factor tile
// ============================================================
function SubFactor({ icon, label, value, unit, delta, deltaTone, spark = 1, sparkTone, sub, large }) {
  const tone = deltaTone === 'good' ? 'var(--st-green)' : deltaTone === 'bad' ? 'var(--st-red)' : 'var(--md-on-surface-variant)';
  return (
    <div className="col" style={{ minWidth: 0 }}>
      <div className="row g1" style={{ alignItems: 'center', color: 'var(--md-on-surface-variant)' }}>
        {icon && <MIcon name={icon} size={14} sw={2} />}
        <span className="label-m">{label}</span>
      </div>
      <div className="row" style={{ alignItems: 'baseline', gap: 3, marginTop: 6 }}>
        <span className="display-num" style={{ fontSize: large ? 28 : 22 }}>{value}</span>
        {unit && <span className="num body-s">{unit}</span>}
      </div>
      <div style={{ height: large ? 36 : 28, marginTop: 4, color: 'var(--md-on-surface-variant)' }}>
        <Sparkline width={150} height={large ? 36 : 28} seed={spark} tone={sparkTone} area dot={false} />
      </div>
      <div className="between" style={{ marginTop: 4 }}>
        <span className="body-s">{sub}</span>
        {delta && <span className="num" style={{ fontSize: 11, color: tone, fontWeight: 600 }}>{delta}</span>}
      </div>
    </div>
  );
}

// ============================================================
// Macro ring
// ============================================================
function MacroRing({ size = 120, kcal = 1840, target = 2400, p = 0.62, c = 0.74, f = 0.51, thickness = 7 }) {
  const r1 = (size-thickness)/2, r2 = r1-thickness-2, r3 = r2-thickness-2;
  const arc = (r, frac, color) => { const C = 2*Math.PI*r; return (<><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--md-surface-c-highest)" strokeWidth={thickness} /><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*(1-frac)} transform={`rotate(-90 ${size/2} ${size/2})`} /></>); };
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
      <svg width={size} height={size}>{arc(r1, kcal/target, 'var(--md-primary)')}{arc(r2, p, 'var(--st-blue)')}{arc(r3, c, 'var(--st-amber)')}</svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.1 }}>
        <div className="display-num" style={{ fontSize: size * 0.18 }}>{kcal.toLocaleString()}</div>
        <div className="kicker" style={{ marginTop: 2, fontSize: 9 }}>/ {target.toLocaleString()}</div>
      </div>
    </div>
  );
}

// ============================================================
// Zone stack
// ============================================================
function ZoneStack({ values = [0.08,0.55,0.22,0.12,0.03], height = 18, labels = true, durations }) {
  const fills = ['var(--z1)','var(--z2)','var(--z3)','var(--z4)','var(--z5)'];
  const total = values.reduce((a,b)=>a+b,0);
  return (
    <div className="col g2">
      <div style={{ display: 'flex', height, borderRadius: 6, overflow: 'hidden', gap: 2, background: 'var(--md-surface-c-highest)' }}>
        {values.map((v,i)=><div key={i} style={{ flex: v/total, background: fills[i], opacity: v < 0.02 ? 0 : 1 }} />)}
      </div>
      {labels && <div className="between num" style={{ fontSize: 10, color: 'var(--md-on-surface-variant)' }}>
        {['Z1','Z2','Z3','Z4','Z5'].map((z,i)=>(<span key={z} className="col" style={{ alignItems: 'center', gap: 2 }}><span style={{ color: fills[i] }}>●</span><span>{z}</span>{durations && <span style={{ fontSize: 9 }}>{durations[i]}</span>}</span>))}
      </div>}
    </div>
  );
}

// ============================================================
// Form curve (CTL/ATL/TSB)
// ============================================================
function FormCurve({ height = 120 }) {
  return (
    <svg viewBox="0 0 800 120" preserveAspectRatio="none" width="100%" height={height} style={{ display: 'block' }}>
      <line x1="0" y1="60" x2="800" y2="60" stroke="var(--md-outline-variant)" strokeDasharray="3 4" />
      <path d="M0,72 C100,68 200,62 300,56 S500,42 700,36 L800,34" fill="none" stroke="var(--md-on-surface-variant)" strokeWidth="1.5" />
      <path d="M0,75 C80,60 160,40 240,52 S400,28 520,34 S680,22 800,28" fill="none" stroke="var(--st-amber)" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d="M0,68 C80,80 160,86 260,64 S420,82 540,78 S700,52 800,58" fill="none" stroke="var(--st-green)" strokeWidth="2.5" />
      <line x1="600" y1="0" x2="600" y2={height} stroke="var(--md-primary)" strokeWidth="1" strokeDasharray="2 3" />
    </svg>
  );
}

// ============================================================
// Sport chip
// ============================================================
function SportChip({ sport, size = 'md' }) {
  const map = {
    run: { c: 'var(--sp-run)', icon: 'run', label: 'Run' },
    ride: { c: 'var(--sp-ride)', icon: 'bike', label: 'Ride' },
    strength: { c: 'var(--sp-strength)', icon: 'barbell', label: 'Strength' },
    swim: { c: 'var(--sp-swim)', icon: 'swim', label: 'Swim' },
    rest: { c: 'var(--sp-rest)', icon: 'moon', label: 'Rest' },
  };
  const s = map[sport] || map.run; const small = size === 'sm';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: small ? '3px 8px' : '4px 10px', borderRadius: 8, background: `color-mix(in oklab, ${s.c} 18%, transparent)`, color: s.c, fontSize: small ? 11 : 12, fontWeight: 600 }}>
      <MIcon name={s.icon} size={small ? 12 : 13} sw={2} />
      {size !== 'sm' && <span>{s.label}</span>}
    </div>
  );
}

// ============================================================
// Habit row (M3 list item with leading checkbox)
// ============================================================
function HabitRow({ icon, label, done, streak, onToggle }) {
  return (
    <button onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '12px 14px', borderRadius: 14, background: done ? 'color-mix(in oklab, var(--md-primary) 12%, transparent)' : 'var(--md-surface-c-high)', border: 'none', textAlign: 'left' }}>
      <div style={{ width: 26, height: 26, borderRadius: 8, border: '2px solid', borderColor: done ? 'var(--md-primary)' : 'var(--md-outline)', background: done ? 'var(--md-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--md-on-primary)', flex: '0 0 auto' }}>
        {done && <MIcon name="check" size={15} sw={3} />}
      </div>
      {icon && <MIcon name={icon} size={18} style={{ color: done ? 'var(--md-primary)' : 'var(--md-on-surface-variant)' }} />}
      <span className="grow title-s" style={{ color: done ? 'var(--md-on-surface)' : 'var(--md-on-surface-variant)' }}>{label}</span>
      {streak > 0 && <span className="row g1" style={{ alignItems: 'center', color: 'var(--md-on-surface-variant)', fontSize: 12 }}><MIcon name="flame" size={13} /><span className="num">{streak}</span></span>}
    </button>
  );
}

// ============================================================
// Quick slider — M3 slider w/ value
// ============================================================
function QuickSlider({ label, value = 5, onChange, icon, max = 10, tone }) {
  const [v, setV] = useStateM(value);
  React.useEffect(() => setV(value), [value]);
  const color = tone === 'primary' ? 'var(--md-primary)' : 'var(--md-on-surface)';
  return (
    <div className="col g2">
      <div className="between">
        <div className="row g1" style={{ alignItems: 'center' }}>
          {icon && <MIcon name={icon} size={14} style={{ color: 'var(--md-on-surface-variant)' }} />}
          <span className="label-m">{label}</span>
        </div>
        <span className="num" style={{ fontSize: 14, fontWeight: 700 }}>{v}<span style={{ color: 'var(--md-outline)', fontWeight: 400 }}>/{max}</span></span>
      </div>
      <div style={{ position: 'relative', height: 24, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, background: 'var(--md-surface-c-highest)' }} />
        <div style={{ position: 'absolute', left: 0, height: 4, borderRadius: 2, background: color, width: `${(v/max)*100}%` }} />
        {Array.from({ length: max + 1 }).map((_, i) => (
          <button key={i} onClick={() => { setV(i); onChange?.(i); }} style={{ position: 'absolute', left: `${(i/max)*100}%`, transform: 'translateX(-50%)', width: i === v ? 18 : 4, height: i === v ? 18 : 4, borderRadius: 99, background: i === v ? color : (i < v ? color : 'var(--md-outline)'), border: i === v ? '3px solid var(--md-surface)' : 'none', boxShadow: i === v ? `0 0 0 1px ${color}` : 'none', padding: 0, transition: 'all 120ms' }} />
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  MIcon, StatusBar, NavBar, Screen, Device, AppBarSmall, Segmented, Tabs, Switch,
  ScoreRing, Sparkline, SubFactor, MacroRing, ZoneStack, FormCurve, SportChip, HabitRow, QuickSlider,
});
