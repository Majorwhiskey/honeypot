# Honeypot System

> **Pragyan Edusec** &nbsp;|&nbsp; Internship Project &nbsp;&mdash;&nbsp; **KLE Institute of Technology**

A multi-service honeypot that emulates SSH and HTTP servers to capture, log, and visualise real-world attack traffic. All events are stored in a local SQLite database and displayed on a live threat-intelligence dashboard.

---

## Features

- **SSH Honeypot** — listens on port 2222, presents an OpenSSH banner, and logs every credential pair attempted
- **HTTP Honeypot** — listens on port 8080, serves convincing fake pages (WordPress login, phpMyAdmin, admin panel, `.env`) and logs all probes
- **Live Dashboard** — Flask web app on port 5000 with real-time stats, a global attack-origin map, timeline chart, top-attacker table, and credential feed
- **GeoIP Enrichment** — each attacker IP is automatically resolved to country, city, and coordinates via the ip-api.com free API
- **SQLite Logging** — all events are persisted locally; no external database required

---

## Architecture

```
main.py
├── honeypot/ssh_honeypot.py   — paramiko-based SSH server (captures credentials)
├── honeypot/http_honeypot.py  — Flask app serving fake admin/login pages
├── honeypot/logger.py         — SQLite writer + GeoIP lookup
├── honeypot/config.py         — ports, paths, banners
└── dashboard/app.py           — Flask dashboard + REST API
    ├── templates/index.html   — cyberpunk-themed single-page UI
    └── static/                — CSS & JS
```

All three services run as daemon threads started from `main.py`.

---

## Requirements

- Python 3.9+
- See `requirements.txt`

```
paramiko>=3.4.0
flask>=3.0.0
requests>=2.31.0
```

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/honeypot.git
cd honeypot

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run
python main.py
```

The system prints its endpoints on startup:

```
==================================================
  HONEYPOT SYSTEM
==================================================

  Dashboard  →  http://localhost:5000
  SSH        →  port 2222
  HTTP       →  http://localhost:8080

  Press Ctrl+C to stop
==================================================
```

---

## Dashboard

Open `http://localhost:5000` in your browser.

| Widget | Description |
|---|---|
| Stat cards | Total attacks, unique IPs, countries, SSH intrusions, HTTP probes |
| Global map | Leaflet map with a marker per attacker IP |
| Attack timeline | Hourly bar chart for the last 24 hours |
| Top threat actors | Bar chart of the 10 most active IPs |
| Credential intelligence | Most-tried SSH username/password pairs |
| Live event feed | Latest 50 events, auto-refreshing every 5 seconds |

---

## HTTP Honeypot — Emulated Endpoints

| Path | Fake page |
|---|---|
| `/wp-login.php`, `/wp-admin` | WordPress login |
| `/phpmyadmin`, `/pma` | phpMyAdmin |
| `/admin`, `/login`, `/administrator` | Generic admin panel |
| `/.env`, `/.env.backup`, `/.env.local` | Fake environment file with plausible credentials |
| Everything else | Apache2 Ubuntu default page |

---

## Database Schema

All events land in `data/honeypot.db`, table `events`:

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER | Auto-increment primary key |
| `timestamp` | TEXT | UTC ISO-8601 |
| `service` | TEXT | `ssh` or `http` |
| `src_ip` | TEXT | Attacker IP |
| `src_port` | INTEGER | Attacker source port |
| `country` | TEXT | GeoIP country |
| `city` | TEXT | GeoIP city |
| `lat` / `lon` | REAL | GeoIP coordinates |
| `username` | TEXT | Attempted username |
| `password` | TEXT | Attempted password |
| `method` | TEXT | HTTP method |
| `path` | TEXT | HTTP path |
| `user_agent` | TEXT | HTTP User-Agent |
| `payload` | TEXT | Raw POST body (first 1000 chars) |

---

## Configuration

Edit `honeypot/config.py` to change ports or banners:

```python
SSH_PORT   = 2222
HTTP_PORT  = 8080
DASHBOARD_PORT = 5000

SSH_BANNER         = "SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.6"
HTTP_SERVER_HEADER = "Apache/2.4.41 (Ubuntu)"
```

---

## Security Notice

Run this only in controlled, isolated environments (a dedicated VM or cloud instance). Never expose the dashboard port to the public internet without authentication. The honeypot is intentionally deceptive — ensure you have authorization before deploying on any network.

---

## About

This project was developed as an internship assignment at **Pragyan Edusec** and presented to **KLE Institute of Technology**.

---

## License

MIT
