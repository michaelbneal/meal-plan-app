// Generates the three iOS layout artboards (Main = iPad portrait, iPhone, iPadLandscape)
// plus canvas.json. Every visual value is lifted from the React source:
//   frontend/src/App.jsx, index.css, components/{MealPlan,BudgetBar,Pushpin,WashiTape}.jsx
// Per-frame sizing lives in FRAMES below; everything else is shared markup.
// Run: node generate.mjs   (from design/ios-layout)
import { readFileSync, writeFileSync } from 'fs';

const plan = JSON.parse(readFileSync('plan.json', 'utf8'));
const grocery = JSON.parse(readFileSync('grocery.json', 'utf8'));
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['breakfast', 'lunch', 'dinner'];
const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const MEAL_ACCENT = { breakfast: '#eaa221', lunch: '#d4920f', dinner: '#c07e0a' }; // MealPlan.jsx MEAL_CONFIG
const BUDGET = 100;
const WEEKLY = grocery.estimatedTotal ?? plan.weeklyTotal;
const money = n => `$${(Math.round(n * 100) / 100).toFixed(2)}`;

// ─── Frame specs: the proposed sizing per device ──────────────────────────────
// `current` notes describe what the app does today at that width (for the notes).
const FRAMES = {
  Main: {
    file: 'Main.dc.html', title: 'iPad portrait · 820×1180', w: 820, h: 4300, fold: 1180,
    insetTop: 24, insetBottom: 20,
    title_px: 104, fresh: 28, freshTrack: '0.38em', shopLbl: 30, shop: 26,
    taglines: 'row', tagFont: 20, tomato: 30,
    welcome: 52, blurb: 17, modeCols: 3, modeLabel: 19, modeBlurb: 19,
    controls: 'grid-4-2', ctrlLabel: 24, ctrlFont: 20, ctrlH: 46, ctaFont: 26, ctaH: 66,
    tabFont: 18, tabPad: '10px 14px', status: true,
    budget: 'two', priceFont: 60,
    craving: 30,
    grid: 'transpose', rowLabel: 26, cardPad: '42px 14px 12px', cardMinH: 168, cardName: 17, cardPrice: 28, dayLabelCol: 96, totalCol: 96,
  },
  iPhone: {
    file: 'iPhone.dc.html', title: 'iPhone · 390×844', w: 390, h: 6000, fold: 844,
    insetTop: 59, insetBottom: 34,
    title_px: 60, fresh: 20, freshTrack: '0.3em', shopLbl: 24, shop: 20,
    taglines: 'stack', tagFont: 16, tomato: 22,
    welcome: 40, blurb: 16, modeCols: 1, modeLabel: 18, modeBlurb: 17,
    controls: 'grid-2', ctrlLabel: 18, ctrlFont: 18, ctrlH: 44, ctaFont: 22, ctaH: 56,
    tabFont: 14, tabPad: '8px 12px', status: false,
    budget: 'stack', priceFont: 48,
    craving: 24,
    grid: 'two-col', rowLabel: 30, cardPad: '36px 12px 10px', cardMinH: 150, cardName: 16, cardPrice: 26,
  },
  iPadLandscape: {
    file: 'iPadLandscape.dc.html', title: 'iPad landscape · 1180×820', w: 1180, h: 2650, fold: 820,
    insetTop: 24, insetBottom: 20,
    title_px: 120, fresh: 32, freshTrack: '0.38em', shopLbl: 30, shop: 26,
    taglines: 'row', tagFont: 20, tomato: 32,
    welcome: 56, blurb: 17, modeCols: 3, modeLabel: 19, modeBlurb: 19,
    controls: 'row', ctrlLabel: 26, ctrlFont: 22, ctrlH: 46, ctaFont: 26, ctaH: 66,
    tabFont: 20, tabPad: '10px 16px', status: true,
    budget: 'row', priceFont: 68,
    craving: 32,
    grid: 'desktop', rowLabel: 30, cardPad: '40px 12px 10px', cardMinH: 168, cardName: 16, cardPrice: 26, labelCol: 160, gridGap: 6,
  },
};

// ─── Texture helpers (SVG data URIs, unquoted-url safe) ───────────────────────
const enc = s => encodeURIComponent(s).replace(/[()']/g, c => '%' + c.charCodeAt(0).toString(16));
const svgUrl = s => `url(data:image/svg+xml,${enc(s)})`;

// index.css body noise
const bodyNoise = svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.12  0 0 0 0 0.08  0 0 0 0 0.04  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='0.55'/></svg>`);
// MealPlan.jsx cork layers
const corkDust = svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='d'><feTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' seed='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.30  0 0 0 0 0.20  0 0 0 0 0.09  0 0 0 0.40 -0.05'/></filter><rect width='240' height='240' filter='url(#d)'/></svg>`);
const corkFleck = svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='0.35' numOctaves='3' seed='11' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.22  0 0 0 0 0.13  0 0 0 0 0.05  0 0 0 0.65 -0.20'/></filter><rect width='320' height='320' filter='url(#f)'/></svg>`);
const corkChunk = svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420'><filter id='c'><feTurbulence type='fractalNoise' baseFrequency='0.09' numOctaves='2' seed='17' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.18  0 0 0 0 0.10  0 0 0 0 0.03  0 0 0 0.55 -0.30'/></filter><rect width='420' height='420' filter='url(#c)'/></svg>`);
// App.jsx controls-panel weave
const weave = (id, freq, seed, a) => svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='${id}'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='2' seed='${seed}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncR type='linear' slope='0.45' intercept='0'/><feFuncG type='linear' slope='0.38' intercept='0'/><feFuncB type='linear' slope='0.25' intercept='0'/><feFuncA type='linear' slope='${a}' intercept='0'/></feComponentTransfer></filter><rect width='220' height='220' filter='url(#${id})'/></svg>`);
const warp = weave('warp', '0.9 0.04', 7, 0.55), weft = weave('weft', '0.04 0.9', 12, 0.5);
const slub = svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='slub'><feTurbulence type='fractalNoise' baseFrequency='0.012 0.018' numOctaves='3' seed='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncR type='linear' slope='0.3' intercept='0'/><feFuncG type='linear' slope='0.22' intercept='0'/><feFuncB type='linear' slope='0.14' intercept='0'/><feFuncA type='linear' slope='0.35' intercept='0'/></feComponentTransfer></filter><rect width='300' height='300' filter='url(#slub)'/></svg>`);
// BudgetBar.jsx paper
const crumple = svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='200'><filter id='crumple'><feTurbulence type='fractalNoise' baseFrequency='0.04 0.06' numOctaves='5' seed='8' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncR type='linear' slope='0.2' intercept='0'/><feFuncG type='linear' slope='0.16' intercept='0'/><feFuncB type='linear' slope='0.1' intercept='0'/><feFuncA type='linear' slope='0.5' intercept='0'/></feComponentTransfer></filter><rect width='600' height='200' filter='url(#crumple)'/></svg>`);
const fibers = svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='fibers'><feTurbulence type='fractalNoise' baseFrequency='0.5 0.02' numOctaves='3' seed='12' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncR type='linear' slope='0.08' intercept='0'/><feFuncG type='linear' slope='0.06' intercept='0'/><feFuncB type='linear' slope='0.04' intercept='0'/><feFuncA type='linear' slope='0.2' intercept='0'/></feComponentTransfer></filter><rect width='400' height='400' filter='url(#fibers)'/></svg>`);
// WashiTape.jsx grain
const grain = svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='40'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.1  0 0 0 0 0.06  0 0 0 0 0.02  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(#g)' opacity='0.45'/></svg>`);

// ─── Fonts (index.html) ───────────────────────────────────────────────────────
const F = {
  pinyon: "'Pinyon Script', 'Snell Roundhand', cursive",
  corm: "'Cormorant Garamond', Georgia, serif",
  amatic: "'Amatic SC', 'Trebuchet MS', cursive",
  bebas: "'Bebas Neue', 'Arial Narrow', sans-serif",
  mono: "'JetBrains Mono', Menlo, monospace",
  caveat: "'Caveat', 'Bradley Hand', cursive",
};

// ─── Small parts ──────────────────────────────────────────────────────────────
let pinN = 0;
function pushpin(size, pos) {
  const id = `p${++pinN}`;
  const posStyle = {
    'top-center': 'top:5px;left:50%;transform:translateX(-50%)',
    'top-left': 'top:8px;left:8px', 'top-right': 'top:8px;right:8px',
    'bottom-left': 'bottom:8px;left:8px', 'bottom-right': 'bottom:8px;right:8px',
  }[pos];
  return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" style="position:absolute;z-index:3;pointer-events:none;filter:drop-shadow(0 4px 2px rgba(0,0,0,0.6)) drop-shadow(0 8px 10px rgba(0,0,0,0.45));${posStyle}"><defs><radialGradient id="${id}d" cx="32%" cy="26%" r="82%"><stop offset="0%" style="stop-color:#f0c39a"></stop><stop offset="14%" style="stop-color:#c87a3e"></stop><stop offset="38%" style="stop-color:#8a3f17"></stop><stop offset="65%" style="stop-color:#48200a"></stop><stop offset="100%" style="stop-color:#160802"></stop></radialGradient><radialGradient id="${id}r" cx="50%" cy="82%" r="62%"><stop offset="0%" style="stop-color:rgba(0,0,0,0.85)"></stop><stop offset="60%" style="stop-color:rgba(0,0,0,0.32)"></stop><stop offset="100%" style="stop-color:rgba(0,0,0,0)"></stop></radialGradient></defs><ellipse cx="20" cy="27" rx="12" ry="2.8" fill="rgba(0,0,0,0.55)"></ellipse><circle cx="20" cy="20" r="12" fill="url(#${id}d)"></circle><circle cx="20" cy="20" r="12" fill="url(#${id}r)"></circle><path d="M9 22.8 Q20 30.5, 31 22.8" stroke="rgba(15,6,1,0.85)" fill="none" style="stroke-width:1.1"></path><ellipse cx="15" cy="14.5" rx="4.2" ry="2.6" fill="rgba(255,232,210,0.6)" transform="rotate(-32,15,14.5)"></ellipse><circle cx="13.4" cy="13.2" r="1.3" fill="rgba(255,230,205,0.95)"></circle></svg>`;
}
const cornerPins = (s = 22) => ['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(p => pushpin(s, p)).join('');

function washi(pos) {
  const p = { 'bottom-left': 'bottom:-11px;left:-46px;transform:rotate(45deg)', 'bottom-right': 'bottom:-11px;right:-46px;transform:rotate(-45deg)' }[pos];
  return `<div style="position:absolute;${p};width:92px;height:22px;transform-origin:center;z-index:3;pointer-events:none;background:${grain},linear-gradient(180deg,rgba(150,95,18,0.45) 0%,rgba(234,162,33,0.45) 18%,rgba(234,162,33,0.45) 82%,rgba(150,95,18,0.45) 100%);background-size:120px 40px,auto;background-blend-mode:multiply,normal;box-shadow:0 2px 3px rgba(0,0,0,0.35),0 5px 9px rgba(0,0,0,0.25),inset 0 1px 0 rgba(255,235,200,0.35);clip-path:polygon(2% 8%,6% 0,12% 12%,18% 4%,24% 14%,96% 6%,100% 0,98% 22%,96% 100%,92% 88%,86% 96%,80% 86%,74% 96%,4% 92%,0 100%,2% 78%)"></div>`;
}

// Heirloom tomato bullet (MealPlan.jsx TomatoBullet / App.jsx taglines)
function tomato(size, dark = false) {
  const body = dark ? '#6e1a1a' : '#8b2a2a';
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 36" style="flex-shrink:0;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45))"><path d="M16 3 C16 3, 14 6, 16 7.5 C18 6, 16 3, 16 3Z" fill="#3a5a18"></path><path d="M11 7 Q8 3, 9 1" fill="none" stroke="#2e4e14" style="stroke-width:1.8;stroke-linecap:round"></path><path d="M21 7 Q24 3, 23 1" fill="none" stroke="#2e4e14" style="stroke-width:1.8;stroke-linecap:round"></path><path d="M14 6 Q12 2, 14 1" fill="none" stroke="#3a5a18" style="stroke-width:1.4;stroke-linecap:round"></path><path d="M18 6 Q20 2, 18 1" fill="none" stroke="#3a5a18" style="stroke-width:1.4;stroke-linecap:round"></path><path d="M16 8 C10 8, 4 12, 4 18 C4 24, 8 28, 12 28 C13 28, 14 27.5, 15 27 C15.5 28, 16.5 28, 17 27 C18 27.5, 19 28, 20 28 C24 28, 28 24, 28 18 C28 12, 22 8, 16 8Z" fill="${body}"></path><ellipse cx="10" cy="17" rx="4.5" ry="6" fill="#8a2820" opacity="0.8" transform="rotate(-10,10,17)"></ellipse><ellipse cx="21" cy="18" rx="4" ry="5.5" fill="#4e1828" opacity="0.7" transform="rotate(8,21,18)"></ellipse><ellipse cx="16" cy="26" rx="8" ry="3" fill="#2a0808" opacity="0.4"></ellipse><path d="M12 9 Q11 18, 12 27" fill="none" stroke="#4a1010" opacity="0.6" style="stroke-width:0.8"></path><path d="M20 9 Q21 18, 20 27" fill="none" stroke="#4a1010" opacity="0.6" style="stroke-width:0.8"></path><ellipse cx="11" cy="13" rx="3.5" ry="2.5" fill="white" opacity="0.18" transform="rotate(-25,11,13)"></ellipse></svg>`;
}

const ornament = `<div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-top:10px"><span style="flex:1;max-width:90px;height:1px;background:linear-gradient(90deg,transparent 0%,rgba(234,162,33,0.55) 50%,rgba(234,162,33,0.7) 100%)"></span><svg width="48" height="18" viewBox="0 0 48 18" style="flex-shrink:0"><path d="M3 9 Q24 7, 45 9" stroke="#eaa221" fill="none" style="stroke-width:1.1;stroke-linecap:round"></path><g fill="#eaa221"><ellipse cx="12" cy="5.5" rx="3.2" ry="1.3" transform="rotate(-22, 12, 5.5)" opacity="0.9"></ellipse><ellipse cx="24" cy="3.8" rx="3.4" ry="1.3" opacity="0.95"></ellipse><ellipse cx="36" cy="5.5" rx="3.2" ry="1.3" transform="rotate(22, 36, 5.5)" opacity="0.9"></ellipse><ellipse cx="17" cy="12" rx="2.8" ry="1.1" transform="rotate(20, 17, 12)" opacity="0.75"></ellipse><ellipse cx="31" cy="12" rx="2.8" ry="1.1" transform="rotate(-20, 31, 12)" opacity="0.75"></ellipse></g><circle cx="24" cy="9" r="1.1" fill="#eaa221"></circle></svg><span style="flex:1;max-width:90px;height:1px;background:linear-gradient(90deg,rgba(234,162,33,0.7) 0%,rgba(234,162,33,0.55) 50%,transparent 100%)"></span></div>`;

// ─── Header ───────────────────────────────────────────────────────────────────
const TITLE_SHADOW = '0 -2px 0px rgba(255,255,255,0.15), 2px 2px 0px #2a1608, 4px 4px 0px #1a0e06, 6px 6px 0px #120a04, 8px 8px 0px rgba(10,4,0,0.95), 12px 12px 2px rgba(0,0,0,0.85), 16px 16px 6px rgba(0,0,0,0.75), 22px 22px 14px rgba(0,0,0,0.6), 0 0 30px rgba(255,230,150,0.15)';
const FRESH_SHADOW = '2px 2px 0px #1a0e06, 4px 4px 0px rgba(10,4,0,0.9), 6px 6px 0px rgba(5,2,0,0.8), 8px 8px 4px rgba(0,0,0,0.75), 12px 12px 10px rgba(0,0,0,0.6)';

function taglines(s) {
  const items = ['RECIPE PLANNER', 'DEAL-FINDER', 'BUDGET CALCULATOR'].map(t =>
    `<span style="display:flex;align-items:center;gap:${s.taglines === 'stack' ? 10 : 12}px">${tomato(s.tomato, true)}<span style="font-family:${F.corm};font-size:${s.tagFont}px;font-weight:700;color:#c9a47a;letter-spacing:0.28em;text-transform:uppercase;text-shadow:2px 3px 4px rgba(0,0,0,0.6)">${t}</span></span>`).join('');
  return s.taglines === 'stack'
    ? `<div style="display:flex;flex-direction:column;gap:6px;margin-top:12px">${items}</div>`
    : `<div style="display:flex;margin-top:10px;align-items:center;justify-content:${s.w < 1100 ? 'flex-start' : 'space-between'};width:100%;flex-wrap:wrap;gap:8px 28px">${items}</div>`;
}

function modeCards(s) {
  const modes = [
    ['Recipe Planner', 'Build a full week of meals with budget, deals, and your pantry in mind.', true],
    ['Deal Finder', 'Skip the meal plan — just show me what’s on sale at stores near me.', false],
    ['Budget Calculator', 'Get a plan that fits your spending limit with a full cost breakdown.', false],
  ];
  return `<div style="display:grid;grid-template-columns:repeat(${s.modeCols}, minmax(0, 1fr));gap:10px">${modes.map(([label, blurb, active]) => `
    <div style="text-align:left;padding:12px 14px;border-radius:8px;background:rgba(60,40,30,0.45);border:1px solid rgba(200,170,120,0.3);box-shadow:inset 0 1px 0 rgba(255,255,255,0.04)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <span style="font-family:${F.corm};font-size:${s.modeLabel}px;font-weight:700;color:${active ? '#eaa221' : '#faf5e8'};letter-spacing:0.04em;padding-bottom:3px;border-bottom:1px solid ${active ? 'rgba(234,162,33,0.85)' : 'transparent'}">${label}</span>
        ${active ? `<span style="font-family:${F.mono};font-size:10px;font-weight:700;color:#1a0e06;background:#eaa221;padding:2px 6px;border-radius:3px;letter-spacing:0.1em">ACTIVE</span>` : ''}
      </div>
      <div style="font-family:${F.caveat};font-weight:500;font-size:${s.modeBlurb}px;color:rgba(250,245,232,0.82);line-height:1.15">${blurb}</div>
    </div>`).join('')}</div>`;
}

function field(s, label, value, w, kind = 'input', divider = true) {
  const fontSize = kind === 'select' ? Math.max(18, s.ctrlFont - 2) : s.ctrlFont;
  const ctrl = `<div style="width:${w};height:${s.ctrlH}px;box-sizing:border-box;background:#6b5438;border:1px solid rgba(180,160,120,0.35);border-radius:6px;padding:0 10px;color:#ffffff;font-family:${F.corm};font-size:${fontSize}px;font-weight:700;text-shadow:1px 1px 2px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:${kind === 'select' ? 'space-between' : 'flex-start'};box-shadow:inset 3px 3px 6px rgba(0,0,0,0.4),inset 1px 1px 2px rgba(0,0,0,0.3)">${value}${kind === 'select' ? '<span style="font-size:11px;opacity:0.8;margin-left:6px">▼</span>' : ''}</div>`;
  const lbl = `<span style="font-family:${F.amatic};font-size:${s.ctrlLabel}px;font-weight:700;color:#d4c4a0;letter-spacing:0.1em;text-transform:uppercase;text-shadow:2px 3px 4px rgba(0,0,0,0.65);white-space:pre-line;line-height:1.08;text-align:center;display:flex;align-items:flex-end;justify-content:center;${s.controls === 'row' ? 'min-height:56px' : ''}">${label}</span>`;
  return `<label style="display:flex;flex-direction:column;gap:9px;align-items:center;${divider ? 'border-right:1px solid rgba(220,200,160,0.32);padding-right:18px' : ''}">${lbl}${ctrl}</label>`;
}

function cta(s) {
  return `<div style="background:linear-gradient(180deg,#f0e4c8 0%,#ddd0aa 20%,#c8b888 50%,#b0a070 80%,#9a8a5e 100%);color:#2a1a0e;font-family:${F.amatic};font-weight:700;font-size:${s.ctaFont}px;letter-spacing:0.08em;text-transform:uppercase;border:1px solid rgba(140,120,70,0.6);border-top:2px solid rgba(255,245,220,0.7);border-bottom:3px solid rgba(80,60,30,0.7);border-radius:8px;box-shadow:inset 0 2px 0 rgba(255,255,255,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),4px 6px 14px rgba(0,0,0,0.5),8px 10px 24px rgba(0,0,0,0.3);text-shadow:0 1px 0 rgba(255,255,255,0.3);display:inline-flex;align-items:center;justify-content:center;${s.controls === 'row' ? 'min-width:300px' : 'width:100%'};height:${s.ctaH}px;box-sizing:border-box">Plan My Week</div>`;
}

function controls(s) {
  const panelStyle = `position:relative;background:${warp},${weft},${slub},linear-gradient(180deg,rgba(82,64,46,0.5) 0%,rgba(62,48,34,0.5) 50%,rgba(46,34,22,0.5) 100%);border-top:1px solid rgba(225,200,155,0.55);border-left:1px solid rgba(205,180,135,0.35);border-right:1px solid rgba(20,12,4,0.45);border-bottom:3px solid rgba(15,8,3,0.75);border-radius:10px;box-shadow:inset 0 2px 0 rgba(255,245,215,0.28),inset 0 -6px 14px rgba(0,0,0,0.4),0 3px 5px rgba(0,0,0,0.4),0 8px 16px rgba(0,0,0,0.4),0 16px 30px rgba(0,0,0,0.25)`;
  const deco = pushpin(22, 'top-left') + pushpin(22, 'top-right') + washi('bottom-left') + washi('bottom-right');
  if (s.controls === 'row') {
    return `<div style="${panelStyle};padding:22px 28px;display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end;justify-content:center">${deco}
      ${field(s, 'ZIP\nCODE', '64683', '72px')}${field(s, 'SHOPPING\nRADIUS', '30 mi', '90px', 'select')}${field(s, 'BUDGET $', '100', '78px')}${field(s, 'SERVINGS', '2', '58px')}${field(s, 'MY\nSTORE', 'All Stores', '160px', 'select')}${field(s, 'SKILL\nLEVEL', 'All Levels', '140px', 'select', false)}
      <div style="flex-basis:100%;display:flex;justify-content:center;margin-top:6px">${cta(s)}</div></div>`;
  }
  if (s.controls === 'grid-4-2') {
    return `<div style="${panelStyle};padding:22px 28px;display:flex;flex-direction:column;gap:16px">${deco}
      <div style="display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));gap:14px">${field(s, 'ZIP CODE', '64683', '100%', 'input', false)}${field(s, 'SHOPPING RADIUS', '30 mi', '100%', 'select', false)}${field(s, 'BUDGET $', '100', '100%', 'input', false)}${field(s, 'SERVINGS', '2', '100%', 'input', false)}</div>
      <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:14px">${field(s, 'MY STORE', 'All Stores', '100%', 'select', false)}${field(s, 'SKILL LEVEL', 'All Levels', '100%', 'select', false)}</div>
      <div style="display:flex;justify-content:center;margin-top:4px">${cta(s).replace('width:100%', 'min-width:340px')}</div></div>`;
  }
  // grid-2 (phone)
  return `<div style="${panelStyle};padding:18px 16px 20px;display:flex;flex-direction:column;gap:14px">${deco}
    <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:12px">${field(s, 'ZIP CODE', '64683', '100%', 'input', false)}${field(s, 'SHOPPING RADIUS', '30 mi', '100%', 'select', false)}${field(s, 'BUDGET $', '100', '100%', 'input', false)}${field(s, 'SERVINGS', '2', '100%', 'input', false)}${field(s, 'MY STORE', 'All Stores', '100%', 'select', false)}${field(s, 'SKILL LEVEL', 'All Levels', '100%', 'select', false)}</div>
    <div style="margin-top:4px">${cta(s)}</div></div>`;
}

function header(s) {
  const hPad = s.w < 600 ? '16px' : s.w < 900 ? '28px' : '40px';
  const topPad = (s.w < 600 ? 20 : s.w < 900 ? 30 : 36) + s.insetTop;
  return `
  <div style="height:3px;background:linear-gradient(90deg,#c49a5c 0%,#a08050 50%,#b86b50 100%)"></div>
  <header style="position:relative;overflow:hidden;background:#2a1a0e;border-bottom:1px solid rgba(240,232,218,0.14);padding:${topPad}px ${hPad} ${s.w < 600 ? 18 : 30}px">
    <div style="position:absolute;inset:0;background:url(./tomatoes-header.jpg) center / cover;filter:saturate(1.6) contrast(1.1);opacity:0.8"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(30,16,6,0.82) 0%,rgba(30,16,6,0.62) 40%,rgba(30,16,6,0.62) 60%,rgba(30,16,6,0.82) 100%)"></div>
    <div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:${s.w < 600 ? 18 : 24}px">
      <div>
        <div style="display:flex;align-items:flex-start;gap:${s.w < 600 ? 14 : 32}px;flex-wrap:wrap">
          <h1 style="margin:0;font-family:${F.pinyon};font-size:${s.title_px}px;font-weight:400;color:#faf5e8;line-height:0.95;letter-spacing:0.02em;text-shadow:${TITLE_SHADOW}">Meal Maker</h1>
          <span style="font-family:${F.corm};font-size:${s.fresh}px;font-weight:700;color:#f0e8da;letter-spacing:${s.freshTrack};text-transform:uppercase;text-shadow:${FRESH_SHADOW};margin-left:${s.w < 600 ? 0 : 40}px;margin-top:${s.w < 600 ? 6 : Math.round(s.title_px * 0.3)}px">Fresh Ideas${ornament}</span>
        </div>
        <p style="margin:10px 0 0;font-family:${F.corm};font-size:${s.shop}px;font-weight:600;color:#eaa221;letter-spacing:0.04em;text-shadow:1px 2px 3px rgba(0,0,0,0.4)"><span style="font-family:${F.pinyon};font-size:${s.shopLbl}px;color:#ffffff;text-shadow:2px 3px 0 #1a0e06, 3px 4px 6px rgba(0,0,0,0.45)">Shopping in:</span> Trenton, MO · 64683</p>
        ${taglines(s)}
      </div>
      <div style="margin-top:${s.w < 600 ? 0 : 8}px;padding:${s.w < 600 ? '18px 16px 16px' : '24px 28px 22px'};background:rgba(0,0,0,0.28);border:1px solid rgba(234,162,33,0.3);border-radius:10px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.06),0 4px 10px rgba(0,0,0,0.35)">
        <div style="font-family:${F.pinyon};font-size:${s.welcome}px;color:#faf5e8;text-shadow:2px 3px 0 #1a0e06, 3px 4px 6px rgba(0,0,0,0.5);margin-bottom:8px;line-height:1">Welcome!</div>
        <div style="font-family:${F.corm};font-size:${s.blurb}px;font-style:italic;color:rgba(250,245,232,0.82);line-height:1.45;margin-bottom:${s.w < 600 ? 14 : 20}px">Add your info below, then pick what you’d like to focus on for this session.</div>
        ${modeCards(s)}
      </div>
      ${controls(s)}
    </div>
  </header>`;
}

// ─── Body pieces ──────────────────────────────────────────────────────────────
function budgetBar(s) {
  const over = WEEKLY > BUDGET;
  const pct = Math.min((WEEKLY / BUDGET) * 100, 100);
  const [d, c] = WEEKLY.toFixed(2).split('.');
  const [dd, dc] = Math.abs(BUDGET - WEEKLY).toFixed(2).split('.');
  const paper = `position:relative;background:${crumple},${fibers},linear-gradient(155deg,rgba(0,0,0,0.08) 0%,transparent 20%,rgba(0,0,0,0.05) 35%,transparent 50%,rgba(0,0,0,0.06) 65%,transparent 80%,rgba(0,0,0,0.04) 100%),radial-gradient(ellipse at 15% 25%,rgba(200,170,120,0.25) 0%,transparent 40%),rgba(184,149,106,0.5);border-top:1px solid rgba(220,195,150,0.55);border-left:1px solid rgba(200,175,130,0.35);border-right:1px solid rgba(20,12,4,0.45);border-bottom:3px solid rgba(15,8,3,0.75);border-radius:10px;box-shadow:inset 0 1px 0 rgba(255,245,215,0.18),inset 0 -3px 8px rgba(0,0,0,0.22),0 6px 14px rgba(0,0,0,0.32);margin-bottom:${s.w < 600 ? 22 : 32}px`;
  const lblStyle = `font-family:${F.corm};text-transform:uppercase;font-size:${s.w < 600 ? 18 : 22}px;font-weight:700;display:block;margin-bottom:6px;letter-spacing:0.25em;text-shadow:2px 2px 0 rgba(0,0,0,0.75), 3px 4px 5px rgba(0,0,0,0.4)`;
  const left = `<div style="${s.budget === 'row' ? 'border-right:2px solid rgba(255,255,255,0.15);padding-right:32px;margin-right:32px;box-shadow:1px 0 0 rgba(0,0,0,0.3)' : s.budget === 'two' ? 'text-align:left' : 'text-align:center'}">
    <span style="${lblStyle};color:#eaa221">Est. Weekly Cost</span>
    <span style="font-family:${F.bebas};font-size:${s.priceFont}px;font-weight:900;color:#1a3312;line-height:1;letter-spacing:0.08em;text-shadow:2px 3px 4px rgba(0,0,0,0.35);display:block"><span style="font-size:0.6em;opacity:0.75;margin-right:2px">~</span>$${d}.<span style="font-size:0.55em;vertical-align:super;letter-spacing:0.04em">${c}</span></span>
    <span style="font-family:${F.corm};font-size:${s.w < 600 ? 17 : 24}px;font-weight:700;font-style:italic;color:rgba(255,255,255,0.85);display:block;margin-top:4px">(incl. 3.0% grocery tax · register may vary)</span></div>`;
  const bar = `<div style="padding:0 8px;${s.budget === 'stack' ? 'margin:18px 0' : ''}">
    <div style="position:relative;height:16px;background:rgba(240,232,218,0.12);border-radius:99px;border:1px solid rgba(240,232,218,0.1);box-shadow:inset 0 2px 4px rgba(0,0,0,0.3)">
      <div style="position:absolute;left:0;top:0;bottom:0;width:${pct}%;background:${over ? 'linear-gradient(90deg,#c43030,#5a2838)' : pct > 80 ? 'linear-gradient(90deg,#3a5a28,#c43030)' : 'linear-gradient(90deg,#3a5a28,#4a6a30)'};border-radius:99px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.25),0 2px 6px rgba(0,0,0,0.5),0 0 16px rgba(58,90,40,0.4);border-top:1px solid rgba(255,255,255,0.2);border-bottom:2px solid rgba(0,0,0,0.3)">
        <span style="position:absolute;right:-8px;top:50%;transform:translateY(-50%);font-family:${F.bebas};font-size:${s.w < 600 ? 44 : 58}px;font-weight:900;color:#eaa221;-webkit-text-stroke:1.5px #2a1608;paint-order:stroke fill;filter:drop-shadow(3px 5px 4px rgba(0,0,0,0.55));z-index:3;line-height:1">$</span></div></div>
    <div style="display:flex;justify-content:space-between;margin-top:8px"><span style="font-family:${F.bebas};font-size:24px;font-weight:900;color:#eaa221;letter-spacing:0.06em;text-shadow:2px 2px 0 rgba(0,0,0,0.75)">$0</span><span style="font-family:${F.bebas};font-size:24px;font-weight:900;color:#eaa221;letter-spacing:0.06em;text-shadow:2px 2px 0 rgba(0,0,0,0.75)">$${BUDGET} <span style="font-family:${F.corm};font-size:13px;font-weight:700;letter-spacing:0.15em;color:rgba(255,255,255,0.5)">BUDGET</span></span></div></div>`;
  const right = `<div style="${s.budget === 'row' ? 'text-align:right;border-left:2px solid rgba(255,255,255,0.15);padding-left:32px;margin-left:32px;box-shadow:-1px 0 0 rgba(0,0,0,0.3)' : s.budget === 'two' ? 'text-align:right' : 'text-align:center'}">
    <span style="${lblStyle};color:${over ? '#e05040' : '#eaa221'};text-shadow:0 0 6px rgba(234,162,33,0.85), 0 0 14px rgba(234,162,33,0.55), 2px 2px 0px rgba(0,0,0,0.85), 3px 4px 5px rgba(0,0,0,0.55)">${over ? 'Over Budget' : 'Under Budget'}</span>
    <span style="font-family:${F.bebas};font-size:${s.w < 600 ? 40 : 44}px;font-weight:900;color:${over ? '#8b1a1a' : '#1a3312'};letter-spacing:0.08em;text-shadow:0 0 18px rgba(245,163,10,0.25)">${over ? '+' : '-'}$${dd}.<span style="font-size:0.55em;vertical-align:super;letter-spacing:0.04em">${dc}</span></span></div>`;
  if (s.budget === 'row') return `<div style="${paper};padding:28px 32px;display:grid;grid-template-columns:auto 1fr auto;align-items:center">${cornerPins()}${left}${bar}${right}</div>`;
  // 'two': the ≤900px rule — bar spans the top, cost and delta side by side below.
  if (s.budget === 'two') return `<div style="${paper};padding:18px 20px 20px;display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:16px;align-items:center">${cornerPins()}<div style="grid-column:1 / -1">${bar}</div>${left}${right}</div>`;
  return `<div style="${paper};padding:22px 18px;display:flex;flex-direction:column">${cornerPins()}${left}${bar}${right}</div>`;
}

function tabs(s) {
  const t = [['Customize', false], ['The Plan', true], ['My Recipes', false], ['Shopping List', false], ['Deals Near Me', false]];
  return `<div style="display:flex;align-items:center;${s.w < 700 ? 'flex-wrap:nowrap;overflow:hidden' : 'flex-wrap:wrap'};gap:4px 0;margin-bottom:${s.w < 600 ? 20 : 28}px;background:linear-gradient(180deg,rgba(25,16,8,0.55) 0%,rgba(25,16,8,0.38) 100%);border-radius:10px 10px 0 0;padding:8px 10px 0;border-bottom:2px solid rgba(234,162,33,0.4);box-shadow:inset 0 1px 0 rgba(255,245,215,0.08),0 3px 8px rgba(0,0,0,0.2)">
    ${t.map(([label, on]) => `<span style="flex:0 0 auto;background:${on ? 'linear-gradient(180deg,rgba(234,162,33,0.28) 0%,rgba(255,255,255,0.07) 60%,transparent 100%)' : 'rgba(0,0,0,0.28)'};color:${on ? '#ffffff' : 'rgba(240,232,218,0.85)'};border-left:1px solid rgba(240,232,218,0.14);border-right:1px solid rgba(240,232,218,0.14);border-top:1px solid ${on ? 'rgba(234,162,33,0.45)' : 'rgba(240,232,218,0.1)'};border-bottom:4px solid ${on ? '#eaa221' : 'transparent'};padding:${s.tabPad};margin-right:${s.w < 700 ? 4 : 12}px;margin-bottom:-1px;font-family:${F.corm};font-size:${s.tabFont}px;font-weight:700;white-space:nowrap;border-radius:6px 6px 0 0;letter-spacing:${s.w < 700 ? '0.1em' : '0.14em'};text-transform:uppercase;text-shadow:${on ? '0 0 10px rgba(234,162,33,0.3), 2px 2px 4px rgba(0,0,0,0.7)' : '1px 2px 3px rgba(0,0,0,0.6)'};box-shadow:${on ? 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 10px rgba(0,0,0,0.4)' : 'inset 0 1px 0 rgba(255,255,255,0.05)'}">${label}</span>`).join('')}
    ${s.status ? `<span style="margin-left:auto;font-family:${F.mono};font-size:14px;font-weight:600;color:rgba(240,232,218,0.65);letter-spacing:0.04em;padding-bottom:10px;text-shadow:1px 2px 3px rgba(0,0,0,0.4)"><span style="font-weight:900;color:rgba(240,232,218,0.85)">${plan.salesApplied}</span> deals nearby! · Serves: <span style="font-weight:900;color:rgba(240,232,218,0.85)">2</span></span>` : ''}
  </div>`;
}

function craving(s) {
  const btn = (label, glow) => `<span style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(180deg,rgba(100,80,55,0.9) 0%,rgba(70,55,38,0.95) 40%,rgba(50,38,25,0.9) 100%);color:${glow ? '#d4c4a0' : '#eaa221'};border:1px solid ${glow ? 'rgba(180,160,120,0.3)' : 'rgba(234,162,33,0.45)'};border-top:1px solid rgba(200,180,140,0.25);border-bottom:2px solid rgba(30,20,10,0.5);font-family:${F.amatic};font-weight:700;padding:10px ${s.w < 600 ? 16 : 22}px;font-size:${s.w < 600 ? 20 : glow ? 24 : 22}px;letter-spacing:0.06em;text-transform:uppercase;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.1),3px 5px 10px rgba(0,0,0,0.4)${glow ? ',0 0 18px rgba(234,162,33,0.65),0 0 38px rgba(234,162,33,0.4)' : ''};text-shadow:1px 2px 3px rgba(0,0,0,0.5)">${label}</span>`;
  return `<div style="margin-bottom:18px;padding:${s.w < 600 ? '14px 16px' : '16px 22px'};background:rgba(0,0,0,0.22);border:1px solid rgba(234,162,33,0.3);border-radius:8px;font-family:${F.corm};font-size:16px;font-weight:600;color:rgba(250,245,232,0.92);line-height:1.6;text-shadow:1px 1px 2px rgba(0,0,0,0.5)">
    <strong style="display:block;margin-bottom:6px;color:#eaa221;font-weight:700;letter-spacing:0.04em;font-size:${s.craving}px;line-height:1.1;text-shadow:0 0 12px rgba(234,162,33,0.45), 2px 3px 4px rgba(0,0,0,0.7)">Craving something new?</strong>
    Hit <em style="color:#eaa221;font-style:normal;font-weight:700">Change It Up!</em> below to shuffle in fresh recipes without losing your budget or store settings — or tap <em style="color:#eaa221;font-style:normal;font-weight:700">✕ Skip</em> on any individual meal for a new suggestion in its place.
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(234,162,33,0.18);font-family:${F.caveat};font-weight:500;font-size:${s.w < 600 ? 20 : 22}px;line-height:1.15;color:rgba(250,245,232,0.88)"><strong style="color:#eaa221;font-family:${F.mono};font-weight:700;font-size:13px;letter-spacing:0.08em">TIP</strong> Click any meal card to jump straight to its full recipe.</div>
    <div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:12px;align-items:center">${btn('Change It Up!', true)}${btn('<span style="font-size:18px">♥</span> Save This Menu', false)}</div>
  </div>`;
}

// Meal card (MealPlan.jsx MealCard)
const CARD_BG = `${corkDust},${corkFleck},${corkChunk},radial-gradient(ellipse at 30% 25%,rgba(245,210,160,0.22) 0%,transparent 55%),radial-gradient(ellipse at 75% 75%,rgba(80,52,22,0.20) 0%,transparent 55%),linear-gradient(180deg,rgba(255,235,200,0.10) 0%,transparent 12%,transparent 88%,rgba(35,20,8,0.18) 100%),#c19a71`;
function fitFont(name, base, min, maxChars) {
  const longest = name.split(/\s+/).reduce((m, w) => Math.max(m, w.length), 0);
  return longest <= maxChars ? base : Math.max(min, Math.round((base * maxChars) / longest));
}
function card(s, meal, type, day, showDay) {
  const onSale = meal.ingredients.some(i => i.onSale);
  const stat = (v, l) => `<div style="text-align:center"><div style="font-family:${F.mono};font-size:13px;font-weight:700;color:#f0e8da;line-height:1.2;text-shadow:1px 1px 2px rgba(0,0,0,0.6)">${v}</div><div style="font-family:${F.amatic};text-transform:uppercase;font-size:15px;font-weight:700;color:#eaa221;margin-top:1px;text-shadow:1px 2px 3px rgba(0,0,0,0.5)">${l}</div></div>`;
  const abtn = (label, bg, border) => `<span style="font-family:${F.corm};font-size:13px;font-weight:700;color:#faf5e8;background:${bg};border:1px solid ${border};border-radius:4px;padding:4px ${s.w < 600 ? 8 : 12}px;letter-spacing:0.08em;text-transform:uppercase;box-shadow:2px 3px 6px rgba(0,0,0,0.5),4px 5px 12px rgba(0,0,0,0.3);white-space:nowrap">${label}</span>`;
  return `<div style="position:relative;border-radius:10px;border:1px solid #6a523a;border-top:2px solid rgba(220,190,140,0.5);border-bottom:4px solid rgba(38,22,8,0.8);border-left:3px solid ${MEAL_ACCENT[type]};border-right:3px solid rgba(60,40,15,0.45);padding:${s.cardPad};min-height:${s.cardMinH}px;box-sizing:border-box;background:${CARD_BG};background-size:240px 240px,320px 320px,420px 420px,auto,auto,auto,auto;background-repeat:repeat,repeat,repeat,no-repeat,no-repeat,no-repeat,no-repeat;box-shadow:inset 0 2px 0 rgba(255,235,200,0.12),inset 0 -3px 8px rgba(0,0,0,0.25),4px 6px 14px rgba(0,0,0,0.4),8px 10px 20px rgba(0,0,0,0.18);display:flex;flex-direction:column;gap:${s.w < 600 ? 7 : 9}px">
    ${pushpin(30, 'top-center')}
    ${onSale ? `<div style="position:absolute;top:6px;left:-12px;transform:rotate(-12deg);transform-origin:left top;width:88px;height:26px;background:${grain},linear-gradient(180deg,rgba(196,154,92,0.78) 0%,rgba(255,208,68,0.88) 18%,rgba(255,208,68,0.88) 82%,rgba(150,95,18,0.78) 100%);background-size:120px 40px,auto;background-blend-mode:multiply,normal;box-shadow:0 2px 3px rgba(0,0,0,0.45),0 5px 9px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,235,200,0.5);clip-path:polygon(2% 8%,6% 0,12% 12%,18% 4%,24% 14%,96% 6%,100% 0,98% 22%,96% 100%,92% 88%,86% 96%,80% 86%,74% 96%,4% 92%,0 100%,2% 78%);z-index:4;display:flex;align-items:center;justify-content:center"><span style="font-family:${F.mono};font-size:13px;font-weight:900;letter-spacing:0.12em;color:#1a1400;text-shadow:0 1px 0 rgba(255,255,255,0.4)">★ DEAL</span></div>` : ''}
    ${showDay ? `<div style="font-family:${F.amatic};font-size:20px;font-weight:700;color:#f0e8da;text-transform:uppercase;letter-spacing:0.08em;text-shadow:1px 2px 3px rgba(0,0,0,0.6)">${day}</div>` : ''}
    <div style="display:inline-flex;align-items:center;gap:4px;color:rgba(240,232,218,0.7);text-shadow:1px 2px 3px rgba(0,0,0,0.6);line-height:1"><span style="font-size:${s.w < 600 ? 26 : 34}px">☆</span><span style="font-family:${F.amatic};font-weight:700;font-size:${s.w < 600 ? 16 : 18}px;letter-spacing:0.08em;text-transform:uppercase">Favorite</span></div>
    <p style="margin:0;font-family:${F.corm};font-size:${fitFont(meal.name, s.cardName, 11, 9)}px;font-weight:700;line-height:1.3;color:#faf5e8;flex:1;text-shadow:1px 2px 3px rgba(0,0,0,0.55);text-wrap:pretty">${meal.name}</p>
    <div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:6px;padding:8px 0 2px;border-top:1px solid rgba(240,232,218,0.14)">${stat(meal.prepMinutes + 'm', 'prep')}${stat(meal.protein_g + 'g', 'protein')}${stat(meal.veggie_count, 'veggies')}</div>
    <div style="font-family:${F.bebas};font-size:${s.cardPrice}px;font-weight:900;color:#ffffff;letter-spacing:0.08em;line-height:1;-webkit-text-stroke:1.5px #1a3312;paint-order:stroke fill;text-shadow:2px 3px 4px rgba(0,0,0,0.7)">${money(meal.cost * 1.03)}</div>
    <div style="display:flex;gap:6px;align-self:flex-end;margin-top:4px;flex-wrap:wrap;justify-content:flex-end">${abtn('✕ Skip', 'rgba(180,60,40,0.8)', 'rgba(140,40,25,0.6)')}${abtn('⌀ Never Again', 'rgba(60,40,30,0.85)', 'rgba(40,25,15,0.7)')}</div>
  </div>`;
}

const rowLabel = (s, text, size) => `<span style="font-family:${F.pinyon};font-size:${size}px;font-weight:400;color:#faf5e8;letter-spacing:0.02em;display:inline-flex;align-items:center;gap:8px;-webkit-text-stroke:1px #faf5e8;paint-order:stroke fill;text-shadow:3px 3px 0 #1a0e06, 5px 6px 8px rgba(0,0,0,0.5);white-space:nowrap">${tomato(Math.round(size * 0.76))}${text}</span>`;
const dayHeader = (text, size = 28) => `<div style="text-align:center;font-family:${F.amatic};font-size:${size}px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.02em;padding:12px 2px 18px;border-bottom:1px solid rgba(240,232,218,0.14);text-shadow:2px 3px 4px rgba(0,0,0,0.7)">${text}</div>`;
const totalCell = (n, size = 38, pad = '20px') => `<div style="background:linear-gradient(180deg,#ffffff 0%,#f8f4ec 50%,#efe8da 100%);border:1px solid #8a6238;border-top:2px solid rgba(255,255,255,0.8);border-bottom:3px solid rgba(100,70,30,0.5);border-radius:8px;padding:${pad};display:flex;align-items:center;justify-content:center;box-shadow:inset 0 2px 0 rgba(255,255,255,0.4),4px 6px 14px rgba(0,0,0,0.4),8px 10px 24px rgba(0,0,0,0.2)"><span style="font-family:${F.bebas};font-size:${size}px;font-weight:900;color:#1a1400;letter-spacing:0.04em;line-height:1;text-shadow:1px 2px 2px rgba(0,0,0,0.18)">${money(n * 1.03)}</span></div>`;
const totalsLabel = (size = 26) => `<span style="font-family:${F.corm};text-transform:uppercase;font-size:${size}px;font-weight:700;color:#ffffff;letter-spacing:0.28em;text-shadow:2px 3px 4px rgba(0,0,0,0.7);text-decoration:underline;text-underline-offset:4px">Daily Totals:</span>`;

function mealGrid(s) {
  if (s.grid === 'desktop') {
    return `<div style="display:grid;grid-template-columns:${s.labelCol}px repeat(7, minmax(0, 1fr));gap:${s.gridGap}px">
      <div></div>${DAYS.map(d => dayHeader(d, 26)).join('')}
      ${MEALS.map(t => `<div style="display:flex;align-items:center;padding-left:4px">${rowLabel(s, MEAL_LABEL[t], s.rowLabel)}</div>${DAYS.map(d => card(s, plan.plan[d][t], t, d, false)).join('')}`).join('')}
      <div style="display:flex;align-items:center;justify-content:flex-end;padding-right:10px">${totalsLabel(18)}</div>${DAYS.map(d => totalCell(plan.plan[d].dayTotal, 30, '16px 8px')).join('')}
    </div>`;
  }
  if (s.grid === 'transpose') {
    // Rows = days, columns = meals. Natural fit for a portrait tablet.
    return `<div style="display:grid;grid-template-columns:${s.dayLabelCol}px repeat(3, minmax(0, 1fr)) ${s.totalCol}px;gap:8px;align-items:stretch">
      <div></div>${MEALS.map(t => `<div style="display:flex;justify-content:center;align-items:center;padding:6px 0 14px;border-bottom:1px solid rgba(240,232,218,0.14)">${rowLabel(s, MEAL_LABEL[t], s.rowLabel + 8)}</div>`).join('')}<div style="display:flex;justify-content:center;align-items:flex-end;padding-bottom:14px;border-bottom:1px solid rgba(240,232,218,0.14)"><span style="font-family:${F.corm};text-transform:uppercase;font-size:14px;font-weight:700;color:#ffffff;letter-spacing:0.2em;text-shadow:2px 3px 4px rgba(0,0,0,0.7)">Total</span></div>
      ${DAYS.map(d => `<div style="display:flex;align-items:center;justify-content:center"><span style="font-family:${F.amatic};font-size:${s.rowLabel}px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.04em;text-shadow:2px 3px 4px rgba(0,0,0,0.7);writing-mode:vertical-rl;transform:rotate(180deg)">${d}</span></div>${MEALS.map(t => card(s, plan.plan[d][t], t, d, false)).join('')}${totalCell(plan.plan[d].dayTotal, 30, '12px 6px')}`).join('')}
    </div>`;
  }
  // two-col (phone)
  return MEALS.map(t => `<div style="padding:12px 0 6px">${rowLabel(s, MEAL_LABEL[t], s.rowLabel)}</div>
    <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px;margin-bottom:8px">${DAYS.map(d => card(s, plan.plan[d][t], t, d, true)).join('')}</div>`).join('') +
    `<div style="padding:12px 0 6px">${totalsLabel(20)}</div><div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px">${DAYS.map(d => `<div style="display:flex;flex-direction:column;gap:4px"><span style="font-family:${F.amatic};font-size:18px;font-weight:700;color:#f0e8da;text-transform:uppercase;letter-spacing:0.08em;text-shadow:1px 2px 3px rgba(0,0,0,0.6)">${d}</span>${totalCell(plan.plan[d].dayTotal, 30, '14px')}</div>`).join('')}</div>`;
}

// ─── Page assembly ────────────────────────────────────────────────────────────
function page(s) {
  const mainPad = s.w < 600 ? '16px 12px' : s.w < 900 ? '24px 20px' : '32px 24px';
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&amp;family=Pinyon+Script&amp;family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&amp;family=Caveat:wght@500;700&amp;family=JetBrains+Mono:wght@400;600;700;900&amp;family=Amatic+SC:wght@700&amp;display=swap">
  <style>
    body { margin: 0; background: #8b7355; }
    a { color: #eaa221; } a:hover { color: #ffd044; }
    * { box-sizing: border-box; }
  </style>
</helmet>
<div style="position:relative;width:${s.w}px;min-height:${s.h}px;background:${bodyNoise},radial-gradient(ellipse at 10% 0%,rgba(90,70,45,0.4) 0%,transparent 55%),#8b7355;background-size:320px 320px,auto,auto;color:#f0e8da;font-family:${F.mono};overflow:hidden">
  ${header(s)}
  <div style="position:relative;background:url(./herbs-bg.jpg) center / cover">
    <div style="position:absolute;inset:0;background:rgba(139,115,85,0.35)"></div>
    <main style="position:relative;z-index:1;padding:${mainPad};padding-bottom:${s.insetBottom + 24}px">
      ${budgetBar(s)}
      ${tabs(s)}
      ${craving(s)}
      ${mealGrid(s)}
    </main>
  </div>
  <!-- first-screen marker: where the device viewport ends before scrolling -->
  <div style="position:absolute;left:0;right:0;top:${s.fold}px;border-top:2px dashed rgba(255,208,68,0.85);pointer-events:none;z-index:9"><span style="position:absolute;right:8px;top:-22px;font-family:${F.mono};font-size:11px;font-weight:700;color:#1a1400;background:rgba(255,208,68,0.92);padding:2px 8px;border-radius:3px;letter-spacing:0.06em">FIRST SCREEN ENDS · ${s.fold}pt</span></div>
</div>
</x-dc>
</body>
</html>
`;
}

for (const s of Object.values(FRAMES)) {
  writeFileSync(s.file, page(s));
  console.log(`wrote ${s.file} (${s.w}×${s.h})`);
}

// ─── Canvas layout + notes ────────────────────────────────────────────────────
const GAP = 120;
const xPhone = 0, xMain = xPhone + 390 + GAP + 300, xLand = xMain + 820 + GAP + 300;
const canvas = {
  artboards: [
    { file: 'iPhone.dc.html', title: FRAMES.iPhone.title, x: xPhone, y: 0, w: 390, h: FRAMES.iPhone.h },
    { file: 'Main.dc.html', title: FRAMES.Main.title, x: xMain, y: 0, w: 820, h: FRAMES.Main.h },
    { file: 'iPadLandscape.dc.html', title: FRAMES.iPadLandscape.title, x: xLand, y: 0, w: 1180, h: FRAMES.iPadLandscape.h },
  ],
  annotations: [
    { id: 'note-phone', x: xPhone + 390 + 40, y: 0, w: 250, text:
`iPhone 390pt — proposed vs today

Header
• Title 60px (today clamps to 52)
• Fresh Ideas 20px, tracking .30em (was 24 / .38em → wrapped)
• Taglines stacked, 16px, 22px tomato (was a 26px row that wrapped mid-word)
• Shopping-in 24/20px (was 30/26)
• Header top padding + 59pt safe-area inset

Controls
• 2-column grid, single-line labels 18px (was flex-wrap with 26px two-line labels and dividers)
• Every control 44pt tall, full column width
• Plan My Week full width, 56pt
• Note the dashed line: on an iPhone the first screen ends inside the controls panel, so Plan My Week is below the fold. Collapsing the Welcome panel after the first visit would bring it up.

Body
• Budget bar stacked + centered, price 48px (matches ≤600 rule)
• Tabs 14px scroll strip (unchanged)
• Craving headline 24px (was 32)
• Meal grid 2 columns (today 1 col below 600px). Card padding 36 12 10, min-height 150, name 16, price 26, star 26. Day name inside the card.` },
    { id: 'note-ipad-portrait', x: xMain + 820 + 40, y: 0, w: 250, text:
`iPad portrait 820pt — proposed vs today

Header
• Title 104px (13vw — unchanged), Fresh Ideas 28px
• Taglines single row 20px, 30px tomato (was 26px and wrapped)
• 3 mode cards (unchanged)
• 24pt safe-area inset on top

Controls
• Row 1: ZIP · RADIUS · BUDGET · SERVINGS as a 4-col grid
• Row 2: MY STORE · SKILL LEVEL as a 2-col grid
• Single-line labels 24px, controls 46pt, no vertical dividers
• Plan My Week centered, 340pt min

Body
• Budget bar keeps today's ≤900px layout: bar on top, cost left / delta right. (I tried the desktop 3-part row — the center bar collapses at 820.)
• Taglines left-aligned so the wrap to a second line reads as intended. They repeat the three mode-card names; dropping them on tablets is an option.
• Tabs 18px with status text
• Meal grid TRANSPOSED: one row per day, columns Breakfast · Lunch · Dinner · Total. Day name runs vertically in a 96pt gutter. Cards ~186pt wide, padding 42 14 12.
  Today: 2-col mobile layout → 21 cards in 11 rows with no day headers.` },
    { id: 'note-ipad-landscape', x: xLand + 1180 + 40, y: 0, w: 250, text:
`iPad landscape 1180pt — proposed vs today

Header
• Title capped at 120px (13vw gives 153 — dominates the screen)
• Fresh Ideas 32px
• Taglines 20px single row (was 26px, wrapped to 2 lines)

Controls
• Desktop single row unchanged, labels 26px

Body
• Budget bar desktop layout (unchanged)
• Meal grid keeps days-as-columns. Label column 160pt (was 220), Pinyon 30 (was 42), gap 6 (was 8). Cards land at ~133pt: padding 40 12 10, name 16, price 26. Day headers 26px.
  Today: 220pt label column squeezes cards to ~125pt and the $ price barely fits.
• Daily totals 30px Bebas (was 38)` },
  ],
  launch: { view: 'canvas' },
};
writeFileSync('canvas.json', JSON.stringify(canvas, null, 2) + '\n');
console.log('wrote canvas.json');
