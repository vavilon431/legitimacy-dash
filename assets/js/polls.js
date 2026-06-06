// Polls chart: trust ratings for Zelensky (UA) and Putin (RU).
// Plotly time series with confidence-interval ribbons + event annotations.
// Plotly (~3.5MB) is lazy-loaded when the section enters the viewport.

const PLOTLY_SRC = 'https://cdn.plot.ly/plotly-2.35.2.min.js';
let plotlyPromise = null;

function loadPlotly() {
  if (window.Plotly) return Promise.resolve();
  if (plotlyPromise) return plotlyPromise;
  plotlyPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PLOTLY_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Plotly CDN failed to load'));
    document.head.appendChild(s);
  });
  return plotlyPromise;
}

const POLLSTER_COLORS = {
  KIIS: '#4ea1f3',
  Razumkov: '#5fb18a',
  Rating: '#9aa9d9',
  Levada: '#d9534f',
  VTsIOM: '#f3994e',
  FOM: '#cf6a87',
};
const POLLSTER_DASH = {
  // State-owned pollsters → dashed line; independent → solid.
  KIIS: 'solid',
  Razumkov: 'solid',
  Rating: 'solid',
  Levada: 'solid',
  VTsIOM: 'dash',
  FOM: 'dash',
};

let cachedUA = null;
let cachedRU = null;
let cachedEvents = null;

async function loadRows(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path} load failed: ${res.status}`);
  const doc = await res.json();
  return doc.rows || [];
}

function groupBy(rows, key) {
  const map = new Map();
  for (const r of rows) {
    const k = r[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  return map;
}

async function loadEvents() {
  if (cachedEvents) return cachedEvents;
  const res = await fetch('data/events.json', { cache: 'no-cache' });
  if (!res.ok) return [];
  const doc = await res.json();
  cachedEvents = (doc.events || []).filter((e) =>
    e.axis === 'A' && ['election', 'other', 'territorial'].includes(e.type),
  );
  return cachedEvents;
}

function buildTraces(rows, lang) {
  const byPollster = groupBy(rows, 'pollster');
  const traces = [];
  byPollster.forEach((entries, pollster) => {
    entries.sort((a, b) => a.date.localeCompare(b.date));
    const xs = entries.map((e) => e.date);
    const ys = entries.map((e) => parseFloat(e.trust_pct));
    const moe = entries.map((e) => parseFloat(e.margin_error_pct || '0'));
    const samples = entries.map((e) => e.sample_n);
    const notes = entries.map((e) => e.notes || '');
    const color = POLLSTER_COLORS[pollster] || '#9aa3b2';
    const dash = POLLSTER_DASH[pollster] || 'solid';
    const isState = (entries[0].pollster_type === 'state');
    const labelTag = isState
      ? (lang === 'en' ? ' (state)' : ' (державний)')
      : '';

    // Confidence ribbon (upper bound)
    traces.push({
      x: xs,
      y: ys.map((v, i) => Math.min(100, v + moe[i])),
      mode: 'lines',
      line: { width: 0 },
      hoverinfo: 'skip',
      showlegend: false,
      name: `${pollster} upper`,
    });
    // Confidence ribbon (lower bound, fill to upper)
    traces.push({
      x: xs,
      y: ys.map((v, i) => Math.max(0, v - moe[i])),
      mode: 'lines',
      line: { width: 0 },
      fill: 'tonexty',
      fillcolor: color + '22',
      hoverinfo: 'skip',
      showlegend: false,
      name: `${pollster} lower`,
    });
    // Main line + markers
    traces.push({
      x: xs,
      y: ys,
      mode: 'lines+markers',
      line: { color, width: 2.4, dash, shape: 'linear' },
      marker: { color, size: 6 },
      name: pollster + labelTag,
      customdata: notes.map((n, i) => [samples[i], moe[i], n]),
      hovertemplate:
        '<b>%{x}</b><br>' + pollster + labelTag +
        '<br>trust: %{y}%' +
        '<br>n=%{customdata[0]}, MoE ±%{customdata[1]}%' +
        '<br>%{customdata[2]}<extra></extra>',
    });
  });
  return traces;
}

function buildEventShapesAndAnnotations(events, lang, yMax = 100) {
  const shapes = [];
  const annotations = [];
  // Pick the most impactful events to highlight: invasion, term-end, election 2024.
  const keys = new Set([
    'zelensky-2022-martial-law-imposed',
    'zelensky-2024-no-election',
    'putin-2024-election-occupied-territories',
    'putin-2020-constitutional-reset',
  ]);
  for (const ev of events) {
    if (!keys.has(ev.id)) continue;
    shapes.push({
      type: 'line',
      x0: ev.date,
      x1: ev.date,
      y0: 0,
      y1: yMax,
      line: { color: '#9aa3b2', width: 1, dash: 'dot' },
    });
    annotations.push({
      x: ev.date,
      y: yMax * 0.97,
      yref: 'y',
      xref: 'x',
      text: (lang === 'en' ? ev.title_en : ev.title_uk).slice(0, 38) + '…',
      showarrow: false,
      font: { size: 10, color: '#9aa3b2' },
      textangle: -90,
      xanchor: 'left',
      yanchor: 'top',
    });
  }
  return { shapes, annotations };
}

async function renderPolls(container, lang) {
  const loading = container.querySelector('.chart-loading');
  try {
    await loadPlotly();
  } catch (e) {
    if (loading) loading.textContent = `⚠️ ${e.message}`;
    return;
  }
  let ua, ru, events;
  try {
    [ua, ru, events] = await Promise.all([
      cachedUA || (cachedUA = await loadRows('data/polls_ua.json')),
      cachedRU || (cachedRU = await loadRows('data/polls_ru.json')),
      loadEvents(),
    ]);
  } catch (e) {
    if (loading) loading.textContent = `⚠️ ${e.message}`;
    return;
  }

  if (loading) loading.remove();
  while (container.firstChild) container.removeChild(container.firstChild);

  const traces = [...buildTraces(ua, lang), ...buildTraces(ru, lang)];
  const { shapes, annotations } = buildEventShapesAndAnnotations(events, lang, 100);

  const layout = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    margin: { t: 20, r: 20, b: 50, l: 50 },
    font: { color: '#e7ebf2', family: 'Inter, sans-serif' },
    xaxis: {
      type: 'date',
      gridcolor: '#232936',
      zerolinecolor: '#232936',
      range: ['2021-09-01', '2026-06-30'],
    },
    yaxis: {
      title: lang === 'en' ? 'Trust / approval, %' : 'Довіра / схвалення, %',
      range: [0, 100],
      gridcolor: '#232936',
      zerolinecolor: '#232936',
    },
    legend: {
      orientation: 'h',
      y: -0.2,
      bgcolor: 'transparent',
      font: { color: '#e7ebf2' },
    },
    shapes,
    annotations,
    hovermode: 'closest',
  };

  const config = {
    displayModeBar: false,
    responsive: true,
  };

  window.Plotly.newPlot(container, traces, layout, config);
}

let observer = null;
let rendered = false;
let pendingLang = null;

export async function initPolls(lang) {
  const container = document.getElementById('polls-chart');
  if (!container) return;
  pendingLang = lang;
  if (rendered) {
    // Already mounted — re-render in place with new language.
    await renderPolls(container, lang);
    return;
  }
  if (observer) return;
  if (typeof IntersectionObserver === 'undefined') {
    rendered = true;
    await renderPolls(container, lang);
    return;
  }
  observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      observer.disconnect();
      observer = null;
      rendered = true;
      renderPolls(container, pendingLang || lang);
    }
  }, { rootMargin: '200px 0px' });
  observer.observe(container);
}
