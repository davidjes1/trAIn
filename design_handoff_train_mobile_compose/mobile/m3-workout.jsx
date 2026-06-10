// mobile/m3-workout.jsx — Workout detail (endurance + strength) Material 3

function WorkoutTopBar({ title, sport, meta }) {
  return (
    <div style={{ padding: '0 4px 0 8px' }}>
      <div className="appbar" style={{ padding: '0 4px' }}>
        <button className="btn icon"><MIcon name="chevLeft" size={24} /></button>
        <div className="grow" />
        <button className="btn icon"><MIcon name="refresh" size={22} /></button>
        <button className="btn icon"><MIcon name="more" size={22} /></button>
      </div>
      <div style={{ padding: '0 12px 8px' }}>
        <div className="row g2" style={{ alignItems: 'center', marginBottom: 6 }}>
          <SportChip sport={sport} size="sm" />
          <span className="body-s">{meta.date}</span>
        </div>
        <div className="headline">{title}</div>
        <div className="body-s num" style={{ marginTop: 4 }}>{meta.line}</div>
      </div>
    </div>
  );
}

// ── Endurance ────────────────────────────────────────────────
function WorkoutEndurance({ inFrame }) {
  return (
    <Screen active="plan" inFrame={inFrame} noNav>
      <WorkoutTopBar sport="ride" title="Long ride · Z2" meta={{ date: 'Sat · Apr 27 · 09:14', line: '3:02:48 · 76.4 km · 824 m ↑ · TSS 210' }} />
      <div className="col g3" style={{ padding: '8px 16px 28px' }}>
        {/* metric tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {[['HEART RATE','139','avg','amber'],['POWER','184','avg',''],['CADENCE','88','rpm','']].map(([l,v,u,t],i) => (
            <div key={i} className="card" style={{ padding: 12 }}>
              <div className="label-s on-variant">{l}</div>
              <div className="display-num" style={{ fontSize: 22, marginTop: 4, color: t === 'amber' ? 'var(--st-amber)' : 'var(--md-on-surface)' }}>{v}</div>
              <div className="body-s">{u}</div>
            </div>
          ))}
        </div>

        {/* Activity chart */}
        <div className="card" style={{ padding: 16 }}>
          <div className="between" style={{ marginBottom: 12 }}>
            <span className="title-s">Activity</span>
            <Segmented value="hr" onChange={() => {}} items={[{ k: 'hr', label: 'HR' }, { k: 'pwr', label: 'Pwr' }, { k: 'both', label: 'Both' }]} />
          </div>
          <div style={{ height: 130, position: 'relative' }}>
            <svg viewBox="0 0 340 130" preserveAspectRatio="none" width="100%" height="130">
              <rect x="0" y="42" width="340" height="40" fill="color-mix(in oklab, var(--st-green) 8%, transparent)" />
              <path d="M0,80 C30,58 70,46 120,40 S200,68 250,50 S310,36 340,46" fill="none" stroke="var(--md-primary)" strokeWidth="2.25" />
              <path d="M0,80 C30,58 70,46 120,40 S200,68 250,50 S310,36 340,46 L340,130 L0,130 Z" fill="color-mix(in oklab, var(--md-primary) 12%, transparent)" />
              {[80,160,250].map(x => <line key={x} x1={x} y1="0" x2={x} y2="130" stroke="var(--md-outline-variant)" strokeDasharray="2 4" />)}
            </svg>
          </div>
          <div className="between num" style={{ fontSize: 10, color: 'var(--md-outline)', marginTop: 4 }}><span>0:00</span><span>1:30</span><span>3:00</span></div>
        </div>

        {/* HR zones */}
        <div className="card" style={{ padding: 16 }}>
          <div className="title-s" style={{ marginBottom: 12 }}>HR zones · time in zone</div>
          <ZoneStack values={[0.08,0.55,0.22,0.12,0.03]} height={18} durations={['14m','1h40','40m','22m','6m']} />
        </div>

        {/* Map */}
        <div className="card" style={{ padding: 16 }}>
          <div className="between" style={{ marginBottom: 12 }}>
            <span className="title-s">Route</span>
            <span className="num body-s">824 m ↑</span>
          </div>
          <div style={{ height: 160, borderRadius: 12, overflow: 'hidden', position: 'relative', background: 'var(--md-surface-c-high)' }}>
            <svg viewBox="0 0 320 160" preserveAspectRatio="none" width="100%" height="100%">
              {[40,80,120].map(y => <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="var(--md-outline-variant)" strokeWidth="0.5" />)}
              {[60,140,220,280].map(x => <line key={x} x1={x} y1="0" x2={x} y2="160" stroke="var(--md-outline-variant)" strokeWidth="0.5" />)}
              <path d="M 30 120 C 70 100, 80 40, 130 48 S 210 120, 255 60 S 300 28, 308 16" fill="none" stroke="var(--md-primary)" strokeWidth="3" strokeLinecap="round" />
              <circle cx="30" cy="120" r="5" fill="var(--md-surface)" stroke="var(--md-primary)" strokeWidth="2.5" />
              <circle cx="308" cy="16" r="6" fill="var(--md-primary)" stroke="var(--md-surface)" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Laps */}
        <div className="card" style={{ padding: 16 }}>
          <div className="title-s" style={{ marginBottom: 8 }}>Laps · 6</div>
          {[[1,'Warm-up flat','12:18',124],[2,'Climb 1','21:42',152],[3,'Rolling tempo','34:08',144],[4,'Climb 2','28:31',158],[5,'Descent','46:12',132],[6,'Headwind','39:57',146]].map(r => (
            <div key={r[0]} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 64px 60px', alignItems: 'center', padding: '9px 0', borderTop: '1px solid var(--md-outline-variant)', fontSize: 13 }}>
              <span className="num on-variant" style={{ fontWeight: 700 }}>{r[0]}</span>
              <span>{r[1]}</span>
              <span className="num" style={{ textAlign: 'right' }}>{r[2]}</span>
              <span className="num on-variant" style={{ textAlign: 'right' }}>{r[3]} bpm</span>
            </div>
          ))}
        </div>

        {/* Segments */}
        <div className="card" style={{ padding: 16 }}>
          <div className="between" style={{ marginBottom: 8 }}>
            <div><span className="title-s">Segments</span><div className="body-s">2 new PRs</div></div>
            <button className="btn icon"><MIcon name="chevRight" size={20} /></button>
          </div>
          {[['Mill Road climb','8:42','−12s',true],['Bridge sprint','0:32','−02s',true],['Lake Lap','14:08','+04s',false]].map(([n,t,d,pr],i) => (
            <div key={i} className="row" style={{ alignItems: 'center', padding: '9px 0', borderTop: '1px solid var(--md-outline-variant)', fontSize: 13 }}>
              <span className="grow">{n}</span>
              <span className="num" style={{ width: 50 }}>{t}</span>
              <span className="num" style={{ width: 46, textAlign: 'right', color: d.startsWith('−') ? 'var(--st-green)' : 'var(--md-on-surface-variant)' }}>{d}</span>
              {pr && <span className="chip sm green" style={{ marginLeft: 8 }}><MIcon name="trophy" size={10} /> PR</span>}
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}

// ── Strength ────────────────────────────────────────────────
function WorkoutStrength({ inFrame }) {
  const exercises = [
    { name: 'Back Squat', pr: true, e1rm: 134, sets: [['WU',60,8,5,''],[1,100,5,7,''],[2,110,5,8,''],[3,115,5,8.5,'PR · clean'],[4,115,4,9,'']] },
    { name: 'Romanian Deadlift', sets: [[1,80,8,7,''],[2,90,8,7.5,''],[3,90,8,8,'L hip cranky']] },
    { name: 'Bulgarian Split Squat', sets: [[1,22,10,7,'/leg'],[2,22,10,7.5,'/leg'],[3,24,8,8,'/leg']] },
  ];
  return (
    <Screen active="plan" inFrame={inFrame} noNav>
      <WorkoutTopBar sport="strength" title="Lower body" meta={{ date: 'Tue · Apr 23 · 18:30', line: '55:12 · 18 sets · 5,420 kg · RPE 7.6' }} />
      <div className="col g3" style={{ padding: '8px 16px 28px' }}>
        {/* PR spotlight */}
        <div className="card-filled" style={{ padding: 20, background: 'color-mix(in oklab, var(--st-green) 10%, var(--md-surface-c-high))' }}>
          <div className="row g2" style={{ alignItems: 'center', marginBottom: 8 }}>
            <MIcon name="trophy" size={18} style={{ color: 'var(--st-green)' }} />
            <span className="kicker c-green">PR · Back Squat</span>
          </div>
          <div className="display-num c-green" style={{ fontSize: 40 }}>115<span className="body-m" style={{ marginLeft: 6 }}>kg × 5</span></div>
          <div className="body-s" style={{ marginTop: 4 }}>prev 110 kg × 5 · Apr 9 · est 1RM ~134 kg</div>
          <div style={{ height: 48, marginTop: 10 }}><Sparkline width={330} height={48} seed={9} tone="green" area dot /></div>
        </div>

        {/* metric tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {[['VOLUME','5,420','kg'],['SETS','18',''],['AVG RPE','7.6','']].map(([l,v,u],i) => (
            <div key={i} className="card" style={{ padding: 12 }}>
              <div className="label-s on-variant">{l}</div>
              <div className="display-num" style={{ fontSize: 20, marginTop: 4 }}>{v}</div>
              <div className="body-s">{u}</div>
            </div>
          ))}
        </div>

        {/* exercises */}
        {exercises.map(ex => (
          <div key={ex.name} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--md-outline-variant)' }}>
              <div className="row g2" style={{ alignItems: 'baseline' }}>
                <span className="title-m">{ex.name}</span>
                {ex.pr && <span className="chip sm green"><MIcon name="trophy" size={10} /> PR</span>}
              </div>
              <span className="label-m on-variant">{ex.sets.length} sets</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 50px 50px', padding: '8px 16px', background: 'var(--md-surface-c)', fontSize: 11 }} className="label-s on-variant">
              <span>SET</span><span>WEIGHT</span><span style={{ textAlign: 'right' }}>REPS</span><span style={{ textAlign: 'right' }}>RPE</span>
            </div>
            {ex.sets.map((s, i) => {
              const isPR = String(s[4]).includes('PR');
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 50px 50px', padding: '9px 16px', borderTop: '1px solid var(--md-outline-variant)', fontSize: 13, background: isPR ? 'color-mix(in oklab, var(--st-green) 10%, transparent)' : 'transparent', alignItems: 'center' }}>
                  <span className="num on-variant" style={{ fontWeight: 700 }}>{s[0]}</span>
                  <span className="num">{s[1]} <span style={{ color: 'var(--md-outline)', fontSize: 11 }}>kg{s[4] && !isPR ? ` · ${s[4]}` : ''}</span>{isPR && <span className="c-green" style={{ fontSize: 11 }}> · {s[4]}</span>}</span>
                  <span className="num" style={{ textAlign: 'right' }}>{s[2]}</span>
                  <span className="num" style={{ textAlign: 'right', color: s[3] >= 8.5 ? 'var(--st-amber)' : 'var(--md-on-surface-variant)' }}>{s[3]}</span>
                </div>
              );
            })}
          </div>
        ))}

        {/* notes */}
        <div className="card" style={{ padding: 16 }}>
          <div className="kicker" style={{ marginBottom: 8 }}>Notes</div>
          <div className="body-m" style={{ fontStyle: 'italic' }}>"Felt strong on squats. Left hip cranky on RDL — drop to 80 kg next session if it persists. PR felt clean."</div>
        </div>
      </div>
    </Screen>
  );
}

Object.assign(window, { WorkoutEndurance, WorkoutStrength });
