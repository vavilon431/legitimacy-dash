// Elections timeline: vis-timeline of events.yaml where type=election.
// Two groups: Zelensky / Putin. Click → opens primary source.

let timeline = null;
let cachedEvents = null;

async function loadEvents() {
  if (cachedEvents) return cachedEvents;
  const res = await fetch('data/events.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`events.json load failed: ${res.status}`);
  cachedEvents = await res.json();
  return cachedEvents;
}

function pickEventTitle(ev, lang) {
  return lang === 'en' ? ev.title_en : ev.title_uk;
}

function pickEventDescription(ev, lang) {
  return lang === 'en' ? ev.description_en : ev.description_uk;
}

function buildItemsAndGroups(doc, lang) {
  const events = (doc.events || []).filter((e) => e.type === 'election');
  const zLabel = lang === 'en' ? 'Zelensky' : 'Зеленський';
  const pLabel = lang === 'en' ? 'Putin' : 'Путін';
  const groups = [
    { id: 'zelensky', content: zLabel, className: 'group-zelensky' },
    { id: 'putin', content: pLabel, className: 'group-putin' },
  ];
  const items = events.map((ev) => {
    const title = pickEventTitle(ev, lang);
    const desc = pickEventDescription(ev, lang);
    const escapedTitle = (title || '').replace(/"/g, '&quot;');
    const escapedDesc = (desc || '').replace(/"/g, '&quot;');
    return {
      id: ev.id,
      group: ev.actor,
      start: ev.date,
      content: title,
      title: `${title}\n\n${desc}`,
      className: `event-${ev.actor} impact-${ev.impact || 'neutral'}`,
      _source_url: ev.source_url,
      _source_title: ev.source_title,
      _escapedDesc: escapedDesc,
      _escapedTitle: escapedTitle,
    };
  });
  return { items, groups };
}

export async function initTimeline(lang) {
  const container = document.getElementById('timeline-elections');
  const loading = container ? container.querySelector('.chart-loading') : null;
  if (!container) return;
  if (typeof window.vis === 'undefined') {
    if (loading) loading.textContent = '⚠️ vis-timeline CDN failed to load.';
    return;
  }
  let doc;
  try {
    doc = await loadEvents();
  } catch (e) {
    if (loading) loading.textContent = `⚠️ ${e.message}`;
    return;
  }
  const { items, groups } = buildItemsAndGroups(doc, lang);
  if (loading) loading.remove();

  if (timeline) {
    timeline.setGroups(new window.vis.DataSet(groups));
    timeline.setItems(new window.vis.DataSet(items));
    return;
  }

  // Fresh mount: vis-timeline needs an empty container.
  while (container.firstChild) container.removeChild(container.firstChild);
  const mount = document.createElement('div');
  mount.className = 'timeline-mount';
  container.appendChild(mount);

  timeline = new window.vis.Timeline(
    mount,
    new window.vis.DataSet(items),
    new window.vis.DataSet(groups),
    {
      stack: false,
      orientation: { axis: 'bottom' },
      margin: { item: { vertical: 10 } },
      zoomMin: 1000 * 60 * 60 * 24 * 365,        // 1 year min
      zoomMax: 1000 * 60 * 60 * 24 * 365 * 35,   // 35 years max
      start: '1999-06-01',
      end: '2026-12-31',
      tooltip: { followMouse: true },
    },
  );

  timeline.on('select', (props) => {
    if (!props.items || !props.items.length) return;
    const id = props.items[0];
    const item = items.find((i) => i.id === id);
    if (item && item._source_url) {
      window.open(item._source_url, '_blank', 'noopener,noreferrer');
    }
  });
}
