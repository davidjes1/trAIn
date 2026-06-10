// mobile/m3-app.jsx — composes M3 mobile screens in the canvas + Tweaks

const { useEffect: useEffectApp } = React;

const SCREEN_W = 412, SCREEN_H = 892;
const DEVICE_W = 436, DEVICE_H = 916;

// Dynamic-color schemes — simulate Material You wallpaper extraction.
// Each overrides the primary/secondary/tertiary container roles.
const SCHEMES = {
  '#7fb0ff': { name: 'brand', dark:  { p:'#7fb0ff', op:'#062f5f', pc:'#214574', opc:'#d6e3ff', sc:'#3a4456', osc:'#d8e3f8', tc:'#433670', otc:'#e7deff' },
                              light: { p:'#2563eb', op:'#ffffff', pc:'#d8e2ff', opc:'#001a40', sc:'#dae2f9', osc:'#131c2b', tc:'#e9ddff', otc:'#23005c' } },
  '#a7d28b': { name: 'olive', dark:  { p:'#a7d28b', op:'#133800', pc:'#2a5010', opc:'#c3efa6', sc:'#43483b', osc:'#e0e4d2', tc:'#2f4f4d', otc:'#b1ece9' },
                              light: { p:'#3a6a1f', op:'#ffffff', pc:'#bbf29a', opc:'#072100', sc:'#dde7d0', osc:'#161e10', tc:'#bfeae6', otc:'#00201f' } },
  '#ffb4a8': { name: 'coral', dark:  { p:'#ffb4a8', op:'#5f150a', pc:'#7e2c1d', opc:'#ffdad2', sc:'#5d4038', osc:'#ffdbd1', tc:'#5c4400', otc:'#ffdf9e' },
                              light: { p:'#a13b2a', op:'#ffffff', pc:'#ffdad2', opc:'#3b0a02', sc:'#ffdbd1', osc:'#2c150f', tc:'#785a00', otc:'#ffdf9e' } },
  '#cdbdff': { name: 'lavender', dark:{ p:'#cdbdff', op:'#341c66', pc:'#4b367f', opc:'#e9ddff', sc:'#474155', osc:'#e4dff0', tc:'#5f3a52', otc:'#ffd8ec' },
                              light: { p:'#5e35b1', op:'#ffffff', pc:'#e9ddff', opc:'#21005d', sc:'#e4dff0', osc:'#1c182b', tc:'#ffd8ec', otc:'#36071f' } },
  '#ddc38c': { name: 'sand',  dark:  { p:'#ddc38c', op:'#3d2e04', pc:'#564419', opc:'#fbdfa6', sc:'#4c4639', osc:'#e9e2cf', tc:'#384b2f', otc:'#c8e9ac' },
                              light: { p:'#6d5c2e', op:'#ffffff', pc:'#fbdfa6', opc:'#231a00', sc:'#e9e2cf', osc:'#1c180c', tc:'#c8e9ac', otc:'#0a2000' } },
};
const VARS = ['p:--md-primary','op:--md-on-primary','pc:--md-primary-container','opc:--md-on-primary-container','sc:--md-secondary-container','osc:--md-on-secondary-container','tc:--md-tertiary-container','otc:--md-on-tertiary-container'];

const DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "dynamic": "#7fb0ff"
}/*EDITMODE-END*/;

function applyTweaks({ theme, dynamic }) {
  const scheme = SCHEMES[dynamic] || SCHEMES['#7fb0ff'];
  document.body.style.background = theme === 'light' ? '#dad9dd' : '#060708';
  document.querySelectorAll('.m3').forEach(el => {
    // theme (skip locked)
    if (!el.dataset.themeLocked) {
      el.classList.toggle('theme-light', theme === 'light');
    }
    const isLight = el.classList.contains('theme-light');
    const set = scheme[isLight ? 'light' : 'dark'];
    VARS.forEach(pair => { const [k, v] = pair.split(':'); el.style.setProperty(v, set[k]); });
  });
}

function observeTree(getT) {
  const mo = new MutationObserver(() => applyTweaks(getT()));
  mo.observe(document.body, { childList: true, subtree: true });
}

function TweaksRoot() {
  const [t, setT] = useTweaks(DEFAULTS);
  useEffectApp(() => { applyTweaks(t); }, [t.theme, t.dynamic]);
  useEffectApp(() => { observeTree(() => t); }, []);
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Theme">
        <TweakRadio label="Mode" value={t.theme} onChange={v => setT('theme', v)}
          options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} />
      </TweakSection>
      <TweakSection label="Material You">
        <TweakColor label="Dynamic color" value={t.dynamic} onChange={v => setT('dynamic', v)}
          options={Object.keys(SCHEMES)} />
      </TweakSection>
    </TweaksPanel>
  );
}

function App() {
  return (
    <>
      <TweaksRoot />
      <DesignCanvas>
        <DCSection id="onboarding" title="00 · Onboarding" subtitle="First run — connect watch">
          <DCArtboard id="onb" label="Onboarding · connect" width={SCREEN_W} height={SCREEN_H}><Onboarding /></DCArtboard>
        </DCSection>

        <DCSection id="today" title="01 · Today" subtitle="Framed hero · toggle Narrative ⇄ Metrics · FAB quick-log">
          <DCArtboard id="today-framed" label="Today · device frame" width={DEVICE_W} height={DEVICE_H}>
            <Device><Today inFrame /></Device>
          </DCArtboard>
          <DCArtboard id="today-light" label="Today · Light theme" width={SCREEN_W} height={SCREEN_H}>
            <M3ThemeCtx.Provider value="light"><Today /></M3ThemeCtx.Provider>
          </DCArtboard>
        </DCSection>

        <DCSection id="insights" title="02 · Insights" subtitle="Gemini chat + collapsible insight cards">
          <DCArtboard id="ins" label="Insights" width={SCREEN_W} height={SCREEN_H}><Insights /></DCArtboard>
        </DCSection>

        <DCSection id="plan" title="03 · Training calendar" subtitle="Tabs: Day · Week · Month · Form">
          <DCArtboard id="cal" label="Calendar" width={SCREEN_W} height={SCREEN_H}><Calendar /></DCArtboard>
        </DCSection>

        <DCSection id="workout" title="04 · Workout detail" subtitle="Endurance · Strength">
          <DCArtboard id="wo-end" label="Endurance" width={SCREEN_W} height={SCREEN_H}><WorkoutEndurance /></DCArtboard>
          <DCArtboard id="wo-str" label="Strength" width={SCREEN_W} height={SCREEN_H}><WorkoutStrength /></DCArtboard>
        </DCSection>

        <DCSection id="body" title="05 · Body trends" subtitle="Multi-metric · selectable timeframe">
          <DCArtboard id="bd" label="Body trends" width={SCREEN_W} height={SCREEN_H}><Body /></DCArtboard>
        </DCSection>

        <DCSection id="nutrition" title="06 · Nutrition" subtitle="Daily targets · add meal sheet">
          <DCArtboard id="nut" label="Nutrition" width={SCREEN_W} height={SCREEN_H}><Nutrition /></DCArtboard>
        </DCSection>

        <DCSection id="profile" title="07 · Profile & Goals" subtitle="Race calendar · zones · connections">
          <DCArtboard id="prof" label="Profile" width={SCREEN_W} height={SCREEN_H}><Profile /></DCArtboard>
        </DCSection>
      </DesignCanvas>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
