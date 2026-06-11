// mobile/m3-today.jsx — Today (Narrative + Metrics) Material 3

const { useState: useStateTd } = React;

const TD_READINESS = 74;
const TD_FACTORS = [
  { key: 'hrv',   icon: 'heart',   label: 'HRV',          value: '48',   unit: 'ms',  delta: '↓12%',   deltaTone: 'bad', spark: 11, sparkTone: 'amber', sub: 'base 54' },
  { key: 'rhr',   icon: 'pulse',   label: 'RESTING HR',   value: '52',   unit: 'bpm', delta: '+3',     deltaTone: 'bad', spark: 22, sparkTone: 'amber', sub: 'base 49' },
  { key: 'sleep', icon: 'bed',     label: 'SLEEP',        value: '7:12', unit: 'h',   delta: '−0:34',  deltaTone: 'bad', spark: 7,  sub: 'goal 7:45' },
  { key: 'batt',  icon: 'battery', label: 'BODY BATTERY', value: '58',   unit: '',    delta: '↓13',    deltaTone: 'bad', spark: 5,  sub: '7d avg 64' },
];
const TD_NARRATIVE = `HRV is down 12% on a 7-day baseline; resting HR +3 bpm. CTL/ATL favors recovery — last hard ride was 36h ago. Push hard tomorrow if HRV recovers.`;
const TD_HABITS = [
  { id: 'mob', label: 'Mobility · 10 min', icon: 'pulse', done: true, streak: 12 },
  { id: 'hyd', label: 'Hydrate · 3L', icon: 'drop', done: true, streak: 6 },
  { id: 'phone', label: 'No phone before 9am', icon: 'moon', done: false, streak: 0 },
  { id: 'read', label: 'Read · 20 min', icon: 'spark', done: false, streak: 3 },
  { id: 'mag', label: 'Magnesium · pm', icon: 'dot', done: false, streak: 9 },
];

function Today({ inFrame }) {
  const [view, setView] = useStateTd('narrative');
  const [sheet, setSheet] = useStateTd(null); // 'weight' | 'log' | null

  const overlay = (
    <>
      {/* Quick-log FAB */}
      <button className="fab" style={{ position: 'absolute', right: 16, bottom: 96, zIndex: 12 }} onClick={() => setSheet('log')}>
        <MIcon name="plus" size={24} /> Log
      </button>
      {sheet && <>
        <div className="scrim" onClick={() => setSheet(null)} />
        <QuickLogSheet onClose={() => setSheet(null)} />
      </>}
    </>
  );

  return (
    <Screen active="today" inFrame={inFrame} overlay={overlay}>
      {/* Header */}
      <div style={{ padding: '8px 16px 0' }}>
        <div className="between">
          <div className="grow">
            <div className="kicker">Thu · Apr 30</div>
            <div className="headline" style={{ marginTop: 4 }}>Good morning, Adam</div>
          </div>
          <button className="btn icon"><MIcon name="search" size={22} /></button>
          <button className="btn icon"><MIcon name="bell" size={22} /></button>
        </div>
        {/* Segmented toggle */}
        <div style={{ marginTop: 16 }}>
          <Segmented fill value={view} onChange={setView} items={[{ k: 'narrative', label: 'Narrative', icon: true }, { k: 'metrics', label: 'Metrics', icon: true }]} />
        </div>
      </div>

      <div className="col g3" style={{ padding: '16px 16px 24px' }}>
        {view === 'narrative' ? <TodayNarrative /> : <TodayMetrics />}
      </div>
    </Screen>
  );
}

function TodayNarrative() {
  return (
    <>
      {/* Hero: narrative + suggested workout */}
      <div className="card-filled" style={{ padding: 20, background: 'var(--md-surface-c-high)' }}>
        <div className="between" style={{ marginBottom: 12 }}>
          <div className="row g2" style={{ alignItems: 'center' }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--md-tertiary-container)', color: 'var(--md-on-tertiary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MIcon name="spark" size={15} /></div>
            <span className="kicker">Today · Gemini</span>
          </div>
          <span className="body-s">07:42</span>
        </div>
        <div className="body-l" style={{ fontSize: 17, color: 'var(--md-on-surface)' }}>{TD_NARRATIVE}</div>
        <hr className="divider" style={{ margin: '18px 0 16px' }} />
        <div className="between">
          <div>
            <div className="kicker" style={{ marginBottom: 4 }}>Suggested</div>
            <div className="title-m">Z2 ride · 45 min</div>
            <div className="body-s" style={{ marginTop: 2 }}>HR 132–148 · 130 TSS</div>
          </div>
          <SportChip sport="ride" size="sm" />
        </div>
        <div className="row g2" style={{ marginTop: 16 }}>
          <button className="btn filled grow"><MIcon name="play" size={18} /> Schedule</button>
          <button className="btn tonal">Why?</button>
          <button className="btn tonal-icon"><MIcon name="refresh" size={18} /></button>
        </div>
      </div>

      {/* Readiness band */}
      <div className="card" style={{ padding: 16 }}>
        <div className="between">
          <div className="row g3" style={{ alignItems: 'center' }}>
            <ScoreRing value={TD_READINESS} size={78} thickness={7} label="" />
            <div>
              <div className="kicker">Readiness</div>
              <div className="display-num c-green" style={{ fontSize: 30, marginTop: 2 }}>{TD_READINESS}</div>
              <div className="body-s">moderate</div>
            </div>
          </div>
          <button className="btn icon"><MIcon name="chevRight" size={22} /></button>
        </div>
      </div>

      {/* Recovery snapshot */}
      <div className="card" style={{ padding: 16 }}>
        <div className="between" style={{ marginBottom: 14 }}>
          <span className="title-s">Recovery snapshot</span>
          <span className="body-s">7d</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 16px' }}>
          {TD_FACTORS.map(f => <SubFactor key={f.key} {...f} />)}
        </div>
      </div>

      <TodayHabits />
      <TodayCheckin />
      <TodayNutritionWeight />
    </>
  );
}

function TodayMetrics() {
  return (
    <>
      {/* Big readiness */}
      <div className="card-filled" style={{ padding: 22, background: 'var(--md-surface-c-high)' }}>
        <div className="row" style={{ alignItems: 'center', gap: 18 }}>
          <ScoreRing value={TD_READINESS} size={116} thickness={9} />
          <div className="col grow g1">
            <div className="kicker c-green">moderate</div>
            <div className="body-m" style={{ marginTop: 4, color: 'var(--md-on-surface)' }}>HRV down 12%; favors aerobic. Push hard tomorrow.</div>
          </div>
        </div>
      </div>

      {/* Recovery grid with timeframe */}
      <div className="card" style={{ padding: 16 }}>
        <div className="between" style={{ marginBottom: 14 }}>
          <span className="title-s">Recovery</span>
          <div className="seg" style={{ height: 32 }}>
            {['7d','14d','28d'].map((t, i) => <button key={t} className={i === 0 ? 'on' : ''} style={{ fontSize: 12, padding: '0 12px' }}>{t}</button>)}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 16px' }}>
          {TD_FACTORS.map(f => <SubFactor key={f.key} {...f} large />)}
        </div>
      </div>

      {/* AI workout */}
      <div className="card" style={{ padding: 16 }}>
        <div className="between" style={{ marginBottom: 12 }}>
          <span className="kicker">AI · Today's workout</span>
          <span className="body-s">conf 0.82</span>
        </div>
        <div className="row g3" style={{ alignItems: 'center' }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'color-mix(in oklab, var(--st-blue) 18%, transparent)', color: 'var(--st-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><MIcon name="bike" size={24} /></div>
          <div className="grow">
            <div className="title-m">Z2 ride · 45 min</div>
            <div className="body-s" style={{ marginTop: 2 }}>HR 132–148 · cadence 85–95 · 130 TSS</div>
          </div>
        </div>
        <div className="row g2" style={{ marginTop: 14 }}>
          <button className="btn filled grow">Start</button>
          <button className="btn outlined">Swap</button>
        </div>
      </div>

      {/* Narrative compact */}
      <div className="card" style={{ padding: 16 }}>
        <div className="kicker" style={{ marginBottom: 8 }}>Gemini · narrative</div>
        <div className="body-m" style={{ fontSize: 13.5 }}>{TD_NARRATIVE}</div>
      </div>

      <TodayHabits />
      <TodayCheckin />
      <TodayNutritionWeight />
    </>
  );
}

function TodayHabits() {
  const [habits, setHabits] = useStateTd(TD_HABITS);
  const done = habits.filter(h => h.done).length;
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="between" style={{ marginBottom: 12 }}>
        <span className="title-s">Habits</span>
        <span className="num body-s"><span style={{ color: 'var(--md-on-surface)', fontWeight: 700 }}>{done}</span>/{habits.length}</span>
      </div>
      <div className="col g2">
        {habits.map((h, i) => <HabitRow key={h.id} {...h} onToggle={() => { const n = [...habits]; n[i] = { ...h, done: !h.done }; setHabits(n); }} />)}
      </div>
    </div>
  );
}

function TodayCheckin() {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="between" style={{ marginBottom: 16 }}>
        <span className="title-s">Check-in</span>
        <span className="body-s">how do you feel?</span>
      </div>
      <div className="col g5">
        <QuickSlider label="MOOD" icon="sun" value={6} tone="primary" />
        <QuickSlider label="ENERGY" icon="bolt" value={5} />
        <QuickSlider label="STRESS" icon="pulse" value={4} />
      </div>
    </div>
  );
}

function TodayNutritionWeight() {
  return (
    <div className="row g3">
      <div className="card grow" style={{ padding: 16 }}>
        <div className="between" style={{ marginBottom: 12 }}>
          <span className="title-s">Nutrition</span>
          <button className="btn text sm"><MIcon name="plus" size={14} /></button>
        </div>
        <div className="row g3" style={{ alignItems: 'center' }}>
          <MacroRing size={84} thickness={6} />
          <div className="col grow g2" style={{ fontSize: 12 }}>
            {[['Protein','var(--st-blue)','92','150'],['Carbs','var(--st-amber)','220','300'],['Fat','var(--st-green)','48','70']].map(([n,c,v,t]) => (
              <div key={n} className="col g1">
                <div className="between"><span className="row g1" style={{ alignItems: 'center' }}><span style={{ width: 6, height: 6, borderRadius: 99, background: c }} /><span className="body-s">{n}</span></span><span className="num" style={{ color: 'var(--md-on-surface)' }}>{v}<span style={{ color: 'var(--md-outline)' }}>/{t}</span></span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card" style={{ padding: 16, width: 124 }}>
        <div className="between" style={{ marginBottom: 10 }}>
          <span className="title-s">Weight</span>
          <MIcon name="weight" size={15} style={{ color: 'var(--md-outline)' }} />
        </div>
        <div className="display-num" style={{ fontSize: 24 }}>74.2</div>
        <div className="body-s" style={{ marginTop: 2 }}><span className="c-green">−0.4</span> 7d</div>
        <div style={{ marginTop: 8 }}><Sparkline width={92} height={30} seed={14} tone="green" area dot={false} /></div>
        <button className="btn tonal sm" style={{ marginTop: 10, width: '100%' }}>Log</button>
      </div>
    </div>
  );
}

// Quick-log bottom sheet
function QuickLogSheet({ onClose }) {
  const items = [
    ['weight', 'Weight', 'weight'],
    ['meal', 'Meal', 'food'],
    ['mood', 'Mood & energy', 'sun'],
    ['workout', 'Workout', 'pulse'],
    ['note', 'Note for Gemini', 'spark'],
  ];
  return (
    <div className="sheet">
      <div className="handle" />
      <div className="between" style={{ marginBottom: 12 }}>
        <span className="title-l">Quick log</span>
        <button className="btn icon" onClick={onClose}><MIcon name="close" size={22} /></button>
      </div>
      <div className="col g1">
        {items.map(([k, label, icon]) => (
          <button key={k} className="list-item" style={{ padding: '12px 8px', background: 'none', border: 'none', borderRadius: 12, textAlign: 'left' }}>
            <div style={{ width: 40, height: 40, borderRadius: 99, background: 'var(--md-surface-c-high)', color: 'var(--md-on-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><MIcon name={icon} size={20} /></div>
            <span className="grow title-s">{label}</span>
            <MIcon name="chevRight" size={20} style={{ color: 'var(--md-outline)' }} />
          </button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Today });
