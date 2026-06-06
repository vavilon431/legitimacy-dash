// Indices chart: V-Dem / Freedom House / RSF / Territorial control.
// Chart.js multi-line. Radio buttons switch between indices.
// Indices are yearly (2019-2025); territory is quarterly (2022-Q1..2026-Q2).

const UA_COLOR = '#4ea1f3';
const RU_COLOR = '#d9534f';

// Distinct colors per territory source, so 3 lines stay readable on dark BG.
const TERRITORY_SOURCE_COLORS = {
  ISW: '#4ea1f3',
  DeepStateMAP: '#f3c34e',
  BlackBirdGroup: '#5fb18a',
};

let chart = null;
let cachedIndices = null;
let cachedTerritory = null;
let currentIndex = 'vdem_liberal';
let currentLang = 'uk';

async function loadRows(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path} load failed: ${res.status}`);
  const doc = await res.json();
  return doc.rows || [];
}

function buildIndexSeries(rows, indexKey) {
  const filtered = rows
    .filter((r) => r.index === indexKey)
    .map((r) => ({ year: r.year, country: r.country, value: r.value }));
  const xs = [...new Set(filtered.map((r) => r.year))].sort();
  const get = (year, country) => {
    const e = filtered.find((r) => r.year === year && r.country === country);
    return e ? e.value : null;
  };
  return {
    labels: xs.map(String),
    ua: xs.map((y) => get(y, 'UA')),
    ru: xs.map((y) => get(y, 'RU')),
    scale: filtered[0] ? (filtered[0].value <= 1 ? '0-1' : '0-100') : '0-100',
  };
}

function buildTerritorySeries(rows) {
  const quarters = [...new Set(rows.map((r) => r.quarter))]
    .filter(Boolean).sort();
  const sources = [...new Set(rows.map((r) => r.source))]
    .filter(Boolean).sort();
  const sourceData = {};
  sources.forEach((src) => {
    sourceData[src] = quarters.map((q) => {
      const found = rows.find((r) => r.quarter === q && r.source === src);
      return found ? found.ua_control_pct : null;
    });
  });
  return { labels: quarters, sources, sourceData, scale: '0-100' };
}

function indexLabel(key, lang) {
  const map = {
    vdem_liberal: 'V-Dem Liberal Democracy',
    vdem_electoral: 'V-Dem Electoral Democracy',
    fh_global: 'Freedom House Global Freedom',
    rsf_press_freedom: 'RSF Press Freedom',
    territory: lang === 'en'
      ? 'Territorial control (% of internationally recognized UA territory)'
      : 'Контроль території (% від міжнародно визнаної території УКР)',
  };
  return map[key] || key;
}

function getSeries(indexKey) {
  if (indexKey === 'territory') {
    return buildTerritorySeries(cachedTerritory || []);
  }
  return buildIndexSeries(cachedIndices || [], indexKey);
}

function render(lang) {
  const canvas = document.getElementById('indices-canvas');
  if (!canvas) return;
  const series = getSeries(currentIndex);
  const maxY = series.scale === '0-1' ? 1 : 100;

  let data;
  if (currentIndex === 'territory') {
    // Each source becomes its own line — readers see the spread between
    // analytic groups instead of a single number.
    data = {
      labels: series.labels,
      datasets: (series.sources || []).map((src) => ({
        label: `${src} (UA)`,
        data: series.sourceData[src],
        borderColor: TERRITORY_SOURCE_COLORS[src] || UA_COLOR,
        backgroundColor: (TERRITORY_SOURCE_COLORS[src] || UA_COLOR) + '22',
        tension: 0.2,
        spanGaps: true,
        pointRadius: 3,
        borderWidth: 2,
      })),
    };
  } else {
    const labelUa = lang === 'en' ? 'Ukraine' : 'Україна';
    const labelRu = lang === 'en' ? 'Russia' : 'Росія';
    data = {
      labels: series.labels,
      datasets: [
        {
          label: labelUa,
          data: series.ua,
          borderColor: UA_COLOR,
          backgroundColor: UA_COLOR + '22',
          tension: 0.2,
          spanGaps: true,
          pointRadius: 4,
        },
        {
          label: labelRu,
          data: series.ru,
          borderColor: RU_COLOR,
          backgroundColor: RU_COLOR + '22',
          tension: 0.2,
          spanGaps: true,
          pointRadius: 4,
        },
      ],
    };
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: indexLabel(currentIndex, lang),
        color: '#e7ebf2',
        font: { size: 14, weight: '600' },
      },
      legend: {
        position: 'bottom',
        labels: { color: '#e7ebf2' },
      },
      tooltip: {
        callbacks: {
          label(ctx) {
            const v = ctx.parsed.y;
            const suffix = currentIndex === 'territory' ? '%' : '';
            return `${ctx.dataset.label}: ${v == null ? '—' : v}${suffix}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#232936' },
        ticks: { color: '#9aa3b2', maxRotation: 45, minRotation: 0 },
      },
      y: {
        // Territory values cluster between 78-86%; a 0-100 scale wastes space.
        min: currentIndex === 'territory' ? 75 : 0,
        max: currentIndex === 'territory' ? 90 : maxY,
        grid: { color: '#232936' },
        ticks: { color: '#9aa3b2' },
      },
    },
  };

  if (chart) {
    chart.data = data;
    chart.options = options;
    chart.update();
  } else {
    chart = new window.Chart(canvas, { type: 'line', data, options });
  }
}

export async function initIndices(lang) {
  currentLang = lang;
  const container = document.getElementById('indices-chart');
  if (!container) return;
  const loading = container.querySelector('.chart-loading');
  if (typeof window.Chart === 'undefined') {
    if (loading) loading.textContent = '⚠️ Chart.js failed to load.';
    return;
  }
  try {
    if (!cachedIndices) cachedIndices = await loadRows('data/indices.json');
    if (!cachedTerritory) {
      try {
        cachedTerritory = await loadRows('data/territory_control.json');
      } catch {
        cachedTerritory = [];
      }
    }
  } catch (e) {
    if (loading) loading.textContent = `⚠️ ${e.message}`;
    return;
  }
  if (loading) loading.remove();

  // Mount fresh canvas if not present
  if (!document.getElementById('indices-canvas')) {
    while (container.firstChild) container.removeChild(container.firstChild);
    const c = document.createElement('canvas');
    c.id = 'indices-canvas';
    container.appendChild(c);
  }

  render(lang);

  document.querySelectorAll('input[name="index-view"]').forEach((input) => {
    input.onchange = () => {
      currentIndex = input.value;
      render(currentLang);
    };
  });
}
