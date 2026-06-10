// mobile/m3-insights.jsx — Insights (Gemini chat + insight cards) Material 3

const { useState: useStateIn } = React;

function Insights({ inFrame }) {
  const [open, setOpen] = useStateIn(true);

  const overlay = (
    <div style={{ position: 'absolute', left: 12, right: 12, bottom: 92, zIndex: 12 }}>
      <div className="row g2" style={{ alignItems: 'center', background: 'var(--md-surface-c-high)', border: '1px solid var(--md-outline-variant)', borderRadius: 28, padding: 6, boxShadow: 'var(--el-2)' }}>
        <button className="btn icon" style={{ flex: '0 0 auto' }}><MIcon name="spark" size={20} style={{ color: 'var(--md-primary)' }} /></button>
        <span className="grow body-m" style={{ color: 'var(--md-on-surface-variant)' }}>Ask Gemini…</span>
        <button className="fab small" style={{ boxShadow: 'none', background: 'var(--md-primary)', color: 'var(--md-on-primary)', width: 44, height: 44, borderRadius: 14 }}><MIcon name="arrowUp" size={22} sw={2.5} /></button>
      </div>
    </div>
  );

  return (
    <Screen active="insights" inFrame={inFrame} overlay={overlay}>
      <div style={{ padding: '8px 16px 0' }}>
        <div className="between">
          <div>
            <div className="kicker">Insights · this week</div>
            <div className="headline" style={{ marginTop: 4 }}>Ask Gemini</div>
          </div>
          <button className="btn icon"><MIcon name="more" size={22} /></button>
        </div>
      </div>

      <div className="col g3" style={{ padding: '16px 16px 140px' }}>
        {/* Collapsible insight group */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <button className="between" onClick={() => setOpen(o => !o)} style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', borderBottom: open ? '1px solid var(--md-outline-variant)' : 'none' }}>
            <div className="row g2" style={{ alignItems: 'center' }}>
              <MIcon name={open ? 'chevDown' : 'chevRight'} size={18} style={{ color: 'var(--md-on-surface-variant)' }} />
              <span className="title-s">Insights · 3</span>
            </div>
            {!open ? (
              <div className="row g1" style={{ alignItems: 'center' }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--st-red)' }} />
                <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--st-green)' }} />
                <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--md-on-surface-variant)' }} />
              </div>
            ) : <span className="body-s">hide</span>}
          </button>

          {open && (
            <div className="col g2" style={{ padding: 14 }}>
              {/* Weekly review */}
              <div className="card-filled" style={{ padding: 14 }}>
                <div className="row g2" style={{ alignItems: 'center', marginBottom: 6 }}>
                  <span className="chip sm assist">Auto · weekly</span>
                  <span className="body-s">Apr 22–28</span>
                </div>
                <div className="title-s">You went 7% over plan — and recovered.</div>
                <div className="body-s" style={{ marginTop: 4 }}>TSS 412 (plan 384). CTL ↑2.1 · ATL ↑4.4 · TSB −12 → −8. Sleep held; HRV dipped Wed–Thu and recovered.</div>
                <div className="row g2" style={{ marginTop: 10 }}>
                  <button className="btn text sm">Expand</button>
                  <button className="btn text sm">Discuss ↗</button>
                </div>
              </div>
              {/* Anomaly */}
              <div className="card-filled" style={{ padding: 14, boxShadow: 'inset 0 0 0 1px var(--st-red-c)' }}>
                <span className="chip sm red" style={{ marginBottom: 6 }}><MIcon name="flag" size={11} /> Anomaly · HRV</span>
                <div className="title-s" style={{ marginTop: 6 }}>HRV in lowest 18% of 60-day window.</div>
                <div className="body-s" style={{ marginTop: 2 }}>3 consecutive days below baseline − 1σ.</div>
                <div style={{ height: 48, marginTop: 8 }}><Sparkline width={320} height={48} seed={11} tone="red" area /></div>
              </div>
              {/* Trend */}
              <div className="card-filled" style={{ padding: 14, boxShadow: 'inset 0 0 0 1px var(--st-green-c)' }}>
                <span className="chip sm green" style={{ marginBottom: 6 }}><MIcon name="spark" size={11} /> Trend · efficiency</span>
                <div className="title-s" style={{ marginTop: 6 }}>Pace / HR improving · +4% on 28d.</div>
                <div style={{ height: 44, marginTop: 8 }}><Sparkline width={320} height={44} seed={5} tone="green" area /></div>
              </div>
            </div>
          )}
        </div>

        {/* Existing conversation */}
        <div className="col g3" style={{ marginTop: 4 }}>
          <div style={{ alignSelf: 'flex-end', maxWidth: '82%' }}>
            <div style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)', padding: '10px 14px', borderRadius: '18px 18px 4px 18px', fontSize: 14, fontWeight: 500 }}>Should I race Saturday?</div>
            <div className="body-s" style={{ textAlign: 'right', marginTop: 4 }}>You · 07:38</div>
          </div>
          <div style={{ alignSelf: 'flex-start', maxWidth: '92%' }}>
            <div className="row g2" style={{ alignItems: 'center', marginBottom: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--md-tertiary-container)', color: 'var(--md-on-tertiary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MIcon name="spark" size={12} /></div>
              <span className="kicker">Gemini</span>
            </div>
            <div className="body-l" style={{ fontSize: 14.5, color: 'var(--md-on-surface)' }}>Probable yes. TSB will be ~+4 by Saturday on the current taper. HRV trend is recovering. Two caveats:</div>
            <ul style={{ margin: '8px 0 0 18px', padding: 0, color: 'var(--md-on-surface-variant)', fontSize: 14, lineHeight: 1.6 }}>
              <li>Sleep variance high — 3 nights under 7h.</li>
              <li>RHR baseline shifted +2 bpm; not yet stable.</li>
            </ul>
            {/* inline data card */}
            <div className="card-filled" style={{ padding: 14, marginTop: 12 }}>
              <div className="row g3" style={{ alignItems: 'center' }}>
                <ScoreRing value={71} size={68} thickness={6} label="" tone="amber" />
                <div className="col grow g1">
                  <div className="kicker">Race readiness · Sat</div>
                  <div className="display-num c-amber" style={{ fontSize: 22 }}>71</div>
                  <div style={{ height: 36 }}><Sparkline width={200} height={36} seed={7} tone="amber" area baseline={0.7} /></div>
                </div>
              </div>
            </div>
            <div className="row g2" style={{ marginTop: 12, flexWrap: 'wrap' }}>
              <button className="chip assist">Show TSB curve</button>
              <button className="chip assist">Compare to last race</button>
            </div>
          </div>
        </div>

        {/* Suggested prompts */}
        <div className="col g2" style={{ marginTop: 4 }}>
          <div className="kicker" style={{ paddingLeft: 2 }}>Suggested</div>
          {['Why is my HRV down this week?', 'Plan the next 2 weeks toward goal', 'What if I skip Friday?'].map(p => (
            <button key={p} className="card" style={{ padding: '12px 14px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, background: 'transparent' }}>
              <MIcon name="arrowRight" size={16} style={{ color: 'var(--md-outline)' }} />
              <span className="grow body-m" style={{ color: 'var(--md-on-surface)' }}>{p}</span>
            </button>
          ))}
        </div>
      </div>
    </Screen>
  );
}

Object.assign(window, { Insights });
