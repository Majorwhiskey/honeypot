# Honeypot System

> **Pragyan Edusec** &nbsp;|&nbsp; Internship Project &nbsp;&mdash;&nbsp; **KLE Institute of Technology**

A professional-grade multi-service honeypot that emulates SSH, HTTP, FTP, and Telnet servers to capture, log, and visualise real-world attack traffic in real time. All events are stored in a local SQLite database and displayed on a live threat-intelligence dashboard with Socket.IO push updates.

---

## Features

- **SSH Honeypot** — presents an OpenSSH banner, accepts auth, and drops attackers into a fully interactive fake shell; logs every command typed, including malware download URLs (`wget`/`curl`)
- **HTTP Honeypot** — serves convincing fake pages (WordPress, phpMyAdmin, Jenkins, Jupyter, Laravel, admin panels, `.env` files) and fingerprints 13 known scanner tools
- **FTP Honeypot** — standard port 21, captures `USER`/`PASS` credential attempts
- **Telnet Honeypot** — standard port 23, captures login credentials from IoT bots and scanners
- **Real-time Dashboard** — Socket.IO-powered Flask app; events appear instantly with no polling delay
- **Credential Intelligence** — captures and ranks username/password pairs across all four services
- **GeoIP + ASN Enrichment** — each IP is resolved to country, city, coordinates, and autonomous system (e.g. "AS4134 China Telecom")
- **Scanner Detection** — fingerprints Masscan, Nmap, Nikto, ZGrab, Shodan, Censys, Nuclei, sqlmap, Metasploit, curl, wget, Python-Requests, Go-HTTP-Client
- **Webhook Alerts** — Discord and Slack notifications on credential capture (rate-limited per IP)
- **Export** — download filtered events as CSV or JSON directly from the dashboard
- **Env-based Config** — all settings via `.env` file; no code changes needed
- **Structured Logging** — rotating log files via Python `logging` (10 MB × 5 files)
- **SQLite with WAL** — write-ahead logging + indexes for high-throughput concurrent writes

---

## Architecture

```
main.py
├── honeypot/ssh_honeypot.py    — paramiko SSH server with fake interactive shell
├── honeypot/http_honeypot.py   — Flask decoy pages + scanner fingerprinting
├── honeypot/ftp_honeypot.py    — raw TCP FTP credential capture
├── honeypot/telnet_honeypot.py — raw TCP Telnet credential capture
├── honeypot/logger.py          — SQLite writer, GeoIP/ASN lookup, webhook alerts
├── honeypot/config.py          — env-based configuration
└── dashboard/app.py            — Flask + Socket.IO dashboard & REST API
    ├── templates/index.html    — cyberpunk single-page UI
    └── static/                 — CSS & JS (Chart.js, Leaflet, Socket.IO)
```

All services run as daemon threads started from `main.py`.

---

## Requirements

- Python 3.9+
- `sudo` / root for standard ports 21 and 23 on Linux

```
paramiko>=3.4.0
flask>=3.0.0
flask-socketio>=5.3.0
simple-websocket>=1.0.0
requests>=2.31.0
python-dotenv>=1.0.0
```

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/Majorwhiskey/honeypot.git
cd honeypot

# 2. Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure (optional)
cp .env.example .env
# Edit .env to set ports, dashboard auth, webhook URLs, etc.

# 5. Run  (use sudo if FTP/Telnet are on standard ports 21/23)
sudo venv/bin/python main.py
```

Startup output:

```
══════════════════════════════════════════════════════════════
  HONEYPOT SYSTEM  —  PRAGYAN EDUSEC
  KLE INSTITUTE OF TECHNOLOGY  //  INTERNSHIP PROJECT
══════════════════════════════════════════════════════════════

  Dashboard  →  http://localhost:5000
  SSH        →  port 2222
  HTTP       →  http://localhost:8888
  FTP        →  port 21  (standard)
  Telnet     →  port 23  (standard)

  Logs       →  data/honeypot.log

  Press Ctrl+C to stop
══════════════════════════════════════════════════════════════
```

---

## Configuration

Copy `.env.example` to `.env` and edit as needed. No code changes required.

```env
# Ports
SSH_PORT=2222
HTTP_PORT=8888
FTP_PORT=21
TELNET_PORT=23
DASHBOARD_PORT=5000

# Dashboard basic auth (leave empty to disable)
DASHBOARD_USER=admin
DASHBOARD_PASS=changeme

# Webhook alerts — one alert per IP per 60 seconds
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Logging
LOG_LEVEL=INFO
LOG_FILE=data/honeypot.log

# Banners (change to mimic a different target)
SSH_BANNER=SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.6
HTTP_SERVER_HEADER=Apache/2.4.41 (Ubuntu)
```

> **Privileged ports:** FTP (21) and Telnet (23) require root on Linux. Either run with `sudo` or grant the capability once:
> ```bash
> sudo setcap 'cap_net_bind_service=+ep' venv/bin/python3
> ```

---

## Dashboard

Open `http://localhost:5000` in your browser (login required if `DASHBOARD_USER` is set).

| Widget | Description |
|---|---|
| Stat cards | Total attacks, unique IPs, countries, credentials captured, SSH/HTTP/FTP/Telnet breakdown |
| Global map | Leaflet dark map — circle marker per attacker IP, sized by hit count |
| Attack timeline | Line chart — hourly attack count over the last 24 hours |
| Top threat actors | Horizontal bar chart — 10 most active IPs |
| Country distribution | Doughnut chart — top 12 origin countries |
| Filter bar | Filter live feed by service, country, IP, or free-text search |
| Export | Download current filtered view as CSV or JSON |
| Credential intelligence | Ranked username/password pairs across all services |
| Live event feed | Socket.IO push — events appear instantly; paginated (50/page); scanner tool tagged |

---

## HTTP Honeypot — Emulated Endpoints

| Path | Fake page |
|---|---|
| `/wp-login.php`, `/wp-admin` | WordPress login |
| `/phpmyadmin`, `/pma` | phpMyAdmin |
| `/admin`, `/login`, `/administrator`, `/cp`, `/cpanel` | Generic admin panel |
| `/jenkins`, `/j_spring_security_check` | Jenkins login |
| `/jupyter`, `/notebook` | Jupyter Notebook |
| `/laravel`, `/debug` | Laravel error page (500) |
| `/.env`, `/.env.backup`, `/.env.local`, `/.env.production` | Fake environment file with plausible credentials |
| Everything else | Apache2 Ubuntu default page |

---

## SSH Fake Shell

After a successful auth attempt the attacker is placed in a fake interactive shell:

```
Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-76-generic x86_64)
Last login: Mon May 12 06:11:34 2025 from 192.168.1.1
root@ubuntu-server:~#
```

Supported commands include `id`, `whoami`, `uname -a`, `ps aux`, `ifconfig`, `cat /etc/passwd`, `df -h`, `free -m`, `w`, `history`, `env`, and more. Any `wget`/`curl` command is intercepted, the URL is logged as a `malware_download` event, and a realistic failure response is returned.

---

## Database Schema

All events land in `data/honeypot.db`, table `events`:

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER | Auto-increment primary key |
| `timestamp` | TEXT | UTC ISO-8601 |
| `service` | TEXT | `ssh`, `http`, `ftp`, or `telnet` |
| `src_ip` | TEXT | Attacker IP |
| `src_port` | INTEGER | Attacker source port |
| `country` | TEXT | GeoIP country |
| `city` | TEXT | GeoIP city |
| `lat` / `lon` | REAL | GeoIP coordinates |
| `asn` | TEXT | Autonomous System (e.g. "AS4134 China Telecom") |
| `username` | TEXT | Attempted username |
| `password` | TEXT | Attempted password |
| `method` | TEXT | HTTP method |
| `path` | TEXT | HTTP path (or malware URL for SSH downloads) |
| `user_agent` | TEXT | HTTP User-Agent |
| `payload` | TEXT | Raw POST body (first 1000 chars) |
| `scanner` | TEXT | Detected scanner tool name |
| `command` | TEXT | SSH shell command entered |

Indexes on `timestamp`, `src_ip`, and `service`. WAL mode enabled for concurrent read/write.

---

## Testing Locally

```bash
# SSH — enter any password, then try shell commands
ssh -p 2222 root@localhost

# FTP
ftp localhost 21

# Telnet
telnet localhost 23

# HTTP — via browser or curl
curl http://localhost:8888/wp-login.php
curl http://localhost:8888/phpmyadmin
curl http://localhost:8888/jenkins
curl http://localhost:8888/.env
```

---

## Security Notice

Deploy only in controlled, isolated environments (a dedicated VM or cloud instance). Never expose the dashboard port to the public internet without setting `DASHBOARD_USER` and `DASHBOARD_PASS`. The honeypot is intentionally deceptive — ensure you have authorization before deploying on any network.

---

## About

This project was developed as an internship assignment at **Pragyan Edusec** and presented to **KLE Institute of Technology**.

---

## License

MIT
