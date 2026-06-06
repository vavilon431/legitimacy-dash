// Methodology section: aggregation formula, axis summary table,
// per-axis component breakdown with clickable evidence links.
// Pulls from data/axes.json + events.json + icc_un_docs.json.

let cachedAxes = null;
let cachedEvidence = null;

async function loadAxes() {
  if (cachedAxes) return cachedAxes;
  const res = await fetch('data/axes.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`axes.json load failed: ${res.status}`);
  cachedAxes = await res.json();
  return cachedAxes;
}

async function loadEvidence() {
  if (cachedEvidence) return cachedEvidence;
  const [evRes, docRes] = await Promise.all([
    fetch('data/events.json', { cache: 'no-cache' }),
    fetch('data/icc_un_docs.json', { cache: 'no-cache' }),
  ]);
  const events = (await evRes.json()).events || [];
  const docs = (await docRes.json()).documents || [];
  const byId = new Map();
  events.forEach((e) => byId.set(e.id, {
    title_uk: e.title_uk, title_en: e.title_en,
    source_url: e.source_url, source_title: e.source_title,
  }));
  docs.forEach((d) => byId.set(d.id, {
    title_uk: d.title_uk, title_en: d.title_en,
    source_url: d.source_url,
  }));
  cachedEvidence = byId;
  return cachedEvidence;
}

function t(strings, key) {
  return key.split('.').reduce((a, k) => (a == null ? a : a[k]), strings);
}

function fmtNum(v, digits = 0) {
  if (v == null || Number.isNaN(v)) return '—';
  return Number(v).toFixed(digits);
}

function confidenceLabel(conf, strings) {
  return t(strings, `methodology.confidence.${conf || 'unknown'}`) || conf || '—';
}

function buildSummaryTable(axes, strings, lang) {
  const totalWeight = axes.reduce((s, a) => s + (a.weight || 0), 0);
  const totalZ = axes.reduce((s, a) => s + (a.weight || 0) * (a.score_zelensky || 0), 0);
  const totalP = axes.reduce((s, a) => s + (a.weight || 0) * (a.score_putin || 0), 0);
  const rows = axes.map((a) => {
    const title = lang === 'en' ? a.title_en : a.title_uk;
    return `
      <tr>
        <th scope="row"><span class="axis-pill">${a.id}</span> ${title}</th>
        <td>${fmtNum(a.weight, 2)}</td>
        <td class="score score-z">${fmtNum(a.score_zelensky)}</td>
        <td class="score score-p">${fmtNum(a.score_putin)}</td>
        <td class="conf conf-${a.confidence || 'unknown'}">${confidenceLabel(a.confidence, strings)}</td>
        <td class="as-of">${a.as_of || '—'}</td>
      </tr>
    `;
  }).join('');
  return `
    <table class="axis-summary">
      <thead>
        <tr>
          <th scope="col">${t(strings, 'methodology.col_axis')}</th>
          <th scope="col">${t(strings, 'methodology.col_weight')}</th>
          <th scope="col">${t(strings, 'methodology.col_points_z')}</th>
          <th scope="col">${t(strings, 'methodology.col_points_p')}</th>
          <th scope="col">${t(strings, 'methodology.col_confidence')}</th>
          <th scope="col">${t(strings, 'methodology.col_as_of')}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <th scope="row">${t(strings, 'methodology.col_total')}</th>
          <td>${fmtNum(totalWeight, 2)}</td>
          <td class="score score-z">${fmtNum(totalZ)}</td>
          <td class="score score-p">${fmtNum(totalP)}</td>
          <td colspan="2" class="gap">
            ${t(strings, 'methodology.gap_label')}: ${fmtNum(totalZ - totalP)}
          </td>
        </tr>
      </tfoot>
    </table>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function evidenceLinks(ids, evidence, lang) {
  if (!ids || !ids.length) return '<span class="muted">—</span>';
  return ids.map((id) => {
    const ev = evidence.get(id);
    if (!ev) return `<span class="evidence-bad" title="${id}">${id}</span>`;
    const title = (lang === 'en' ? ev.title_en : ev.title_uk) || id;
    const url = ev.source_url || '#';
    return `<a class="evidence-link" href="${escapeHtml(url)}"
              target="_blank" rel="noopener noreferrer"
              title="${escapeHtml(title)}">${id}</a>`;
  }).join(' ');
}

function buildAxisDetails(ax, evidence, strings, lang) {
  const title = lang === 'en' ? ax.title_en : ax.title_uk;
  const components = ax.components || [];
  const rows = components.map((c) => {
    const ctitle = lang === 'en' ? c.title_en : c.title_uk;
    const notes = (c.notes || '').trim();
    const notesHtml = notes
      ? `<tr class="notes-row"><td colspan="5"><pre class="notes">${escapeHtml(notes)}</pre></td></tr>`
      : '';
    return `
      <tr>
        <td><code>${c.id}</code></td>
        <td class="comp-title">${escapeHtml(ctitle || '')}</td>
        <td>${fmtNum(c.weight, 2)}</td>
        <td class="score score-z">${fmtNum(c.point_zelensky)}</td>
        <td class="score score-p">${fmtNum(c.point_putin)}</td>
      </tr>
      <tr class="evidence-row">
        <td></td>
        <td colspan="4">
          <span class="ev-label">${t(strings, 'methodology.col_evidence')}:</span>
          ${evidenceLinks(c.evidence_ids, evidence, lang)}
        </td>
      </tr>
      ${notesHtml}
    `;
  }).join('');
  const formula = (ax.formula || '').trim();
  return `
    <details class="axis-detail" data-axis="${ax.id}">
      <summary>
        <span class="axis-pill">${ax.id}</span>
        <span class="ax-title">${escapeHtml(title || '')}</span>
        <span class="ax-meta">${t(strings, 'methodology.col_weight')} ${fmtNum(ax.weight, 2)} ·
          Z ${fmtNum(ax.score_zelensky)} · P ${fmtNum(ax.score_putin)}</span>
      </summary>
      ${formula ? `<pre class="formula">${escapeHtml(formula)}</pre>` : ''}
      <table class="component-table">
        <thead>
          <tr>
            <th scope="col">${t(strings, 'methodology.col_id')}</th>
            <th scope="col">${t(strings, 'methodology.col_component')}</th>
            <th scope="col">${t(strings, 'methodology.col_weight')}</th>
            <th scope="col">${t(strings, 'methodology.col_points_z')}</th>
            <th scope="col">${t(strings, 'methodology.col_points_p')}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </details>
  `;
}

async function loadStrings(lang) {
  const res = await fetch(`assets/i18n/${lang}.json`, { cache: 'no-cache' });
  return res.ok ? res.json() : {};
}

export async function initMethodology(lang) {
  const container = document.getElementById('methodology-detail');
  if (!container) return;
  let axesDoc, evidence, strings;
  try {
    [axesDoc, evidence, strings] = await Promise.all([
      loadAxes(), loadEvidence(), loadStrings(lang),
    ]);
  } catch (e) {
    container.innerHTML = `<p class="chart-loading">⚠️ ${e.message}</p>`;
    return;
  }
  const axes = axesDoc.axes || [];
  const summary = buildSummaryTable(axes, strings, lang);
  const details = axes.map((a) => buildAxisDetails(a, evidence, strings, lang)).join('');
  container.innerHTML = `
    <div class="formula-block">
      <h3>${t(strings, 'methodology.formula_title')}</h3>
      <p class="formula-line">
        Total = ${axes.map((a) => `${fmtNum(a.weight, 2)}·${a.id}`).join(' + ')}
      </p>
    </div>
    ${summary}
    <div class="axes-details">
      <h3>${t(strings, 'methodology.details_title')}</h3>
      ${details}
    </div>
  `;
}
