// Bootstrap: i18n, language switcher, section initialisers.
// Single-page runtime. Sections register themselves via init(lang, data).

import { initRadar } from './radar.js';
import { initTimeline } from './timeline.js';
import { initMap } from './map.js';
import { initPolls } from './polls.js';
import { initIndices } from './indices.js';
import { initMethodology } from './methodology.js';

const SUPPORTED_LANGS = ['uk', 'en'];
const DEFAULT_LANG = document.documentElement.dataset.defaultLang || 'uk';
const STORAGE_KEY = 'legitimacy-dash.lang';

function pickInitialLang() {
  const fromQuery = new URLSearchParams(location.search).get('lang');
  if (SUPPORTED_LANGS.includes(fromQuery)) return fromQuery;
  const fromStorage = localStorage.getItem(STORAGE_KEY);
  if (SUPPORTED_LANGS.includes(fromStorage)) return fromStorage;
  const fromNav = (navigator.language || '').slice(0, 2).toLowerCase();
  if (SUPPORTED_LANGS.includes(fromNav)) return fromNav;
  return DEFAULT_LANG;
}

function getByPath(obj, path) {
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

async function loadStrings(lang) {
  const res = await fetch(`assets/i18n/${lang}.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`i18n ${lang} load failed: ${res.status}`);
  return res.json();
}

function applyStrings(strings) {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    const val = getByPath(strings, key);
    if (val == null) return;
    const attr = el.dataset.i18nAttr;
    if (attr) el.setAttribute(attr, val);
    else el.textContent = val;
  });
}

function setLangButtons(lang) {
  document.querySelectorAll('.lang-switcher button').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
  });
}

async function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) lang = DEFAULT_LANG;
  const strings = await loadStrings(lang);
  document.documentElement.lang = lang;
  applyStrings(strings);
  setLangButtons(lang);
  localStorage.setItem(STORAGE_KEY, lang);
  const url = new URL(location.href);
  if (url.searchParams.get('lang') !== lang) {
    url.searchParams.set('lang', lang);
    history.replaceState(null, '', url);
  }
  return strings;
}

function setAsOf(date) {
  const formatted = date || '—';
  const a = document.getElementById('global-as-of');
  const b = document.getElementById('footer-as-of');
  if (a) a.textContent = formatted;
  if (b) b.textContent = formatted;
}

async function renderSections(lang) {
  // Modules are independent and may fail individually; don't let one block others.
  await Promise.allSettled([
    initRadar(lang),
    initTimeline(lang),
    initMap(lang),
    initPolls(lang),
    initIndices(lang),
    initMethodology(lang),
  ]);
}

async function init() {
  const lang = pickInitialLang();
  await setLang(lang);

  document.querySelectorAll('.lang-switcher button').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const nextLang = btn.dataset.lang;
      await setLang(nextLang);
      await renderSections(nextLang);
    });
  });

  setAsOf('—');
  await renderSections(lang);
}

document.addEventListener('DOMContentLoaded', init);
