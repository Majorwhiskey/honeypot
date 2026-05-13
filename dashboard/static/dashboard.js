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
let _liveMax      = 200;

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMatrix();
  initClock();
  initMap();
  initCharts();
  initSocket();
  initNavHighlight();
  initScramble();
  refresh();
  setInterval(refresh, 30_000);
});

// ─── Matrix Rain (Stitch palette) ────────────────────────────────────────────
function initMatrix() {
  const canvas = document.getElementById('matrix-bg');
  if (!canvas) return;
  const ctx   = canvas.getContext('2d');
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789アカサタナハイウエオ#@!-><';
  const SIZE  = 13;
  let W, H, drops;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    drops = Array.from({ length: Math.ceil(W / SIZE) }, () => Math.random() * -(H / SIZE));
  }

  function draw() {
    // Fade with bg color
    ctx.fillStyle = 'rgba(18, 20, 16, 0.055)';
    ctx.fillRect(0, 0, W, H);
    ctx.font = `${SIZE}px "Manrope", monospace`;

    drops.forEach((y, i) => {
      const char  = CHARS[Math.floor(Math.random() * CHARS.length)];
      const alpha = 0.035 + Math.random() * 0.09;
      const r     = Math.random();
      if (r > 0.98)      ctx.fillStyle = `rgba(255,186,56,${alpha * 1.8})`;   // amber
      else if (r > 0.88) ctx.fillStyle = `rgba(168,180,155,${alpha * 1.2})`;  // primary dim
      else               ctx.fillStyle = `rgba(69,72,64,${alpha * 2.2})`;     // border

      ctx.fillText(char, i * SIZE, y * SIZE);
      if (y * SIZE > H && Math.random() > 0.977) drops[i] = 0;
      drops[i] += 0.55;
    });
  }

  resize();
  window.addEventListener('resize', resize);
  setInterval(draw, 58);
}

// ─── Scramble Text ────────────────────────────────────────────────────────────
const _SC_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-#@!><';

function scramble(el, delay = 0, speed = 28) {
  // Store original on first call
  if (!el._scrambleFinal) el._scrambleFinal = el.textContent.trim();
  const final = el._scrambleFinal;
  const len   = final.length;

  setTimeout(() => {
    let pos = 0;
    const iv = setInterval(() => {
      if (pos > len) { clearInterval(iv); el.innerHTML = final; return; }
      const ghost = Array.from({ length: Math.max(0, len - pos) },
        () => _SC_CHARS[Math.floor(Math.random() * _SC_CHARS.length)]
      ).join('');
      el.innerHTML = final.substring(0, pos) +
        (ghost ? `<span class="scramble-ghost">${ghost}</span>` : '');
      pos++;
    }, speed);
  }, delay);
}

function initScramble() {
  // Header title
  const ht = document.querySelector('.hdr-title');
  if (ht) scramble(ht, 80);

  // Sidebar node label
  const an = document.querySelector('.aside-node');
  if (an) scramble(an, 200);

  // All [data-scramble] elements
  document.querySelectorAll('[data-scramble]').forEach((el, i) => {
    scramble(el, 350 + i * 250);
  });

  // Card title row labels — stagger
  document.querySelectorAll('.card-title-row span:not(.material-symbols-outlined)').forEach((el, i) => {
    scramble(el, 600 + i * 120);
  });

  // Stat labels
  document.querySelectorAll('.stat-label').forEach((el, i) => {
    scramble(el, 400 + i * 100);
  });

  // Nav items — scramble on hover
  document.querySelectorAll('.nav-item span:last-child').forEach(el => {
    el.closest('.nav-item').addEventListener('mouseenter', () => scramble(el, 0, 22));
  });

  // Table headers — scramble on load
  document.querySelectorAll('thead th').forEach((el, i) => {
    scramble(el, 700 + i * 80);
  });
}

// ─── Nav highlight on click ───────────────────────────────────────────────────
function initNavHighlight() {
  document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', function () {
      document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

// ─── Socket.IO live feed ──────────────────────────────────────────────────────
function initSocket() {
  const socket = io({ transports: ['websocket', 'polling'] });
  const dot    = document.getElementById('ws-dot');
  const label  = document.getElementById('ws-status');

  socket.on('connect', () => {
    dot.style.background = '#bfcab1';
    dot.style.boxShadow  = '0 0 8px rgba(191,202,177,0.5)';
    label.textContent    = 'LIVE';
    label.style.color    = '#bfcab1';
  });

  socket.on('disconnect', () => {
    dot.style.background = '#ffb4ab';
    dot.style.boxShadow  = '0 0 8px rgba(255,180,171,0.5)';
    label.textContent    = 'RECONNECTING…';
    label.style.color    = '#ffb4ab';
  });

  socket.on('new_event', (e) => {
    if (_eventsPage === 0) prependEventRow(e);
    liveStatIncrement(e);
    if (e.lat && e.lon) addMapMarker(e);
  });
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
  { min: 0,   label: 'MINIMAL',  color: '#bfcab1', pct: 12 },
  { min: 20,  label: 'MODERATE', color: '#a8b49b', pct: 35 },
  { min: 60,  label: 'ELEVATED', color: '#ffba38', pct: 60 },
  { min: 120, label: 'HIGH',     color: '#ff8844', pct: 78 },
  { min: 250, label: 'CRITICAL', color: '#ffb4ab', pct: 95 },
];

function updateThreat(total) {
  const level = [...THREAT_LEVELS].reverse().find(l => total >= l.min) || THREAT_LEVELS[0];
  const el  = document.getElementById('threat-value');
  const bar = document.getElementById('threat-bar');
  el.textContent       = level.label;
  el.style.color       = level.color;
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

// ─── Service Bars ─────────────────────────────────────────────────────────────
function updateServiceBars(s) {
  const maxSvc = Math.max(
    s.ssh_count || 0, s.http_count || 0,
    s.ftp_count || 0, s.telnet_count || 0, 1
  );
  const map_ = { ssh: s.ssh_count || 0, http: s.http_count || 0, ftp: s.ftp_count || 0, telnet: s.telnet_count || 0 };
  for (const [svc, count] of Object.entries(map_)) {
    const bar = document.getElementById(`${svc}-bar`);
    if (bar) bar.style.width = `${Math.round((count / maxSvc) * 100)}%`;
  }
}

// ─── Map ──────────────────────────────────────────────────────────────────────
function initMap() {
  map = L.map('map', { center: [25, 10], zoom: 2, zoomControl: true, attributionControl: false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd', maxZoom: 19,
  }).addTo(map);
}

const _markerIndex = {};

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

  const m = L.circleMarker([p.lat, p.lon], {
    radius: r, fillColor: '#ffb4ab', color: '#ffb4ab',
    weight: 1, opacity: 0.9, fillOpacity: 0.35,
  }).addTo(map);

  m.bindPopup(
    `<span style="color:#ffba38;letter-spacing:1px;font-family:Manrope,sans-serif;font-weight:700;font-size:12px">${esc(key)}</span><br>` +
    `<span style="color:#a8b49b;font-family:Manrope,sans-serif;font-size:11px">${esc(p.city ? p.city + ', ' : '')}${esc(p.country || 'UNKNOWN')}</span><br>` +
    `<span style="color:#ffb4ab;font-family:Manrope,sans-serif;font-size:11px;font-weight:700">${cnt} INTRUSION${cnt !== 1 ? 'S' : ''} DETECTED</span>`
  );

  const ring = L.circleMarker([p.lat, p.lon], {
    radius: r + 4, fillColor: 'transparent',
    color: '#ffb4ab', weight: 1, opacity: 0.15,
  }).addTo(map);

  mapMarkers.push(m, ring);
  _markerIndex[key] = [m, ring];
}

// ─── Charts ───────────────────────────────────────────────────────────────────
function initCharts() {
  Chart.defaults.color       = '#a8b49b';
  Chart.defaults.borderColor = 'rgba(69,72,64,0.25)';
  Chart.defaults.font.family = "'Manrope', sans-serif";
  Chart.defaults.font.weight = '700';

  timelineChart = new Chart(document.getElementById('timeline-chart'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Attacks', data: [],
        borderColor: '#ffba38',
        backgroundColor: 'rgba(255,186,56,0.06)',
        tension: 0.4, fill: true,
        pointRadius: 3,
        pointBackgroundColor: '#ffba38',
        pointBorderColor: '#ffba38',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { maxTicksLimit: 8, font: { size: 9, weight: '700' }, color: '#a8b49b' },
          grid: { color: 'rgba(69,72,64,0.2)' },
        },
        y: {
          beginAtZero: true,
          ticks: { font: { size: 9, weight: '700' }, color: '#a8b49b' },
          grid: { color: 'rgba(69,72,64,0.2)' },
        },
      },
    },
  });

  topIpsChart = new Chart(document.getElementById('top-ips-chart'), {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Attacks', data: [],
        backgroundColor: 'rgba(255,180,171,0.2)',
        borderColor: '#ffb4ab',
        borderWidth: 1,
      }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { font: { size: 9, weight: '700' }, color: '#a8b49b' },
          grid: { color: 'rgba(69,72,64,0.2)' },
        },
        y: {
          ticks: { color: '#c5c7be', font: { size: 10, weight: '600' } },
          grid: { display: false },
        },
      },
    },
  });

  const PALETTE = [
    '#ffba38','#ffb4ab','#bfcab1','#c1c6d7','#a8b49b',
    '#bfcab1','#c5c7be','#8f9289','#ffba38','#ffb4ab','#bfcab1','#c1c6d7',
  ];

  countryChart = new Chart(document.getElementById('country-chart'), {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], borderWidth: 1 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 400 },
      cutout: '60%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#c5c7be',
            font: { size: 9, family: "'Manrope'", weight: '700' },
            boxWidth: 10, padding: 8,
          },
        },
      },
    },
  });
  countryChart._palette = PALETTE;
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
  ['filter-service','filter-country','filter-ip','filter-q'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
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
  return new URLSearchParams({
    limit: PAGE_SIZE, offset: _eventsPage * PAGE_SIZE, ..._activeFilter,
  }).toString();
}

// ─── Export ───────────────────────────────────────────────────────────────────
function exportData(fmt) {
  const p = new URLSearchParams({ format: fmt, ..._activeFilter });
  const a = document.createElement('a');
  a.href     = `/api/export?${p}`;
  a.download = `honeypot_export.${fmt}`;
  a.click();
}

// ─── Data Refresh ─────────────────────────────────────────────────────────────
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
  animateCount(document.getElementById('unique-ips'),   s.unique_ips   ?? 0);
  animateCount(document.getElementById('countries'),    s.countries    ?? 0);
  animateCount(document.getElementById('cred-count'),   s.cred_count   ?? 0);
  animateCount(document.getElementById('ssh-count'),    s.ssh_count    ?? 0);
  animateCount(document.getElementById('http-count'),   s.http_count   ?? 0);
  animateCount(document.getElementById('ftp-count'),    s.ftp_count    ?? 0);
  animateCount(document.getElementById('telnet-count'), s.telnet_count ?? 0);
  updateThreat(total);
  updateServiceBars(s);
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
  updateThreat(parseInt(document.getElementById('total-events').textContent.replace(/,/g, '')) || 0);
  // Update service bars live
  const fakeStats = {
    ssh_count:    parseInt(document.getElementById('ssh-count').textContent.replace(/,/g,''))    || 0,
    http_count:   parseInt(document.getElementById('http-count').textContent.replace(/,/g,''))   || 0,
    ftp_count:    parseInt(document.getElementById('ftp-count').textContent.replace(/,/g,''))    || 0,
    telnet_count: parseInt(document.getElementById('telnet-count').textContent.replace(/,/g,'')) || 0,
  };
  updateServiceBars(fakeStats);
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
  '#ffba38','#ffb4ab','#bfcab1','#c1c6d7','#a8b49b',
  '#bfcab1','#c5c7be','#8f9289','#ffba38','#ffb4ab','#bfcab1','#c1c6d7',
];

function renderCountryChart(data) {
  countryChart.data.labels = data.map(d => d.country);
  countryChart.data.datasets[0].data            = data.map(d => d.count);
  countryChart.data.datasets[0].backgroundColor = data.map((_, i) => _COUNTRY_PALETTE[i % _COUNTRY_PALETTE.length] + '44');
  countryChart.data.datasets[0].borderColor     = data.map((_, i) => _COUNTRY_PALETTE[i % _COUNTRY_PALETTE.length]);
  countryChart.update();
}

function renderCredentials(data) {
  const tbody = document.querySelector('#cred-table tbody');
  tbody.innerHTML = data.map(r => `
    <tr>
      <td>${badge(r.service)}</td>
      <td style="color:#a8b49b;font-weight:700;font-family:monospace">${esc(r.username)}</td>
      <td style="color:#c5c7be;font-family:monospace">${esc(r.password)}</td>
      <td style="color:#e3e3dc;font-weight:900;text-align:right">${r.count.toLocaleString()}</td>
    </tr>`).join('');
}

function renderEvents(data) {
  const tbody = document.querySelector('#events-table tbody');
  tbody.innerHTML = data.map(e => `
    <tr>
      <td style="color:rgba(197,199,190,0.5);font-family:monospace">${shortTime(e.timestamp)}</td>
      <td>${badge(e.service)}</td>
      <td style="color:#ffba38;font-family:monospace;font-weight:700">${esc(e.src_ip)}</td>
      <td><span style="font-size:10px;padding:2px 6px;background:#3c4633;color:#a8b49b;font-weight:700;letter-spacing:1px;text-transform:uppercase">${esc(e.country || '??')}</span></td>
      <td style="color:#c5c7be">${detail(e)}</td>
      <td>${e.scanner ? `<span class="scanner-tag">${esc(e.scanner)}</span>` : ''}</td>
    </tr>`).join('');
}

function prependEventRow(e) {
  if (_eventsPage !== 0) return;
  const tbody = document.querySelector('#events-table tbody');
  const tr = document.createElement('tr');
  tr.className = 'row-new';
  tr.innerHTML = `
    <td style="color:rgba(197,199,190,0.5);font-family:monospace">${shortTime(e.timestamp)}</td>
    <td>${badge(e.service)}</td>
    <td style="color:#ffba38;font-family:monospace;font-weight:700">${esc(e.src_ip)}</td>
    <td><span style="font-size:10px;padding:2px 6px;background:#3c4633;color:#a8b49b;font-weight:700;letter-spacing:1px;text-transform:uppercase">${esc(e.country || '??')}</span></td>
    <td style="color:#c5c7be">${detail(e)}</td>
    <td>${e.scanner ? `<span class="scanner-tag">${esc(e.scanner)}</span>` : ''}</td>`;
  tbody.insertBefore(tr, tbody.firstChild);
  while (tbody.rows.length > _liveMax) tbody.deleteRow(tbody.rows.length - 1);
}

function renderMap(data) {
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
        'background:rgba(26,28,24,0.96);border:1px solid #454840;color:#a8b49b;' +
        'padding:8px 12px;font:700 10px Manrope,sans-serif;letter-spacing:1px;text-transform:uppercase;';
      d.textContent = '// NO GEO DATA — expose honeypot to the internet to see real attack origins.';
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
  if (e.command) {
    return `<span style="color:#ffba38;font-family:monospace">${esc('CMD: ' + e.command)}</span>`;
  }
  if (e.username || e.password) {
    return `<span style="color:#a8b49b;font-weight:700;font-family:monospace">${esc(e.username || '—')}</span>` +
           `<span style="color:#454840">:</span>` +
           `<span style="color:#c5c7be;font-family:monospace">${esc(e.password || '—')}</span>`;
  }
  return `<span style="color:#c5c7be;font-family:monospace">${esc((e.method || '') + ' ' + (e.path || ''))}</span>`;
}

const _BADGE_COLORS = {
  ssh:    ['rgba(255,180,171,0.12)', '#ffb4ab', 'rgba(255,180,171,0.3)'],
  http:   ['rgba(193,198,215,0.12)', '#c1c6d7', 'rgba(193,198,215,0.3)'],
  ftp:    ['rgba(191,202,177,0.12)', '#bfcab1', 'rgba(191,202,177,0.3)'],
  telnet: ['rgba(255,186,56,0.12)',  '#ffba38', 'rgba(255,186,56,0.3)'],
};

function badge(svc) {
  const c = _BADGE_COLORS[svc] || ['rgba(168,180,155,0.12)', '#a8b49b', 'rgba(168,180,155,0.3)'];
  return `<span style="display:inline-block;padding:2px 7px;font-size:8px;font-weight:900;` +
         `letter-spacing:1.5px;font-family:Manrope,sans-serif;text-transform:uppercase;` +
         `background:${c[0]};color:${c[1]};border:1px solid ${c[2]}">${esc((svc || '').toUpperCase())}</span>`;
}
