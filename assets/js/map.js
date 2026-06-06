// World map of international stance on Russian aggression (axis B).
// Four overlays: ES-11/1 vote, ES-11/4 vote, personal Putin sanctions, ICC parties.
// Sidebar shows key documents from icc_un_docs.yaml.

const VOTE_COLORS = {
  yes: '#3aa17a',         // green-ish — voted in support of UA resolution
  abstain: '#f3c34e',     // yellow — abstained
  no: '#d9534f',          // red — voted against
  absent: '#7a8294',      // gray — absent from vote
  unknown: '#3a4150',     // dark gray — no data (non-UN, etc.)
};
const SANCTIONS_COLORS = {
  true: '#4ea1f3',        // blue — imposed personal sanctions on Putin
  false: '#3a4150',
};
const ICC_COLORS = {
  true: '#9a6ad9',        // purple — Rome Statute party (legal duty to arrest)
  false: '#3a4150',
};
const UNKNOWN_COLOR = '#3a4150';
const STROKE_DEFAULT = '#1b1e26';

let map = null;
let geoLayer = null;
let cachedGeo = null;
let cachedStatus = null;
let cachedDocs = null;
let currentView = 'es111';
let currentLang = 'uk';

async function loadGeo() {
  if (cachedGeo) return cachedGeo;
  const res = await fetch('data/world.geojson', { cache: 'force-cache' });
  if (!res.ok) throw new Error(`world.geojson load failed: ${res.status}`);
  cachedGeo = await res.json();
  return cachedGeo;
}

async function loadStatus() {
  if (cachedStatus) return cachedStatus;
  const res = await fetch('data/country_status.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`country_status.json load failed: ${res.status}`);
  const doc = await res.json();
  const byIso = new Map();
  for (const c of doc.countries || []) {
    byIso.set(c.iso3, c);
  }
  cachedStatus = byIso;
  return cachedStatus;
}

async function loadDocs() {
  if (cachedDocs) return cachedDocs;
  const res = await fetch('data/icc_un_docs.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`icc_un_docs.json load failed: ${res.status}`);
  cachedDocs = await res.json();
  return cachedDocs;
}

function getIso(feature) {
  const p = feature.properties || {};
  const iso = p.ISO_A3;
  if (iso && iso !== '-99') return iso;
  return p.ADM0_A3 || null;
}

function getName(feature) {
  const p = feature.properties || {};
  return p.NAME || p.ADMIN || p.SOVEREIGNT || 'Unknown';
}

function styleForFeature(feature, status, view) {
  let color = UNKNOWN_COLOR;
  if (status) {
    if (view === 'es111') color = VOTE_COLORS[status.vote_es111 || 'yes'] || VOTE_COLORS.yes;
    else if (view === 'es114') color = VOTE_COLORS[status.vote_es114 || 'yes'] || VOTE_COLORS.yes;
    else if (view === 'sanctions') color = SANCTIONS_COLORS[status.putin_personal_sanctions ? 'true' : 'false'];
    else if (view === 'icc') color = ICC_COLORS[status.icc_rome_statute ? 'true' : 'false'];
  } else if (view === 'es111' || view === 'es114') {
    // Default for unmentioned countries: voted YES (the majority).
    color = VOTE_COLORS.yes;
  } else {
    color = view === 'sanctions' ? SANCTIONS_COLORS.false : ICC_COLORS.false;
  }
  // Highlight Russia and Ukraine with a thicker stroke for context.
  const iso = getIso(feature);
  const emphasised = iso === 'RUS' || iso === 'UKR';
  return {
    fillColor: color,
    weight: emphasised ? 2 : 0.5,
    color: emphasised ? (iso === 'UKR' ? '#4ea1f3' : '#d9534f') : STROKE_DEFAULT,
    fillOpacity: 0.85,
  };
}

function tooltipHtml(feature, status, view, lang) {
  const name = getName(feature);
  const iso = getIso(feature) || '—';
  const lines = [`<strong>${name}</strong> <span class="iso">${iso}</span>`];
  if (status) {
    const explicitName = lang === 'en' ? status.name_en : status.name_uk;
    if (explicitName && explicitName !== name) {
      lines[0] = `<strong>${explicitName}</strong> <span class="iso">${iso}</span>`;
    }
    const vote111 = status.vote_es111 || 'yes';
    const vote114 = status.vote_es114 || 'yes';
    lines.push(`ES-11/1 (2022): <span class="badge v-${vote111}">${vote111.toUpperCase()}</span>`);
    lines.push(`ES-11/4 (2022): <span class="badge v-${vote114}">${vote114.toUpperCase()}</span>`);
    if (status.putin_personal_sanctions) {
      lines.push(lang === 'en'
        ? '✅ Personal sanctions on Putin'
        : '✅ Персональні санкції на Путіна');
    }
    if (status.icc_rome_statute) {
      lines.push(lang === 'en'
        ? '⚖️ ICC Rome Statute party'
        : '⚖️ Учасник Римського статуту');
    }
  } else {
    lines.push(lang === 'en'
      ? 'ES-11/1: YES (default, 141 states)'
      : 'ES-11/1: YES (за замовчанням, 141 держава)');
  }
  return lines.join('<br>');
}

function renderLegend(view, lang) {
  const el = document.getElementById('map-legend');
  if (!el) return;
  const item = (color, label) =>
    `<li><span class="swatch" style="background:${color}"></span>${label}</li>`;
  let items = '';
  if (view === 'es111' || view === 'es114') {
    items = [
      item(VOTE_COLORS.yes, lang === 'en' ? 'YES (for resolution)' : 'YES (за резолюцію)'),
      item(VOTE_COLORS.abstain, lang === 'en' ? 'Abstained' : 'Утримався'),
      item(VOTE_COLORS.no, lang === 'en' ? 'NO (against)' : 'NO (проти)'),
      item(VOTE_COLORS.absent, lang === 'en' ? 'Absent' : 'Не голосував'),
    ].join('');
  } else if (view === 'sanctions') {
    items = [
      item(SANCTIONS_COLORS.true, lang === 'en'
        ? 'Personal sanctions on Putin'
        : 'Персональні санкції на Путіна'),
      item(SANCTIONS_COLORS.false, lang === 'en' ? 'No personal sanctions' : 'Немає'),
    ].join('');
  } else {
    items = [
      item(ICC_COLORS.true, lang === 'en' ? 'Rome Statute party' : 'Учасник Римського статуту'),
      item(ICC_COLORS.false, lang === 'en' ? 'Not a party' : 'Не учасник'),
    ].join('');
  }
  el.innerHTML = `<ul>${items}</ul>`;
}

function renderDocs(docs, lang) {
  const ul = document.getElementById('docs-list');
  if (!ul) return;
  const list = (docs.documents || []).slice().sort((a, b) =>
    (b.date || '').localeCompare(a.date || ''),
  );
  ul.innerHTML = list.map((d) => {
    const title = lang === 'en' ? d.title_en : d.title_uk;
    const issuer = d.issuer || '';
    const date = d.date || '';
    return `<li>
      <a href="${d.source_url}" target="_blank" rel="noopener noreferrer">
        <span class="doc-meta">${date} · ${issuer}</span>
        <span class="doc-title">${title}</span>
      </a>
    </li>`;
  }).join('');
}

function repaint() {
  if (!geoLayer || !cachedStatus) return;
  geoLayer.setStyle((f) => styleForFeature(f, cachedStatus.get(getIso(f)), currentView));
  geoLayer.eachLayer((layer) => {
    const f = layer.feature;
    layer.unbindTooltip();
    layer.bindTooltip(tooltipHtml(f, cachedStatus.get(getIso(f)), currentView, currentLang),
      { sticky: true, direction: 'auto', className: 'country-tooltip' });
  });
  renderLegend(currentView, currentLang);
}

export async function initMap(lang) {
  currentLang = lang;
  const container = document.getElementById('map-recognition');
  if (!container) return;
  const loading = container.querySelector('.chart-loading');

  if (typeof window.L === 'undefined') {
    if (loading) loading.textContent = '⚠️ Leaflet CDN failed to load.';
    return;
  }

  let geo, status, docs;
  try {
    [geo, status, docs] = await Promise.all([loadGeo(), loadStatus(), loadDocs()]);
  } catch (e) {
    if (loading) loading.textContent = `⚠️ ${e.message}`;
    return;
  }

  if (loading) loading.remove();
  renderDocs(docs, lang);

  if (!map) {
    map = window.L.map(container, {
      center: [25, 15],
      zoom: 1,
      minZoom: 1,
      maxZoom: 5,
      worldCopyJump: true,
      attributionControl: false,
      zoomControl: true,
    });
    window.L.control.attribution({ prefix: false })
      .addAttribution('Natural Earth · OpenStreetMap · ICC · UN')
      .addTo(map);

    geoLayer = window.L.geoJSON(geo, {
      style: (f) => styleForFeature(f, status.get(getIso(f)), currentView),
      onEachFeature: (f, layer) => {
        layer.bindTooltip(tooltipHtml(f, status.get(getIso(f)), currentView, currentLang),
          { sticky: true, direction: 'auto', className: 'country-tooltip' });
      },
    }).addTo(map);
  }

  renderLegend(currentView, currentLang);
  repaint();

  document.querySelectorAll('input[name="map-view"]').forEach((input) => {
    input.onchange = () => {
      currentView = input.value;
      repaint();
    };
  });
}
