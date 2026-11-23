'use strict';

// Words are grouped into levels by their order in words.csv, LEVEL_SIZE at a time.
// If the CSV has a "Nivel" column, that is used instead.
const LEVEL_SIZE = 50;

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

let words = [];
let levels = [];          // [{ name, words: [...] }]
let selected = new Set(); // level names
let deck = [];
let pos = 0;
let stage = 0;            // 0 hanzi, 1 + pinyin, 2 + meaning

// ---------- data ----------
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim()));
}

async function loadWords() {
  const text = await (await fetch('words.csv')).text();
  const [header, ...rows] = parseCSV(text);
  const col = (name) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const iH = col('hanzi'), iP = col('pinyin'), iS = col('significado'), iC = col('clasificación'), iN = col('nivel');
  words = rows.map((r) => ({
    hanzi: (r[iH] || '').trim(),
    pinyin: (r[iP] || '').trim(),
    meaning: (r[iS] || '').trim(),
    kind: iC >= 0 ? (r[iC] || '').trim() : '',
    level: iN >= 0 ? (r[iN] || '').trim() : '',
  })).filter((w) => w.hanzi);

  if (iN >= 0) {
    const map = new Map();
    words.forEach((w) => { const k = w.level || '?'; if (!map.has(k)) map.set(k, []); map.get(k).push(w); });
    levels = [...map].map(([name, ws]) => ({ name, label: `Nivel ${name}`, words: ws }));
  } else {
    for (let i = 0; i < words.length; i += LEVEL_SIZE) {
      const n = levels.length + 1;
      levels.push({
        name: String(n),
        label: `Nivel ${n}`,
        range: `${i + 1}–${Math.min(i + LEVEL_SIZE, words.length)}`,
        words: words.slice(i, i + LEVEL_SIZE),
      });
    }
  }
}

// ---------- deck ----------
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function buildDeck() {
  deck = shuffle(levels.filter((l) => selected.has(l.name)).flatMap((l) => l.words));
  pos = 0;
  stage = 0;
  render();
}
function next() {
  if (!deck.length) return;
  pos++;
  if (pos >= deck.length) { const last = deck[deck.length - 1]; shuffle(deck); if (deck.length > 1 && deck[0] === last) deck.push(deck.shift()); pos = 0; }
  stage = 0;
  render();
}
function advance() {
  if (!deck.length) { openLevels(); return; }
  if (!$('strokes').hidden) { hideStrokes(); return; }
  if (stage < 2) { stage++; render(); } else next();
}

// ---------- render ----------
function render() {
  hideStrokes();
  const w = deck[pos];
  const has = !!w;
  $('speakBtn').disabled = !has || !('speechSynthesis' in window);
  $('strokeBtn').disabled = !has;
  $('nextBtn').disabled = !has;
  if (!has) {
    $('hanzi').textContent = '';
    ['pinyin', 'meaning', 'kind'].forEach((id) => $(id).classList.remove('shown'));
    $('hint').textContent = 'Elige al menos un nivel';
    $('counter').textContent = '';
    return;
  }
  const len = [...w.hanzi].length;
  $('hanzi').style.setProperty('--hz', `${Math.min(44, 88 / Math.max(len, 1))}vw`);
  $('hanzi').textContent = w.hanzi;
  $('pinyin').textContent = w.pinyin;
  $('meaning').textContent = w.meaning;
  $('kind').textContent = w.kind;
  $('pinyin').classList.toggle('shown', stage >= 1);
  $('meaning').classList.toggle('shown', stage >= 2);
  $('kind').classList.toggle('shown', stage >= 2);
  $('hint').textContent = ['Toca para ver el pinyin', 'Toca para ver el significado', 'Toca para la siguiente'][stage];
  $('counter').textContent = `${pos + 1} / ${deck.length}`;
}

// ---------- levels dialog ----------
function renderLevels() {
  const list = $('levelList');
  list.innerHTML = '';
  levels.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'level';
    b.setAttribute('aria-pressed', selected.has(l.name));
    b.innerHTML = `<strong></strong><span class="sample"></span><small></small>`;
    b.children[0].textContent = l.label;
    b.children[1].textContent = l.words.slice(0, 3).map((w) => w.hanzi).join(' ');
    b.children[2].textContent = l.range ? `${l.range} · ${l.words.length} palabras` : `${l.words.length} palabras`;
    b.onclick = () => {
      selected.has(l.name) ? selected.delete(l.name) : selected.add(l.name);
      b.setAttribute('aria-pressed', selected.has(l.name));
    };
    list.appendChild(b);
  });
}
function openLevels() { renderLevels(); $('levelsDlg').showModal(); }
$('levelsDlg').addEventListener('close', () => { store.set('levels', [...selected]); buildDeck(); });
$('allBtn').onclick = () => { selected = new Set(levels.map((l) => l.name)); renderLevels(); };
$('noneBtn').onclick = () => { selected.clear(); renderLevels(); };
$('levelsBtn').onclick = openLevels;

// ---------- speech ----------
let zhVoice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices().filter((v) => /^zh[-_](CN|Hans)/i.test(v.lang) || v.lang === 'zh');
  zhVoice = vs.find((v) => v.localService) || vs[0] || null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}
function speak() {
  const w = deck[pos];
  if (!w || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(w.hanzi);
  u.lang = 'zh-CN';
  if (zhVoice) u.voice = zhVoice;
  u.rate = 0.8;
  speechSynthesis.speak(u);
}

// ---------- stroke order ----------
let strokeData = null;
async function getStrokeData() {
  if (!strokeData) strokeData = await (await fetch('strokes.json')).json();
  return strokeData;
}
function hideStrokes() {
  $('strokes').hidden = true;
  $('strokes').innerHTML = '';
  $('hanzi').hidden = false;
}
async function showStrokes() {
  const w = deck[pos];
  if (!w || !window.HanziWriter) return;
  const data = await getStrokeData();
  const chars = [...w.hanzi].filter((c) => data[c]);
  if (!chars.length) return;
  const box = $('strokes');
  box.innerHTML = '';
  box.hidden = false;
  $('hanzi').hidden = true;
  const size = Math.floor(Math.min(window.innerWidth * 0.84 / chars.length, window.innerHeight * 0.34, 260));
  const styles = getComputedStyle(document.documentElement);
  const writers = chars.map((c) => {
    const el = document.createElement('div');
    box.appendChild(el);
    return HanziWriter.create(el, c, {
      width: size, height: size, padding: 4,
      strokeColor: styles.getPropertyValue('--fg').trim(),
      radicalColor: styles.getPropertyValue('--accent').trim(),
      outlineColor: styles.getPropertyValue('--line').trim(),
      strokeAnimationSpeed: 1.2,
      delayBetweenStrokes: 250,
      showCharacter: false,
      charDataLoader: (ch, done) => done(data[ch]),
    });
  });
  for (const wr of writers) {
    if (box.hidden) return; // card changed meanwhile
    await wr.animateCharacter();
  }
}

// ---------- theme ----------
function currentTheme() {
  return document.documentElement.dataset.theme
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}
$('themeBtn').onclick = () => {
  const t = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('theme', t); } catch (e) {}
  if (!$('strokes').hidden) showStrokes();
};

// ---------- wiring ----------
$('card').addEventListener('click', advance);
$('nextBtn').onclick = next;
$('speakBtn').onclick = speak;
$('strokeBtn').onclick = () => ($('strokes').hidden ? showStrokes() : hideStrokes());
document.addEventListener('keydown', (e) => {
  if ($('levelsDlg').open) return;
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advance(); }
  else if (e.key === 'ArrowRight') next();
});

(async function init() {
  await loadWords();
  const saved = store.get('levels', null);
  const names = new Set(levels.map((l) => l.name));
  selected = new Set((saved || [levels[0]?.name]).filter((n) => names.has(n)));
  buildDeck();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
