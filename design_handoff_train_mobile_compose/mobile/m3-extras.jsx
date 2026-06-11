// mobile/m3-extras.jsx — Body trends · Nutrition · Profile · Onboarding (M3)

const { useState: useStateEx } = React;

// ════════════════════════════════════════════════════════════
// BODY TRENDS
// ════════════════════════════════════════════════════════════
const BODY_METRICS = [
  { key: 'weight', label: 'Weight', value: '74.2', unit: 'kg', delta: '−0.4', tone: 'green', spark: 14, color: 'var(--md-primary)' },
  { key: 'hrv',    label: 'HRV',    value: '48',   unit: 'ms', delta: '↓12%', tone: 'amber', spark: 11, color: 'var(--st-amber)' },
  { key: 'rhr',    label: 'Resting HR', value: '52', unit: 'bpm', delta: '+3', tone: 'amber', spark: 22, color: 'var(--st-blue)' },
  { key: 'sleep',  label: 'Sleep',  value: '7:12', unit: 'h', delta: '−0:34', tone: 'amber', spark: 7, color: 'var(--st-green)' },
];

function Body({ inFrame }) {
  const [tf, setTf] = useStateEx('3m');
  const [metric, setMetric] = useStateEx('weight');
  const m = BODY_METRICS.find(x => x.key === metric);
  return (
    <Screen active="body" inFrame={inFrame}>
      <div style={{ padding: '8px 16px 0' }}>
        <div className="between">
          <div><div className="kicker">Trends</div><div className="headline" style={{ marginTop: 4 }}>Body</div></div>
          <button className="btn icon"><MIcon name="more" size={22} /></button>
        </div>
      </div>
      <div className="col g3" style={{ padding: '16px 16px 110px' }}>
        {/* metric selector chips */}
        <div className="row g2" style={{ overflowX: 'auto', paddingBottom: 2 }}>
          {BODY_METRICS.map(x => (
            <button key={x.key} className={`chip ${metric === x.key ? 'selected' : 'assist'}`} onClick={() => setMetric(x.key)} style={{ flex: '0 0 auto' }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: x.color }} /> {x.label}
            </button>
          ))}
        </div>

        {/* big chart card */}
        <div className="card" style={{ padding: 16 }}>
          <div className="between" style={{ marginBottom: 4 }}>
            <div>
              <div className="kicker">{m.label}</div>
              <div className="row" style={{ alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span className="display-num" style={{ fontSize: 32 }}>{m.value}</span>
                <span className="num body-m">{m.unit}</span>
                <span className="num" style={{ fontSize: 13, color: m.tone === 'green' ? 'var(--st-green)' : 'var(--st-amber)', fontWeight: 600 }}>{m.delta}</span>
              </div>
            </div>
          </div>
          <div style={{ height: 150, marginTop: 8, color: m.color }}>
            <Sparkline width={344} height={150} seed={m.spark} tone={metric === 'weight' ? 'primary' : (m.tone === 'green' ? 'green' : 'amber')} area dot baseline={0.5} />
          </div>
          <div style={{ marginTop: 12 }}>
            <Segmented fill value={tf} onChange={setTf} items={[{ k: '1m', label: '1M' }, { k: '3m', label: '3M' }, { k: '6m', label: '6M' }, { k: '1y', label: '1Y' }]} />
          </div>
        </div>

        {/* anomaly marker card */}
        <div className="card" style={{ padding: 16, boxShadow: 'inset 0 0 0 1px var(--st-amber-c)' }}>
          <div className="row g2" style={{ alignItems: 'center', marginBottom: 6 }}>
            <span className="chip sm amber"><MIcon name="flag" size={11} /> Anomaly</span>
            <span className="body-s">Apr 24–28</span>
          </div>
          <div className="title-s">HRV dipped below baseline − 1σ for 3 days.</div>
          <div className="body-s" style={{ marginTop: 2 }}>Correlated with sleep variance and a hard Thursday session.</div>
        </div>

        {/* all-metrics grid */}
        <div className="card" style={{ padding: 16 }}>
          <div className="title-s" style={{ marginBottom: 14 }}>All metrics · 3M</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 16px' }}>
            {BODY_METRICS.map(x => (
              <SubFactor key={x.key} label={x.label.toUpperCase()} value={x.value} unit={x.unit} delta={x.delta} deltaTone={x.tone === 'green' ? 'good' : 'bad'} spark={x.spark} sparkTone={x.tone === 'green' ? 'green' : 'amber'} sub="3M trend" large />
            ))}
          </div>
        </div>
      </div>
    </Screen>
  );
}

// ════════════════════════════════════════════════════════════
// NUTRITION
// ════════════════════════════════════════════════════════════
function Nutrition({ inFrame }) {
  const [sheet, setSheet] = useStateEx(false);
  const overlay = (
    <>
      <button className="fab" style={{ position: 'absolute', right: 16, bottom: 96, zIndex: 12 }} onClick={() => setSheet(true)}><MIcon name="plus" size={24} /> Meal</button>
      {sheet && <><div className="scrim" onClick={() => setSheet(false)} /><AddMealSheet onClose={() => setSheet(false)} /></>}
    </>
  );
  return (
    <Screen active="body" inFrame={inFrame} overlay={overlay}>
      <div style={{ padding: '8px 16px 0' }}>
        <div className="between">
          <div><div className="kicker">Thu · Apr 30</div><div className="headline" style={{ marginTop: 4 }}>Nutrition</div></div>
          <button className="btn icon"><MIcon name="search" size={22} /></button>
        </div>
      </div>
      <div className="col g3" style={{ padding: '16px 16px 110px' }}>
        {/* day target */}
        <div className="card-filled" style={{ padding: 20, background: 'var(--md-surface-c-high)' }}>
          <div className="row g4" style={{ alignItems: 'center' }}>
            <MacroRing size={120} thickness={8} />
            <div className="col grow g3">
              {[['Protein','var(--st-blue)',92,150,'g'],['Carbs','var(--st-amber)',220,300,'g'],['Fat','var(--st-green)',48,70,'g']].map(([n,c,v,t,u]) => (
                <div key={n} className="col g1">
                  <div className="between">
                    <span className="row g2" style={{ alignItems: 'center' }}><span style={{ width: 8, height: 8, borderRadius: 99, background: c }} /><span className="body-m" style={{ color: 'var(--md-on-surface)' }}>{n}</span></span>
                    <span className="num body-s">{v}<span style={{ color: 'var(--md-outline)' }}>/{t}{u}</span></span>
                  </div>
                  <div style={{ height: 4, background: 'var(--md-surface-c-highest)', borderRadius: 2 }}><div style={{ height: '100%', width: `${(v/t)*100}%`, background: c, borderRadius: 2 }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* remaining */}
        <div className="row g3">
          {[['Eaten','1,840'],['Remaining','560'],['Burned','+420']].map(([l,v],i) => (
            <div key={i} className="card grow" style={{ padding: 14, textAlign: 'center' }}>
              <div className="label-s on-variant">{l.toUpperCase()}</div>
              <div className="display-num" style={{ fontSize: 20, marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* meals today */}
        <div className="card" style={{ padding: 16 }}>
          <div className="title-s" style={{ marginBottom: 8 }}>Today's meals</div>
          {[['Breakfast','Oats, berries, whey','520','food'],['Lunch','Chicken rice bowl','740','food'],['Snack','Banana + almonds','280','food'],['Dinner','—','—','plus']].map(([meal,desc,kcal,icon],i) => (
            <div key={i} className="list-item" style={{ borderTop: i ? '1px solid var(--md-outline-variant)' : 'none', padding: '12px 0' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--md-surface-c-high)', color: 'var(--md-on-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><MIcon name={icon} size={20} /></div>
              <div className="grow"><div className="title-s">{meal}</div><div className="body-s">{desc}</div></div>
              <span className="num body-m" style={{ color: kcal === '—' ? 'var(--md-outline)' : 'var(--md-on-surface)' }}>{kcal !== '—' ? `${kcal} kcal` : 'add'}</span>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}

function AddMealSheet({ onClose }) {
  return (
    <div className="sheet">
      <div className="handle" />
      <div className="between" style={{ marginBottom: 16 }}>
        <span className="title-l">Add meal</span>
        <button className="btn icon" onClick={onClose}><MIcon name="close" size={22} /></button>
      </div>
      <div className="col g4">
        <Field label="Meal name" value="Greek yogurt bowl" />
        <Field label="Calories" value="320" unit="kcal" mono />
        <div className="row g3">
          <Field label="Protein" value="24" unit="g" mono grow />
          <Field label="Carbs" value="38" unit="g" mono grow />
          <Field label="Fat" value="9" unit="g" mono grow />
        </div>
        <div className="row g2" style={{ marginTop: 4 }}>
          <button className="btn tonal grow" onClick={onClose}>Cancel</button>
          <button className="btn filled grow" onClick={onClose}>Save meal</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, unit, mono, grow }) {
  return (
    <div className={`col g1 ${grow ? 'grow' : ''}`} style={{ minWidth: 0 }}>
      <div className="label-m on-variant">{label}</div>
      <div style={{ border: '1px solid var(--md-outline)', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className={mono ? 'num' : ''} style={{ fontSize: 15, color: 'var(--md-on-surface)' }}>{value}</span>
        {unit && <span className="body-s">{unit}</span>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PROFILE / GOALS
// ════════════════════════════════════════════════════════════
function Profile({ inFrame }) {
  return (
    <Screen active="you" inFrame={inFrame}>
      <div style={{ padding: '8px 16px 0' }}>
        <div className="between">
          <div><div className="kicker">Profile</div><div className="headline" style={{ marginTop: 4 }}>You</div></div>
          <button className="btn icon"><MIcon name="settings" size={22} /></button>
        </div>
      </div>
      <div className="col g3" style={{ padding: '16px 16px 110px' }}>
        {/* identity */}
        <div className="card" style={{ padding: 16 }}>
          <div className="row g3" style={{ alignItems: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 99, background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 600 }}>A</div>
            <div className="grow"><div className="title-l">Adam Reyes</div><div className="body-s">Triathlon · strength · 34</div></div>
            <button className="btn icon"><MIcon name="edit" size={20} /></button>
          </div>
        </div>

        {/* next race */}
        <div className="card-filled" style={{ padding: 18, background: 'var(--md-surface-c-high)' }}>
          <div className="between" style={{ marginBottom: 10 }}>
            <span className="kicker c-primary">Next race · A</span>
            <span className="chip sm assist"><MIcon name="target" size={11} /> 45 days</span>
          </div>
          <div className="title-l">Olympic Tri · Wellington</div>
          <div className="body-s" style={{ marginTop: 2 }}>Jun 14 · 1.5k swim · 40k bike · 10k run</div>
          <div style={{ height: 6, background: 'var(--md-surface-c-highest)', borderRadius: 3, marginTop: 14 }}>
            <div style={{ width: '64%', height: '100%', background: 'var(--md-primary)', borderRadius: 3 }} />
          </div>
          <div className="between" style={{ marginTop: 6 }}><span className="body-s">Build 2 of 4</span><span className="num body-s">64% of plan</span></div>
        </div>

        {/* race calendar */}
        <div className="card" style={{ padding: 16 }}>
          <div className="title-s" style={{ marginBottom: 8 }}>Race calendar</div>
          {[['Jun 14','Olympic Tri · Wellington','A'],['Aug 02','Half marathon · Tauranga','B'],['Oct 18','70.3 · Taupō','A']].map(([d,n,p],i) => (
            <div key={i} className="list-item" style={{ borderTop: i ? '1px solid var(--md-outline-variant)' : 'none', padding: '12px 0' }}>
              <div className="num" style={{ width: 52, color: 'var(--md-on-surface-variant)', fontSize: 13 }}>{d}</div>
              <span className="grow title-s">{n}</span>
              <span className={`chip sm ${p === 'A' ? 'selected' : 'assist'}`}>{p}</span>
            </div>
          ))}
        </div>

        {/* HR zones */}
        <div className="card" style={{ padding: 16 }}>
          <div className="between" style={{ marginBottom: 12 }}>
            <span className="title-s">HR zones</span>
            <span className="body-s num">max 190 · rest 49</span>
          </div>
          <ZoneStack values={[0.2,0.2,0.2,0.2,0.2]} height={16} durations={['<114','114–133','133–152','152–171','171+']} />
          <button className="btn text sm" style={{ marginTop: 10, paddingLeft: 0 }}>Edit zones</button>
        </div>

        {/* connections */}
        <div className="card" style={{ padding: 16 }}>
          <div className="title-s" style={{ marginBottom: 8 }}>Connections</div>
          {[['Garmin','watch','Synced 2m ago',true],['Strava','link','Synced 14m ago',true],['Gemini','spark','Ready',true]].map(([n,icon,meta,on],i) => (
            <div key={i} className="list-item" style={{ borderTop: i ? '1px solid var(--md-outline-variant)' : 'none', padding: '12px 0' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--md-surface-c-high)', color: 'var(--md-on-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><MIcon name={icon} size={20} /></div>
              <div className="grow"><div className="title-s">{n}</div><div className="body-s"><span style={{ color: 'var(--st-green)' }}>●</span> {meta}</div></div>
              <Switch on={on} onChange={() => {}} />
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}

// ════════════════════════════════════════════════════════════
// ONBOARDING — connect watch
// ════════════════════════════════════════════════════════════
function Onboarding({ inFrame }) {
  return (
    <Screen active="today" inFrame={inFrame} noNav>
      <div className="col" style={{ height: '100%', padding: '12px 24px 32px' }}>
        {/* progress */}
        <div className="row g1" style={{ marginTop: 8 }}>
          {[1,1,0,0].map((on, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: on ? 'var(--md-primary)' : 'var(--md-surface-c-highest)' }} />)}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 8 }}>
          <div style={{ width: 96, height: 96, borderRadius: 28, background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <MIcon name="watch" size={48} sw={1.6} />
          </div>
          <div className="display-s">Connect your watch</div>
          <div className="body-l" style={{ maxWidth: 300 }}>trAIn reads HRV, sleep, resting HR and body battery to build your daily readiness. Nothing is shared.</div>
        </div>

        {/* providers */}
        <div className="col g2">
          {[['Garmin','watch',true],['Strava','link',false],['Apple Health','heart',false]].map(([n,icon,done],i) => (
            <button key={i} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', background: done ? 'color-mix(in oklab, var(--md-primary) 10%, transparent)' : 'var(--md-surface)', borderColor: done ? 'var(--md-primary)' : 'var(--md-outline-variant)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--md-surface-c-high)', color: 'var(--md-on-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><MIcon name={icon} size={22} /></div>
              <div className="grow"><div className="title-m">{n}</div><div className="body-s">{done ? 'Connected' : 'Tap to connect'}</div></div>
              {done ? <div style={{ width: 26, height: 26, borderRadius: 99, background: 'var(--md-primary)', color: 'var(--md-on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MIcon name="check" size={15} sw={3} /></div> : <MIcon name="chevRight" size={22} style={{ color: 'var(--md-outline)' }} />}
            </button>
          ))}
        </div>

        <div className="col g2" style={{ marginTop: 20 }}>
          <button className="btn filled" style={{ width: '100%', height: 52 }}>Continue</button>
          <button className="btn text" style={{ width: '100%' }}>Skip for now</button>
        </div>
      </div>
    </Screen>
  );
}

Object.assign(window, { Body, Nutrition, Profile, Onboarding });
