// Historical legitimacy score, quarterly 2022-Q1..2026-Q2 for Zelensky vs Putin.
// Chart.js line chart. Two series + annotation markers for inflection points.

const ZELENSKY_COLOR = '#4ea1f3';
const PUTIN_COLOR = '#d9534f';
const MUTED_COLOR = '#9aa3b2';

let chart = null;
let cached = null;

async function loadHistory() {
  if (cached) return cached;
  const res = await fetch('data/legitimacy_history.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`legitimacy_history.json load failed: ${res.status}`);
  const doc = await res.json();
  cached = doc.rows || [];
  return cached;
}

function buildSeries(rows) {
  const quarters = [...new Set(rows.map((r) => r.quarter))].filter(Boolean).sort();
  const get = (q, actor) => {
    const e = rows.find((r) => r.quarter === q && r.actor === actor);
    return e ? e.total : null;
  };
  return {
    labels: quarters,
    zelensky: quarters.map((q) => get(q, 'zelensky')),
    putin: quarters.map((q) => get(q, 'putin')),
  };
}

// Inflection points to annotate on the time axis.
const MARKERS = {
  '2022-Q1': { uk: 'Вторгнення', en: 'Invasion' },
  '2022-Q3': { uk: 'Харків', en: 'Kharkiv push' },
  '2023-Q1': { uk: 'Ордер ICC', en: 'ICC warrant' },
  '2024-Q2': { uk: 'Кінець терміну Z', en: 'Z mandate ends' },
};

function markerPlugin(lang) {
  return {
    id: 'history-markers',
    afterDatasetsDraw(c) {
      const { ctx, chartArea, scales } = c;
      ctx.save();
      ctx.font = '11px sans-serif';
      ctx.fillStyle = MUTED_COLOR;
      ctx.strokeStyle = '#3a4150';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      const labels = c.data.labels || [];
      labels.forEach((label, i) => {
        const m = MARKERS[label];
        if (!m) return;
        const x = scales.x.getPixelForValue(i);
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();
        ctx.save();
        ctx.translate(x + 4, chartArea.top + 6);
        ctx.fillText(m[lang] || m.uk, 0, 0);
        ctx.restore();
      });
      ctx.restore();
    },
  };
}

export async function initHistory(lang) {
  const container = document.getElementById('history-chart');
  if (!container) return;
  const loading = container.querySelector('.chart-loading');
  if (typeof window.Chart === 'undefined') {
    if (loading) loading.textContent = '⚠️ Chart.js failed to load.';
    return;
  }
  let rows;
  try {
    rows = await loadHistory();
  } catch (e) {
    if (loading) loading.textContent = `⚠️ ${e.message}`;
    return;
  }
  if (loading) loading.remove();

  // Mount fresh canvas if not present.
  if (!document.getElementById('history-canvas')) {
    while (container.firstChild) container.removeChild(container.firstChild);
    const c = document.createElement('canvas');
    c.id = 'history-canvas';
    container.appendChild(c);
  }

  const series = buildSeries(rows);
  const labelZ = lang === 'en' ? 'Zelensky' : 'Зеленський';
  const labelP = lang === 'en' ? 'Putin' : 'Путін';

  const data = {
    labels: series.labels,
    datasets: [
      {
        label: labelZ,
        data: series.zelensky,
        borderColor: ZELENSKY_COLOR,
        backgroundColor: ZELENSKY_COLOR + '22',
        tension: 0.25,
        pointRadius: 3,
        borderWidth: 2.4,
      },
      {
        label: labelP,
        data: series.putin,
        borderColor: PUTIN_COLOR,
        backgroundColor: PUTIN_COLOR + '22',
        tension: 0.25,
        pointRadius: 3,
        borderWidth: 2.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      title: {
        display: true,
        text: lang === 'en'
          ? 'Legitimacy total score, quarterly (2022-Q1 — 2026-Q2)'
          : 'Сукупний бал легітимності, квартально (2022-Q1 — 2026-Q2)',
        color: '#e7ebf2',
        font: { size: 13, weight: '600' },
      },
      legend: {
        position: 'bottom',
        labels: { color: '#e7ebf2' },
      },
      tooltip: {
        callbacks: {
          label(ctx) {
            const v = ctx.parsed.y;
            return `${ctx.dataset.label}: ${v == null ? '—' : v.toFixed(1)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#232936' },
        ticks: { color: MUTED_COLOR, maxRotation: 45, minRotation: 0 },
      },
      y: {
        min: 30,
        max: 100,
        grid: { color: '#232936' },
        ticks: { color: MUTED_COLOR },
      },
    },
  };

  const canvas = document.getElementById('history-canvas');
  if (chart) chart.destroy();
  chart = new window.Chart(canvas, {
    type: 'line',
    data,
    options,
    plugins: [markerPlugin(lang)],
  });
}
