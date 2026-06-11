// mobile/m3-calendar.jsx — Training calendar (tabbed views) Material 3

const { useState: useStateCal } = React;

const SP_COLOR = { run: 'var(--sp-run)', ride: 'var(--sp-ride)', strength: 'var(--sp-strength)', swim: 'var(--sp-swim)', rest: 'var(--sp-rest)' };
const CAL_DAYS = [
  { day: 'Mon', date: 22, items: [{ sport: 'run', title: 'Easy run', mins: 50, tss: 48, load: 0.32, done: true }] },
  { day: 'Tue', date: 23, items: [{ sport: 'strength', title: 'Lower body', mins: 55, tss: 35, load: 0.25, done: true }] },
  { day: 'Wed', date: 24, items: [{ sport: 'ride', title: 'Z2 endurance', mins: 90, tss: 95, load: 0.65, done: true }] },
  { day: 'Thu', date: 25, items: [{ sport: 'run', title: 'Threshold 4×6', mins: 60, tss: 92, load: 0.72, done: true }] },
  { day: 'Fri', date: 26, items: [{ sport: 'rest', title: 'Recovery' }] },
  { day: 'Sat', date: 27, items: [{ sport: 'ride', title: 'Long ride', mins: 180, tss: 210, load: 0.95, done: true, pr: true }] },
  { day: 'Sun', date: 28, items: [{ sport: 'run', title: 'Brick · 30 min', mins: 30, tss: 32, load: 0.22, done: true }] },
  { day: 'Mon', date: 29, items: [{ sport: 'strength', title: 'Upper body', mins: 50, tss: 28, load: 0.18 }] },
  { day: 'Tue', date: 30, today: true, items: [{ sport: 'ride', title: 'Z2 ride', mins: 45, tss: 50, load: 0.34, ai: true }] },
  { day: 'Wed', date: 1, items: [{ sport: 'run', title: 'VO₂ 6×3', mins: 55, tss: 88, load: 0.7 }] },
  { day: 'Thu', date: 2, items: [{ sport: 'ride', title: 'Tempo 2×20', mins: 75, tss: 110, load: 0.82 }] },
  { day: 'Fri', date: 3, items: [{ sport: 'rest', title: 'Rest' }] },
  { day: 'Sat', date: 4, items: [{ sport: 'ride', title: 'Long ride', mins: 210, tss: 250, load: 1.0 }] },
  { day: 'Sun', date: 5, items: [{ sport: 'run', title: 'Long run', mins: 100, tss: 120, load: 0.85 }] },
];

function Calendar({ inFrame }) {
  const [view, setView] = useStateCal('day');
  const overlay = (
    <button className="fab" style={{ position: 'absolute', right: 16, bottom: 96, zIndex: 12 }}><MIcon name="plus" size={24} /></button>
  );
  return (
    <Screen active="plan" inFrame={inFrame} overlay={overlay}>
      <div style={{ padding: '8px 16px 0' }}>
        <div className="between">
          <div>
            <div className="kicker">Week 12 · Build 2</div>
            <div className="headline" style={{ marginTop: 4 }}>Training</div>
          </div>
          <button className="btn icon"><MIcon name="search" size={22} /></button>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <Tabs value={view} onChange={setView} items={[{ k: 'day', label: 'Day' }, { k: 'week', label: 'Week' }, { k: 'month', label: 'Month' }, { k: 'form', label: 'Form' }]} />
      </div>
      <div className="col g3" style={{ padding: '16px 16px 110px' }}>
        {view === 'day' && <CalDay />}
        {view === 'week' && <CalWeek />}
        {view === 'month' && <CalMonth />}
        {view === 'form' && <CalForm />}
      </div>
    </Screen>
  );
}

function TodayFocus() {
  return (
    <div className="card-filled" style={{ padding: 20, background: 'var(--md-surface-c-high)' }}>
      <div className="between" style={{ marginBottom: 14 }}>
        <span className="kicker c-primary">Today · 30 Apr</span>
        <span className="chip sm assist"><MIcon name="spark" size={11} /> AI</span>
      </div>
      <div className="row g3" style={{ alignItems: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'color-mix(in oklab, var(--st-blue) 18%, transparent)', color: 'var(--st-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><MIcon name="bike" size={26} /></div>
        <div className="grow">
          <div className="title-l">Z2 ride · 45 min</div>
          <div className="body-s" style={{ marginTop: 2 }}>130 TSS · HR 132–148</div>
        </div>
      </div>
      <div style={{ marginTop: 16, padding: 12, background: 'var(--md-surface-c)', borderRadius: 12 }}>
        <div className="kicker" style={{ marginBottom: 8 }}>Structure</div>
        <div style={{ display: 'flex', height: 26, gap: 1, borderRadius: 6, overflow: 'hidden' }}>
          {[[10,'var(--z1)'],[25,'var(--z2)'],[1.5,'var(--z3)'],[3,'var(--z2)'],[1.5,'var(--z3)'],[3,'var(--z2)'],[5,'var(--z1)']].map(([w,c],i) => <div key={i} style={{ flex: w, background: c }} />)}
        </div>
      </div>
      <div className="row g2" style={{ marginTop: 16 }}>
        <button className="btn filled grow"><MIcon name="play" size={18} /> Start</button>
        <button className="btn outlined">Move</button>
        <button className="btn outlined">Swap</button>
      </div>
    </div>
  );
}

function CalDay() {
  return (
    <>
      <TodayFocus />
      <div className="card" style={{ padding: 16 }}>
        <div className="kicker" style={{ marginBottom: 12 }}>Today's plan</div>
        <div className="col g2">
          {[['08:00','ride','Z2 ride · 45 min','130 TSS · planned'],['16:00','strength','Mobility · 10 min','habit']].map(([t,sp,title,meta],i) => (
            <div key={i} className="row g3" style={{ alignItems: 'flex-start' }}>
              <div className="num body-s" style={{ width: 40, paddingTop: 12 }}>{t}</div>
              <div className="grow card-filled" style={{ padding: 12 }}>
                <div className="row g2" style={{ alignItems: 'center' }}><SportChip sport={sp} size="sm" /><span className="title-s">{title}</span></div>
                <div className="body-s" style={{ marginTop: 4 }}>{meta}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function CalWeek() {
  const wk = CAL_DAYS.slice(7, 14);
  return (
    <>
      <div className="card" style={{ padding: 16 }}>
        <div className="between" style={{ marginBottom: 12 }}>
          <span className="title-s">This week</span>
          <span className="num body-s">558 TSS · 9h30</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 32 }}>
          {wk.map((d, i) => { const load = d.items.reduce((a, w) => a + (w.load || 0), 0); return <div key={i} style={{ flex: 1, height: `${Math.max(8, load * 100)}%`, background: d.today ? 'var(--md-primary)' : 'var(--md-on-surface-variant)', borderRadius: 3 }} />; })}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          {wk.map((d, i) => <div key={i} className="num" style={{ flex: 1, textAlign: 'center', fontSize: 10, color: d.today ? 'var(--md-primary)' : 'var(--md-outline)' }}>{d.day[0]}</div>)}
        </div>
      </div>
      <div className="col g2">
        {wk.map((d, i) => (
          <div key={i} className="card" style={{ padding: 14, background: d.today ? 'var(--md-surface-c-high)' : 'var(--md-surface)', borderColor: d.today ? 'var(--md-primary)' : 'var(--md-outline-variant)' }}>
            <div className="row g3" style={{ alignItems: 'center' }}>
              <div style={{ width: 42, textAlign: 'center' }}>
                <div className="label-s" style={{ color: d.today ? 'var(--md-primary)' : 'var(--md-on-surface-variant)' }}>{d.day}</div>
                <div className="display-num" style={{ fontSize: 19, marginTop: 2, color: d.today ? 'var(--md-primary)' : 'var(--md-on-surface)' }}>{d.date}</div>
              </div>
              <div className="grow col g1">
                {d.items.map((w, j) => (
                  <div key={j} className="row g2" style={{ alignItems: 'center' }}>
                    <SportChip sport={w.sport} size="sm" />
                    <div className="grow"><div className="title-s" style={{ color: w.sport === 'rest' ? 'var(--md-outline)' : 'var(--md-on-surface)' }}>{w.title}</div>{w.mins != null && <div className="body-s">{w.mins}m{w.tss ? ` · ${w.tss} TSS` : ''}</div>}</div>
                    {w.done && <MIcon name="check" size={16} style={{ color: 'var(--st-green)' }} />}
                    {d.today && !w.done && <button className="fab small" style={{ width: 36, height: 36, background: 'var(--md-primary)', color: 'var(--md-on-primary)', boxShadow: 'none' }}><MIcon name="play" size={16} /></button>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function CalMonth() {
  const cells = [];
  for (let i = 0; i < 35; i++) {
    const date = i - 2; const other = date < 1 || date > 30;
    const display = other ? (date < 1 ? 31 + date : date - 30) : date;
    let sport = null; if (!other) sport = CAL_DAYS[i % CAL_DAYS.length].items[0].sport;
    cells.push({ display, other, sport, today: date === 30 });
  }
  return (
    <>
      <div className="card" style={{ padding: 16 }}>
        <div className="between" style={{ marginBottom: 12 }}>
          <span className="title-s">April 2026</span>
          <div className="row g1"><button className="btn icon" style={{ width: 32, height: 32 }}><MIcon name="chevLeft" size={18} /></button><button className="btn icon" style={{ width: 32, height: 32 }}><MIcon name="chevRight" size={18} /></button></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
          {['M','T','W','T','F','S','S'].map((d, i) => <div key={i} className="num" style={{ textAlign: 'center', fontSize: 10, color: 'var(--md-outline)' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {cells.map((c, i) => (
            <div key={i} style={{ aspectRatio: '1', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: c.today ? 'color-mix(in oklab, var(--md-primary) 16%, transparent)' : 'transparent', color: c.other ? 'var(--md-outline)' : 'var(--md-on-surface)' }}>
              <span className="num" style={{ fontSize: 13, fontWeight: c.today ? 700 : 500, color: c.today ? 'var(--md-primary)' : 'inherit' }}>{c.display}</span>
              {c.sport && c.sport !== 'rest' && <span style={{ width: 6, height: 6, borderRadius: 99, background: SP_COLOR[c.sport] }} />}
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding: 16 }}>
        <div className="kicker" style={{ marginBottom: 10 }}>Sport</div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
          {[['run','Run'],['ride','Ride'],['strength','Strength'],['swim','Swim']].map(([k, n]) => <span key={k} className="row g1" style={{ alignItems: 'center' }}><span style={{ width: 8, height: 8, borderRadius: 99, background: SP_COLOR[k] }} /><span className="body-m">{n}</span></span>)}
        </div>
      </div>
    </>
  );
}

function CalForm() {
  return (
    <>
      <div className="card" style={{ padding: 16 }}>
        <div className="between" style={{ marginBottom: 12 }}>
          <span className="title-s">Form · 6 weeks</span>
          <div className="row g2"><span className="num c-green" style={{ fontSize: 13, fontWeight: 700 }}>64</span><span className="num c-amber" style={{ fontSize: 13, fontWeight: 700 }}>72</span><span className="num c-red" style={{ fontSize: 13, fontWeight: 700 }}>−8</span></div>
        </div>
        <FormCurve height={140} />
        <div className="row g3" style={{ marginTop: 8, fontSize: 11, color: 'var(--md-on-surface-variant)' }}>
          <span><span style={{ width: 12, height: 2, background: 'var(--st-green)', display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />TSB</span>
          <span><span style={{ width: 12, height: 2, background: 'var(--st-amber)', display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />ATL</span>
          <span><span style={{ width: 12, height: 2, background: 'var(--md-on-surface-variant)', display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />CTL</span>
        </div>
      </div>
      <div className="card" style={{ padding: 16 }}>
        <div className="kicker" style={{ marginBottom: 12 }}>Projection · race readiness</div>
        <div className="row g3" style={{ alignItems: 'center' }}>
          <ScoreRing value={71} size={72} thickness={6} label="" tone="amber" />
          <div className="col grow g1"><div className="display-num c-amber" style={{ fontSize: 22 }}>71 <span className="body-s">Sat</span></div><div className="body-s">TSB +4 by Sat · taper holds</div></div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { Calendar });
