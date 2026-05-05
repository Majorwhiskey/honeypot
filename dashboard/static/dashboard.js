'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
let map, timelineChart, topIpsChart;
const mapMarkers = [];
let _mapNotice   = null;
let _prevTotal   = 0;

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMatrix();
  initClock();
  initMap();
  initCharts();
  refresh();
  setInterval(refresh, 15_000);
});

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
      const char = CHARS[Math.floor(Math.random() * CHARS.length)];
      // Head character bright, trail fades
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

// ─── Live Clock ───────────────────────────────────────────────────────────────
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
  const el    = document.getElementById('threat-value');
  const bar   = document.getElementById('threat-bar');
  el.textContent  = level.label;
  el.style.color  = level.color;
  el.style.textShadow = `0 0 10px ${level.color}`;
  bar.style.width      = level.pct + '%';
  bar.style.background = level.color;
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function animateCount(el, target) {
  const start    = parseInt(el.textContent.replace(/,/g, '')) || 0;
  if (start === target) return;
  const duration = 700;
  const t0       = performance.now();

  function step(now) {
    const p = Math.min((now - t0) / duration, 1);
    const e = 1 - Math.pow(1 - p, 3);           // ease-out cubic
    el.textContent = Math.round(start + (target - start) * e).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ─── Map ──────────────────────────────────────────────────────────────────────
function initMap() {
  map = L.map('map', { center: [25, 10], zoom: 2, zoomControl: true, attributionControl: false });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  // Minimal attribution
  L.control.attribution({ prefix: '' }).addTo(map);
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
    chart.ctx.shadowColor = ds ? ds.borderColor || ds.backgroundColor : '#00ff41';
  },
  afterDatasetsDraw(chart) {
    chart.ctx.restore();
  },
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
        label: 'Attacks',
        data: [],
        borderColor: '#00ff41',
        backgroundColor: 'rgba(0,255,65,0.05)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: '#00ff41',
        pointBorderColor: '#00ff41',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { maxTicksLimit: 8, font: { size: 9 }, color: '#1f5a2f' },
          grid:  { color: '#0a280a' },
        },
        y: {
          beginAtZero: true,
          ticks: { font: { size: 9 }, color: '#1f5a2f' },
          grid:  { color: '#0a280a' },
        },
      },
    },
  });

  topIpsChart = new Chart(document.getElementById('top-ips-chart'), {
    type: 'bar',
    plugins: [glowPlugin],
    data: {
      labels: [],
      datasets: [{
        label: 'Attacks',
        data: [],
        backgroundColor: 'rgba(255,0,64,0.25)',
        borderColor: '#ff0040',
        borderWidth: 1,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { font: { size: 9 }, color: '#1f5a2f' },
          grid:  { color: '#0a280a' },
        },
        y: {
          ticks: { color: '#80ffaa', font: { size: 10 }, family: "'Share Tech Mono'" },
          grid:  { display: false },
        },
      },
    },
  });
}

// ─── Data Refresh ─────────────────────────────────────────────────────────────
async function refresh() {
  try {
    const [stats, timeline, topIps, creds, events, mapData] = await Promise.all([
      get('/api/stats'),
      get('/api/timeline'),
      get('/api/top-ips'),
      get('/api/top-credentials'),
      get('/api/events?limit=50'),
      get('/api/map-data'),
    ]);

    renderStats(stats);
    renderTimeline(timeline);
    renderTopIps(topIps);
    renderCredentials(creds);
    renderEvents(events);
    renderMap(mapData);

    document.getElementById('last-updated').textContent =
      'LAST SYNC ' + new Date().toLocaleTimeString();
  } catch (err) {
    console.error('[dashboard] refresh failed:', err);
  }
}

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

// ─── Renderers ────────────────────────────────────────────────────────────────
function renderStats(s) {
  const total = s.total_events ?? 0;
  animateCount(document.getElementById('total-events'), total);
  animateCount(document.getElementById('unique-ips'),   s.unique_ips   ?? 0);
  animateCount(document.getElementById('countries'),    s.countries    ?? 0);
  animateCount(document.getElementById('ssh-count'),    s.ssh_count    ?? 0);
  animateCount(document.getElementById('http-count'),   s.http_count   ?? 0);
  updateThreat(total);
  _prevTotal = total;
}

function renderTimeline(data) {
  timelineChart.data.labels             = data.map(d => d.hour.slice(11, 16));
  timelineChart.data.datasets[0].data   = data.map(d => d.count);
  timelineChart.update();
}

function renderTopIps(data) {
  topIpsChart.data.labels           = data.map(d => d.src_ip);
  topIpsChart.data.datasets[0].data = data.map(d => d.count);
  topIpsChart.update();
}

function renderCredentials(data) {
  const tbody = document.querySelector('#cred-table tbody');
  tbody.innerHTML = data.map(r => `
    <tr>
      <td style="color:var(--green)">${esc(r.username)}</td>
      <td style="color:var(--text)">${esc(r.password)}</td>
      <td style="color:var(--red);text-align:right;font-family:var(--font-hud);font-size:11px">${r.count}</td>
    </tr>`).join('');
}

let _lastEventId = 0;

function renderEvents(data) {
  const tbody = document.querySelector('#events-table tbody');
  tbody.innerHTML = data.map((e, i) => {
    const isNew = i === 0 && _lastEventId !== 0 && (e.id > _lastEventId);
    return `
    <tr class="${isNew ? 'row-new' : ''}">
      <td style="color:var(--muted);letter-spacing:1px">${shortTime(e.timestamp)}</td>
      <td><span class="badge badge-${e.service}">${e.service.toUpperCase()}</span></td>
      <td style="color:var(--green);letter-spacing:1px">${esc(e.src_ip)}</td>
      <td style="color:var(--text)">${esc(e.country || '???')}</td>
      <td style="color:#5aff8a">${detail(e)}</td>
    </tr>`;
  }).join('');

  if (data.length) _lastEventId = data[0].id ?? 0;
}

function renderMap(data) {
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers.length = 0;

  if (_mapNotice) { map.removeControl(_mapNotice); _mapNotice = null; }

  const geoPoints = data.filter(p => p.lat && p.lon);

  if (geoPoints.length === 0) {
    _mapNotice = L.control({ position: 'bottomleft' });
    _mapNotice.onAdd = () => {
      const d = L.DomUtil.create('div');
      d.style.cssText =
        'background:rgba(0,8,0,.92);border:1px solid #0a280a;color:#1f5a2f;' +
        'padding:8px 12px;font:10px "Share Tech Mono",monospace;letter-spacing:1px;';
      d.textContent = '// NO GEO DATA — local/private IPs have no coordinates. Expose the honeypot to the internet to see real attack origins.';
      return d;
    };
    _mapNotice.addTo(map);
    return;
  }

  geoPoints.forEach(p => {
    const r = Math.min(5 + Math.log1p(p.count) * 3.5, 20);
    const m = L.circleMarker([p.lat, p.lon], {
      radius:      r,
      fillColor:   '#ff0040',
      color:       '#ff0040',
      weight:      1,
      opacity:     0.9,
      fillOpacity: 0.35,
    }).addTo(map);

    m.bindPopup(
      `<span style="color:var(--green);letter-spacing:1px">${esc(p.src_ip)}</span><br>` +
      `<span style="color:var(--muted)">${esc(p.city ? p.city + ', ' : '')}${esc(p.country || 'UNKNOWN')}</span><br>` +
      `<span style="color:var(--red)">${p.count} INTRUSION${p.count !== 1 ? 'S' : ''} DETECTED</span>`
    );

    // Outer ring pulse
    const ring = L.circleMarker([p.lat, p.lon], {
      radius: r + 4, fillColor: 'transparent',
      color: '#ff0040', weight: 1, opacity: 0.2,
    }).addTo(map);

    mapMarkers.push(m, ring);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shortTime(iso) {
  if (!iso) return '';
  return new Date(iso + 'Z').toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function detail(e) {
  if (e.service === 'ssh') return esc(`${e.username || '—'}:${e.password || '—'}`);
  return esc(`${e.method || ''} ${e.path || ''}`);
}
