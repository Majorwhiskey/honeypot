import sqlite3
import threading
import ipaddress
import logging
import time
import requests
from datetime import datetime, timezone
from honeypot.config import DB_PATH, GEOIP_API, DISCORD_WEBHOOK_URL, SLACK_WEBHOOK_URL

log = logging.getLogger("honeypot")

_db_lock   = threading.Lock()
_geo_cache = {}

# Registered by dashboard so new events are pushed via SocketIO
_event_hook = None

def register_event_hook(callback):
    global _event_hook
    _event_hook = callback


# ── Schema ────────────────────────────────────────────────────────────────────

def init_db():
    with _db_lock:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp  TEXT,
                service    TEXT,
                src_ip     TEXT,
                src_port   INTEGER,
                country    TEXT,
                city       TEXT,
                lat        REAL,
                lon        REAL,
                username   TEXT,
                password   TEXT,
                method     TEXT,
                path       TEXT,
                user_agent TEXT,
                payload    TEXT,
                asn        TEXT,
                scanner    TEXT,
                command    TEXT
            )
        """)
        # Migrate older DBs that lack the new columns
        existing = {row[1] for row in conn.execute("PRAGMA table_info(events)")}
        for col, typ in [("asn", "TEXT"), ("scanner", "TEXT"), ("command", "TEXT")]:
            if col not in existing:
                conn.execute(f"ALTER TABLE events ADD COLUMN {col} {typ}")

        conn.execute("CREATE INDEX IF NOT EXISTS idx_ts      ON events(timestamp)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_ip      ON events(src_ip)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_service ON events(service)")
        conn.commit()
        conn.close()
    log.info("Database ready: %s", DB_PATH)


# ── GeoIP ─────────────────────────────────────────────────────────────────────

def _is_private(ip):
    try:
        return ipaddress.ip_address(ip).is_private
    except ValueError:
        return False


_public_geo = None  # cached location of this machine's public IP


def _get_public_geo():
    """Return GeoIP of the honeypot's own public IP for LAN attacker location."""
    global _public_geo
    if _public_geo is not None:
        return _public_geo
    try:
        r = requests.get("http://ip-api.com/json", timeout=4)
        data = r.json()
        if data.get("status") == "success":
            _public_geo = {
                "country": data.get("country", ""),
                "city":    data.get("city", ""),
                "lat":     data.get("lat",  0.0),
                "lon":     data.get("lon",  0.0),
                "asn":     data.get("as",   ""),
            }
        else:
            _public_geo = {"country": "", "city": "", "lat": 0.0, "lon": 0.0, "asn": ""}
    except Exception:
        _public_geo = {"country": "", "city": "", "lat": 0.0, "lon": 0.0, "asn": ""}
    return _public_geo


def _geoip(ip):
    if ip in _geo_cache:
        return _geo_cache[ip]
    if _is_private(ip):
        pub = _get_public_geo()
        result = {
            "country": pub["country"],
            "city":    f"LAN ({pub['city']})" if pub["city"] else "LAN",
            "lat":     pub["lat"],
            "lon":     pub["lon"],
            "asn":     "Local Network",
        }
        _geo_cache[ip] = result
        return result
    try:
        r = requests.get(GEOIP_API.format(ip=ip), timeout=4)
        data = r.json()
        if data.get("status") == "success":
            result = {
                "country": data.get("country", ""),
                "city":    data.get("city",    ""),
                "lat":     data.get("lat",     0.0),
                "lon":     data.get("lon",     0.0),
                "asn":     data.get("as",      ""),
            }
        else:
            result = {"country": "", "city": "", "lat": 0.0, "lon": 0.0, "asn": ""}
    except Exception:
        result = {"country": "", "city": "", "lat": 0.0, "lon": 0.0, "asn": ""}
    _geo_cache[ip] = result
    return result


# ── Alerts ────────────────────────────────────────────────────────────────────

_alert_lock  = threading.Lock()
_alert_times = {}   # ip → last-alert epoch


def _maybe_alert(service, ip, country, username, password):
    if not DISCORD_WEBHOOK_URL and not SLACK_WEBHOOK_URL:
        return
    if not username:
        return
    now = time.time()
    with _alert_lock:
        if now - _alert_times.get(ip, 0) < 60:
            return
        _alert_times[ip] = now

    emoji = {"ssh": "🔐", "http": "🌐", "ftp": "📁", "telnet": "📟"}.get(service, "🚨")
    msg = (f"{emoji} **{service.upper()} Credential Capture**\n"
           f"**IP:** `{ip}` ({country})\n"
           f"**Credentials:** `{username}:{password}`")

    threading.Thread(target=_post_alerts, args=(msg,), daemon=True).start()


def _post_alerts(msg):
    if DISCORD_WEBHOOK_URL:
        try:
            requests.post(DISCORD_WEBHOOK_URL, json={"content": msg}, timeout=5)
        except Exception:
            pass
    if SLACK_WEBHOOK_URL:
        try:
            requests.post(SLACK_WEBHOOK_URL, json={"text": msg}, timeout=5)
        except Exception:
            pass


# ── Core log function ─────────────────────────────────────────────────────────

def log_event(service, src_ip, src_port, **kw):
    geo = _geoip(src_ip)
    ts  = datetime.now(timezone.utc).isoformat(timespec="seconds")

    row = {
        "timestamp":  ts,
        "service":    service,
        "src_ip":     src_ip,
        "src_port":   src_port,
        "country":    geo["country"],
        "city":       geo["city"],
        "lat":        geo["lat"],
        "lon":        geo["lon"],
        "asn":        geo["asn"],
        "username":   kw.get("username"),
        "password":   kw.get("password"),
        "method":     kw.get("method"),
        "path":       kw.get("path"),
        "user_agent": kw.get("user_agent"),
        "payload":    kw.get("payload"),
        "scanner":    kw.get("scanner"),
        "command":    kw.get("command"),
    }

    with _db_lock:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.execute(
            """INSERT INTO events
               (timestamp,service,src_ip,src_port,country,city,lat,lon,
                username,password,method,path,user_agent,payload,asn,scanner,command)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (row["timestamp"], row["service"], row["src_ip"], row["src_port"],
             row["country"],   row["city"],    row["lat"],    row["lon"],
             row["username"],  row["password"],row["method"], row["path"],
             row["user_agent"],row["payload"], row["asn"],    row["scanner"],
             row["command"]),
        )
        row["id"] = cur.lastrowid
        conn.commit()
        conn.close()

    log.info("[%s] %s:%s  u=%s p=%s scanner=%s",
             service.upper(), src_ip, src_port,
             row["username"], row["password"], row["scanner"])

    _maybe_alert(service, src_ip, geo["country"], row["username"], row["password"])

    if _event_hook:
        try:
            _event_hook(row)
        except Exception:
            pass
