'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
let map, timelineChart, topIpsChart, countryChart;
const mapMarkers = [];
let _mapNotice = null;

let _stats        = {};
let _eventsPage   = 0;
const PAGE_SIZE   = 50;
let _eventsTotal  = 0;
let _activeFilter = {};
let _liveMax      = 200;   // max rows kept in live feed before trimming

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMatrix();
  initClock();
  initMap();
  initCharts();
  initSocket();
  refresh();
  setInterval(refresh, 30_000);
});

// ─── Socket.IO live feed ──────────────────────────────────────────────────────
function initSocket() {
  const socket = io({ transports: ['websocket', 'polling'] });
  const dot    = document.getElementById('ws-dot');
  const label  = document.getElementById('ws-status');

  socket.on('connect', () => {
    dot.style.background = 'var(--green)';
    dot.style.boxShadow  = '0 0 6px var(--green)';
    label.textContent    = 'LIVE';
  });

  socket.on('disconnect', () => {
    dot.style.background = 'var(--red)';
    dot.style.boxShadow  = '0 0 6px var(--red)';
    label.textContent    = 'RECONNECTING…';
  });

  socket.on('new_event', (e) => {
    if (_eventsPage === 0) prependEventRow(e);
    liveStatIncrement(e);
    if (e.lat && e.lon) addMapMarker(e);
  });
}

// ─── Matrix Rain ──────────────────────────────────────────────────────────────
function initMatrix() {
  const canvas = document.getElementById('matrix-bg');
  const ctx    = canvas.getContext('2d');
  const CHARS  = '01アカサタナハイウエオ';
  const SIZE   = 14;
  let W, H, drops;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    const cols = Math.ceil(W / SIZE);
    drops = Array.from({ length: cols }, () => Math.random() * -(H / SIZE));
  }

  function draw() {
    ctx.fillStyle = 'rgba(0, 6, 0, 0.045)';
    ctx.fillRect(0, 0, W, H);
    ctx.font = `${SIZE}px "Share Tech Mono", monospace`;
    drops.forEach((y, i) => {
      const char  = CHARS[Math.floor(Math.random() * CHARS.length)];
      const alpha = 0.04 + Math.random() * 0.12;
      ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;
      ctx.fillText(char, i * SIZE, y * SIZE);
      if (y * SIZE > H && Math.random() > 0.978) drops[i] = 0;
      drops[i] += 0.6;
    });
  }

  resize();
  window.addEventListener('resize', resize);
  setInterval(draw, 55);
}

// ─── Clock ────────────────────────────────────────────────────────────────────
function initClock() {
  function tick() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('clock').textContent =
      `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }
  tick();
  setInterval(tick, 1000);
}

// ─── Threat Level ─────────────────────────────────────────────────────────────
const THREAT_LEVELS = [
  { min: 0,   label: 'MINIMAL',  color: '#00ff41', pct: 12 },
  { min: 20,  label: 'MODERATE', color: '#80ff00', pct: 35 },
  { min: 60,  label: 'ELEVATED', color: '#ffb700', pct: 60 },
  { min: 120, label: 'HIGH',     color: '#ff6600', pct: 78 },
  { min: 250, label: 'CRITICAL', color: '#ff0040', pct: 95 },
];

function updateThreat(total) {
  const level = [...THREAT_LEVELS].reverse().find(l => total >= l.min) || THREAT_LEVELS[0];
  const el = document.getElementById('threat-value');
  const bar = document.getElementById('threat-bar');
  el.textContent      = level.label;
  el.style.color      = level.color;
  el.style.textShadow = `0 0 10px ${level.color}`;
  bar.style.width      = level.pct + '%';
  bar.style.background = level.color;
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function animateCount(el, target) {
  if (!el) return;
  const start = parseInt(el.textContent.replace(/,/g, '')) || 0;
  if (start === target) return;
  const t0 = performance.now();
  function step(now) {
    const p = Math.min((now - t0) / 700, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(start + (target - start) * e).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ─── Map ──────────────────────────────────────────────────────────────────────
function initMap() {
  map = L.map('map', { center: [25, 10], zoom: 2, zoomControl: true, attributionControl: false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd', maxZoom: 19,
  }).addTo(map);
  L.control.attribution({ prefix: '' }).addTo(map);
}

const _markerIndex = {};   // ip → [circle, ring]

function addMapMarker(p) {
  if (!p.lat || !p.lon) return;
  const key = p.src_ip || p.ip;

  if (_markerIndex[key]) {
    _markerIndex[key].forEach(m => map.removeLayer(m));
    const idx = mapMarkers.indexOf(_markerIndex[key][0]);
    if (idx !== -1) mapMarkers.splice(idx, 2);
  }

  const cnt = (p.count || 1);
  const r   = Math.min(5 + Math.log1p(cnt) * 3.5, 20);
  const m   = L.circleMarker([p.lat, p.lon], {
    radius: r, fillColor: '#ff0040', color: '#ff0040',
    weight: 1, opacity: 0.9, fillOpacity: 0.35,
  }).addTo(map);

  m.bindPopup(
    `<span style="color:var(--green);letter-spacing:1px">${esc(key)}</span><br>` +
    `<span style="color:var(--muted)">${esc(p.city ? p.city + ', ' : '')}${esc(p.country || 'UNKNOWN')}</span><br>` +
    `<span style="color:var(--red)">${cnt} INTRUSION${cnt !== 1 ? 'S' : ''} DETECTED</span>`
  );

  const ring = L.circleMarker([p.lat, p.lon], {
    radius: r + 4, fillColor: 'transparent',
    color: '#ff0040', weight: 1, opacity: 0.2,
  }).addTo(map);

  mapMarkers.push(m, ring);
  _markerIndex[key] = [m, ring];
}

// ─── Chart glow plugin ────────────────────────────────────────────────────────
const glowPlugin = {
  id: 'glow',
  beforeDatasetsDraw(chart) {
    chart.ctx.save();
    chart.ctx.shadowBlur    = 14;
    chart.ctx.shadowOffsetX = 0;
    chart.ctx.shadowOffsetY = 0;
    const ds = chart.data.datasets[0];
    chart.ctx.shadowColor = ds ? (ds.borderColor || ds.backgroundColor) : '#00ff41';
  },
  afterDatasetsDraw(chart) { chart.ctx.restore(); },
};

// ─── Charts ───────────────────────────────────────────────────────────────────
function initCharts() {
  Chart.defaults.color       = '#1f5a2f';
  Chart.defaults.borderColor = '#0a280a';
  Chart.defaults.font.family = "'Share Tech Mono', monospace";

  timelineChart = new Chart(document.getElementById('timeline-chart'), {
    type: 'line',
    plugins: [glowPlugin],
    data: {
      labels: [],
      datasets: [{
        label: 'Attacks', data: [],
        borderColor: '#00ff41', backgroundColor: 'rgba(0,255,65,0.05)',
        tension: 0.4, fill: true,
        pointRadius: 3, pointBackgroundColor: '#00ff41', pointBorderColor: '#00ff41',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { maxTicksLimit: 8, font: { size: 9 }, color: '#1f5a2f' }, grid: { color: '#0a280a' } },
        y: { beginAtZero: true, ticks: { font: { size: 9 }, color: '#1f5a2f' }, grid: { color: '#0a280a' } },
      },
    },
  });

  topIpsChart = new Chart(document.getElementById('top-ips-chart'), {
    type: 'bar',
    plugins: [glowPlugin],
    data: {
      labels: [],
      datasets: [{
        label: 'Attacks', data: [],
        backgroundColor: 'rgba(255,0,64,0.25)', borderColor: '#ff0040', borderWidth: 1,
      }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { font: { size: 9 }, color: '#1f5a2f' }, grid: { color: '#0a280a' } },
        y: { ticks: { color: '#80ffaa', font: { size: 10 } }, grid: { display: false } },
      },
    },
  });

  countryChart = new Chart(document.getElementById('country-chart'), {
    type: 'doughnut',
    plugins: [glowPlugin],
    data: { labels: [], datasets: [{ data: [], borderWidth: 1 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 400 },
      cutout: '60%',
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#80ffaa', font: { size: 9, family: "'Share Tech Mono'" }, boxWidth: 10, padding: 8 },
        },
      },
    },
  });
}

// ─── Filter ───────────────────────────────────────────────────────────────────
function applyFilter() {
  _activeFilter = {
    service: document.getElementById('filter-service').value,
    country: document.getElementById('filter-country').value.trim(),
    ip:      document.getElementById('filter-ip').value.trim(),
    q:       document.getElementById('filter-q').value.trim(),
  };
  _eventsPage = 0;
  fetchEvents();
}

function clearFilter() {
  document.getElementById('filter-service').value = '';
  document.getElementById('filter-country').value = '';
  document.getElementById('filter-ip').value      = '';
  document.getElementById('filter-q').value       = '';
  _activeFilter = {};
  _eventsPage   = 0;
  fetchEvents();
}

function prevPage() {
  if (_eventsPage > 0) { _eventsPage--; fetchEvents(); }
}

function nextPage() {
  if ((_eventsPage + 1) * PAGE_SIZE < _eventsTotal) { _eventsPage++; fetchEvents(); }
}

function _filterParams() {
  const p = new URLSearchParams({
    limit:  PAGE_SIZE,
    offset: _eventsPage * PAGE_SIZE,
    ..._activeFilter,
  });
  return p.toString();
}

// ─── Export ───────────────────────────────────────────────────────────────────
function exportData(fmt) {
  const p = new URLSearchParams({ format: fmt, ..._activeFilter });
  const a = document.createElement('a');
  a.href  = `/api/export?${p}`;
  a.download = `honeypot_export.${fmt}`;
  a.click();
}

// ─── Data Refresh (charts + stats) ────────────────────────────────────────────
async function refresh() {
  try {
    const [stats, timeline, topIps, creds, mapData, ctryData] = await Promise.all([
      get('/api/stats'),
      get('/api/timeline'),
      get('/api/top-ips'),
      get('/api/top-credentials'),
      get('/api/map-data'),
      get('/api/countries'),
    ]);

    renderStats(stats);
    renderTimeline(timeline);
    renderTopIps(topIps);
    renderCredentials(creds);
    renderMap(mapData);
    renderCountryChart(ctryData);

    document.getElementById('last-updated').textContent =
      'SYNCED ' + new Date().toLocaleTimeString();
  } catch (err) {
    console.error('[dashboard] refresh failed:', err);
  }
  fetchEvents();
}

async function fetchEvents() {
  try {
    const data = await get(`/api/events?${_filterParams()}`);
    renderEvents(data.events || data);
    _eventsTotal = data.total ?? (data.events || data).length;
    updatePagination();
  } catch (err) {
    console.error('[dashboard] fetchEvents failed:', err);
  }
}

function updatePagination() {
  const totalPages = Math.ceil(_eventsTotal / PAGE_SIZE) || 1;
  const curPage    = _eventsPage + 1;
  document.getElementById('page-info').textContent  = `PAGE ${curPage} / ${totalPages}`;
  document.getElementById('total-info').textContent = `${_eventsTotal.toLocaleString()} EVENTS`;
  document.getElementById('btn-prev').disabled = _eventsPage === 0;
  document.getElementById('btn-next').disabled = curPage >= totalPages;
}

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

// ─── Renderers ────────────────────────────────────────────────────────────────
function renderStats(s) {
  _stats = s;
  const total = s.total_events ?? 0;
  animateCount(document.getElementById('total-events'), total);
  animateCount(document.getElementById('unique-ips'),   s.unique_ips    ?? 0);
  animateCount(document.getElementById('countries'),    s.countries     ?? 0);
  animateCount(document.getElementById('cred-count'),   s.cred_count    ?? 0);
  animateCount(document.getElementById('ssh-count'),    s.ssh_count     ?? 0);
  animateCount(document.getElementById('http-count'),   s.http_count    ?? 0);
  animateCount(document.getElementById('ftp-count'),    s.ftp_count     ?? 0);
  animateCount(document.getElementById('telnet-count'), s.telnet_count  ?? 0);
  updateThreat(total);
}

function liveStatIncrement(e) {
  const bump = el => {
    if (!el) return;
    const v = (parseInt(el.textContent.replace(/,/g, '')) || 0) + 1;
    animateCount(el, v);
  };
  bump(document.getElementById('total-events'));
  bump(document.getElementById(`${e.service}-count`));
  if (e.username) bump(document.getElementById('cred-count'));
  updateThreat((parseInt(document.getElementById('total-events').textContent.replace(/,/g, '')) || 0));
}

function renderTimeline(data) {
  timelineChart.data.labels           = data.map(d => d.hour.slice(11, 16));
  timelineChart.data.datasets[0].data = data.map(d => d.count);
  timelineChart.update();
}

function renderTopIps(data) {
  topIpsChart.data.labels           = data.map(d => d.src_ip);
  topIpsChart.data.datasets[0].data = data.map(d => d.count);
  topIpsChart.update();
}

const _COUNTRY_PALETTE = [
  '#00ff41','#ff0040','#ffb700','#00b7ff','#b400ff',
  '#ff6600','#00ffcc','#ff00aa','#80ff00','#ff8800',
  '#00ccff','#ffff00',
];

function renderCountryChart(data) {
  countryChart.data.labels = data.map(d => d.country);
  countryChart.data.datasets[0].data            = data.map(d => d.count);
  countryChart.data.datasets[0].backgroundColor = data.map((_, i) =>
    _COUNTRY_PALETTE[i % _COUNTRY_PALETTE.length] + '44');
  countryChart.data.datasets[0].borderColor     = data.map((_, i) =>
    _COUNTRY_PALETTE[i % _COUNTRY_PALETTE.length]);
  countryChart.update();
}

function renderCredentials(data) {
  const tbody = document.querySelector('#cred-table tbody');
  tbody.innerHTML = data.map(r => `
    <tr>
      <td>${badge(r.service)}</td>
      <td style="color:var(--green)">${esc(r.username)}</td>
      <td style="color:var(--amber)">${esc(r.password)}</td>
      <td style="color:var(--red);text-align:right;font-size:11px">${r.count}</td>
    </tr>`).join('');
}

function renderEvents(data) {
  const tbody = document.querySelector('#events-table tbody');
  tbody.innerHTML = data.map(e => `
    <tr>
      <td style="color:var(--muted);letter-spacing:1px">${shortTime(e.timestamp)}</td>
      <td>${badge(e.service)}</td>
      <td style="color:var(--green);letter-spacing:1px">${esc(e.src_ip)}</td>
      <td style="color:var(--text)">${esc(e.country || '???')}</td>
      <td style="color:#5aff8a">${detail(e)}</td>
      <td>${e.scanner ? `<span class="scanner-tag">${esc(e.scanner)}</span>` : ''}</td>
    </tr>`).join('');
}

function prependEventRow(e) {
  if (_eventsPage !== 0) return;
  const tbody = document.querySelector('#events-table tbody');
  const tr = document.createElement('tr');
  tr.className = 'row-new';
  tr.innerHTML = `
    <td style="color:var(--muted);letter-spacing:1px">${shortTime(e.timestamp)}</td>
    <td>${badge(e.service)}</td>
    <td style="color:var(--green);letter-spacing:1px">${esc(e.src_ip)}</td>
    <td style="color:var(--text)">${esc(e.country || '???')}</td>
    <td style="color:#5aff8a">${detail(e)}</td>
    <td>${e.scanner ? `<span class="scanner-tag">${esc(e.scanner)}</span>` : ''}</td>`;
  tbody.insertBefore(tr, tbody.firstChild);
  // Trim table to _liveMax rows
  while (tbody.rows.length > _liveMax) tbody.deleteRow(tbody.rows.length - 1);
}

function renderMap(data) {
  // Clear existing
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers.length = 0;
  Object.keys(_markerIndex).forEach(k => delete _markerIndex[k]);

  if (_mapNotice) { map.removeControl(_mapNotice); _mapNotice = null; }

  const geoPoints = data.filter(p => p.lat && p.lon);

  if (geoPoints.length === 0) {
    _mapNotice = L.control({ position: 'bottomleft' });
    _mapNotice.onAdd = () => {
      const d = L.DomUtil.create('div');
      d.style.cssText =
        'background:rgba(0,8,0,.92);border:1px solid #0a280a;color:#1f5a2f;' +
        'padding:8px 12px;font:10px "Share Tech Mono",monospace;letter-spacing:1px;';
      d.textContent = '// NO GEO DATA — expose the honeypot to the internet to see real attack origins.';
      return d;
    };
    _mapNotice.addTo(map);
    return;
  }

  geoPoints.forEach(p => addMapMarker({ ...p, ip: p.src_ip }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function shortTime(iso) {
  if (!iso) return '';
  const d = iso.endsWith('Z') ? new Date(iso) : new Date(iso + 'Z');
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function detail(e) {
  if (e.command) return esc(`CMD: ${e.command}`);
  if (e.username || e.password) return esc(`${e.username || '—'}:${e.password || '—'}`);
  return esc(`${e.method || ''} ${e.path || ''}`);
}

const _BADGE_COLORS = {
  ssh:    ['rgba(255,0,64,.12)',   '#ff0040',  'rgba(255,0,64,.35)'],
  http:   ['rgba(255,183,0,.12)', '#ffb700',  'rgba(255,183,0,.35)'],
  ftp:    ['rgba(0,183,255,.12)', '#00b7ff',  'rgba(0,183,255,.35)'],
  telnet: ['rgba(180,0,255,.12)', '#b400ff',  'rgba(180,0,255,.35)'],
};

function badge(svc) {
  const c = _BADGE_COLORS[svc] || ['rgba(128,255,170,.12)', '#80ffaa', 'rgba(128,255,170,.35)'];
  return `<span style="display:inline-block;padding:2px 7px;font-size:8px;font-weight:bold;letter-spacing:1.5px;font-family:var(--font-hud);background:${c[0]};color:${c[1]};border:1px solid ${c[2]};box-shadow:0 0 6px ${c[2]}">${esc((svc || '').toUpperCase())}</span>`;
}
