import sqlite3
import threading
import ipaddress
import requests
from datetime import datetime
from honeypot.config import DB_PATH, GEOIP_API

_lock = threading.Lock()
_geo_cache = {}


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp   TEXT,
            service     TEXT,
            src_ip      TEXT,
            src_port    INTEGER,
            country     TEXT,
            city        TEXT,
            lat         REAL,
            lon         REAL,
            username    TEXT,
            password    TEXT,
            method      TEXT,
            path        TEXT,
            user_agent  TEXT,
            payload     TEXT
        )
    """)
    conn.commit()
    conn.close()


def _is_private(ip):
    try:
        return ipaddress.ip_address(ip).is_private
    except ValueError:
        return False


def _geoip(ip):
    if ip in _geo_cache:
        return _geo_cache[ip]
    if _is_private(ip):
        result = {"country": "Local", "city": "Local", "lat": 0.0, "lon": 0.0}
        _geo_cache[ip] = result
        return result
    try:
        r = requests.get(GEOIP_API.format(ip=ip), timeout=3)
        data = r.json()
        if data.get("status") == "success":
            result = {
                "country": data.get("country", ""),
                "city": data.get("city", ""),
                "lat": data.get("lat", 0.0),
                "lon": data.get("lon", 0.0),
            }
        else:
            result = {"country": "", "city": "", "lat": 0.0, "lon": 0.0}
    except Exception:
        result = {"country": "", "city": "", "lat": 0.0, "lon": 0.0}
    _geo_cache[ip] = result
    return result


def log_event(service, src_ip, src_port, **kwargs):
    geo = _geoip(src_ip)
    with _lock:
        conn = sqlite3.connect(DB_PATH)
        conn.execute(
            """
            INSERT INTO events
                (timestamp, service, src_ip, src_port, country, city, lat, lon,
                 username, password, method, path, user_agent, payload)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                datetime.utcnow().isoformat(),
                service,
                src_ip,
                src_port,
                geo["country"],
                geo["city"],
                geo["lat"],
                geo["lon"],
                kwargs.get("username"),
                kwargs.get("password"),
                kwargs.get("method"),
                kwargs.get("path"),
                kwargs.get("user_agent"),
                kwargs.get("payload"),
            ),
        )
        conn.commit()
        conn.close()
