// Hero radar chart: 4 axes × 2 actors (Zelensky vs Putin).
// Reads data/axes.yaml. Re-renders on language change.

const ZELENSKY_COLOR = '#4ea1f3';
const PUTIN_COLOR = '#d9534f';
const MUTED_COLOR = '#9aa3b2';

let chart = null;
let cachedAxes = null;

async function loadAxes() {
  if (cachedAxes) return cachedAxes;
  const res = await fetch('data/axes.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`axes.json load failed: ${res.status}`);
  cachedAxes = await res.json();
  return cachedAxes;
}

function pickAxisTitle(ax, lang) {
  return lang === 'en' ? ax.title_en : ax.title_uk;
}

function buildRadarData(doc, lang) {
  const axes = doc.axes || [];
  return {
    labels: axes.map((a) => `${a.id}. ${pickAxisTitle(a, lang)}`),
    zelensky: axes.map((a) => (a.score_zelensky == null ? 0 : a.score_zelensky)),
    putin: axes.map((a) => (a.score_putin == null ? 0 : a.score_putin)),
    confidence: axes.map((a) => a.confidence || 'unknown'),
  };
}

function setLegend(doc, lang) {
  const ul = document.getElementById('radar-legend');
  if (!ul) return;
  const axes = doc.axes || [];
  const zLabel = lang === 'en' ? 'Zelensky' : 'Зеленський';
  const pLabel = lang === 'en' ? 'Putin' : 'Путін';
  const total_z = axes.reduce((s, a) => s + (a.weight || 0) * (a.score_zelensky || 0), 0);
  const total_p = axes.reduce((s, a) => s + (a.weight || 0) * (a.score_putin || 0), 0);
  ul.innerHTML = `
    <li><span class="swatch" style="background:${ZELENSKY_COLOR}"></span>
      <strong>${zLabel}</strong>: ${total_z.toFixed(0)} / 100</li>
    <li><span class="swatch" style="background:${PUTIN_COLOR}"></span>
      <strong>${pLabel}</strong>: ${total_p.toFixed(0)} / 100</li>
  `;
}

function maxAsOf(doc) {
  const dates = (doc.axes || [])
    .map((a) => a.as_of)
    .filter((d) => typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/));
  if (!dates.length) return null;
  return dates.sort().slice(-1)[0];
}

export async function initRadar(lang) {
  const canvas = document.getElementById('radar-chart');
  const loading = document.querySelector('.hero-radar-wrap .chart-loading');
  if (!canvas) return;
  if (typeof window.Chart === 'undefined') {
    if (loading) loading.textContent = '⚠️ Chart.js CDN failed to load.';
    return;
  }
  let doc;
  try {
    doc = await loadAxes();
  } catch (e) {
    if (loading) loading.textContent = `⚠️ ${e.message}`;
    return;
  }
  const data = buildRadarData(doc, lang);
  if (loading) loading.style.display = 'none';

  if (chart) {
    chart.data.labels = data.labels;
    chart.data.datasets[0].data = data.zelensky;
    chart.data.datasets[1].data = data.putin;
    chart.update();
  } else {
    const ctx = canvas.getContext('2d');
    chart = new window.Chart(ctx, {
      type: 'radar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: lang === 'en' ? 'Zelensky' : 'Зеленський',
            data: data.zelensky,
            borderColor: ZELENSKY_COLOR,
            backgroundColor: ZELENSKY_COLOR + '33',
            pointBackgroundColor: ZELENSKY_COLOR,
            borderWidth: 2,
            pointRadius: 4,
          },
          {
            label: lang === 'en' ? 'Putin' : 'Путін',
            data: data.putin,
            borderColor: PUTIN_COLOR,
            backgroundColor: PUTIN_COLOR + '33',
            pointBackgroundColor: PUTIN_COLOR,
            borderWidth: 2,
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.2,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel(ctx) {
                const axisIdx = ctx.dataIndex;
                const ax = (doc.axes || [])[axisIdx];
                if (!ax) return '';
                const conf = ax.confidence === 'preliminary'
                  ? (lang === 'en' ? ' (preliminary)' : ' (провізорний)')
                  : '';
                return `weight ${(ax.weight * 100).toFixed(0)}%${conf}`;
              },
            },
          },
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { stepSize: 25, color: MUTED_COLOR, backdropColor: 'transparent' },
            grid: { color: '#232936' },
            angleLines: { color: '#232936' },
            pointLabels: {
              color: '#e7ebf2',
              font: { size: 12 },
            },
          },
        },
      },
    });
  }
  setLegend(doc, lang);
  const asOf = maxAsOf(doc);
  if (asOf) {
    const a = document.getElementById('global-as-of');
    const b = document.getElementById('footer-as-of');
    if (a) a.textContent = asOf;
    if (b) b.textContent = asOf;
  }
}
