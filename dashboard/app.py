import csv
import io
import os
import logging
import sqlite3
from functools import wraps

from flask import Flask, jsonify, render_template, request, Response
from flask_socketio import SocketIO

from honeypot.config import DB_PATH, DASHBOARD_PORT, DASHBOARD_USER, DASHBOARD_PASS
from honeypot import logger as hp_logger

logging.getLogger("werkzeug").setLevel(logging.ERROR)
log = logging.getLogger("honeypot.dashboard")

app = Flask(
    __name__,
    template_folder=os.path.join(os.path.dirname(__file__), "templates"),
    static_folder=os.path.join(os.path.dirname(__file__), "static"),
)
app.config["SECRET_KEY"] = os.urandom(24)

socketio = SocketIO(app, async_mode="threading", cors_allowed_origins="*", logger=False, engineio_logger=False)

# Wire live event push from logger → SocketIO
def _push_event(event_data):
    socketio.emit("new_event", event_data, namespace="/")

hp_logger.register_event_hook(_push_event)


# ── Auth ──────────────────────────────────────────────────────────────────────

def _require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not DASHBOARD_USER:
            return f(*args, **kwargs)
        auth = request.authorization
        if not auth or auth.username != DASHBOARD_USER or auth.password != DASHBOARD_PASS:
            return Response(
                "Authentication required.",
                401,
                {"WWW-Authenticate": 'Basic realm="Honeypot Dashboard"'},
            )
        return f(*args, **kwargs)
    return decorated


# ── DB helper ─────────────────────────────────────────────────────────────────

def _query(sql, params=()):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def _build_filter(args):
    """Return (WHERE clause, params list) from request query args."""
    conditions, params = [], []
    for field, col in [("service", "service"), ("country", "country"), ("ip", "src_ip")]:
        val = args.get(field, "").strip()
        if val:
            conditions.append(f"{col} LIKE ?")
            params.append(f"%{val}%")
    q = args.get("q", "").strip()
    if q:
        conditions.append("(src_ip LIKE ? OR username LIKE ? OR country LIKE ? OR path LIKE ?)")
        params += [f"%{q}%"] * 4
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    return where, params


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/")
@_require_auth
def index():
    return render_template("index.html")


@app.route("/api/stats")
@_require_auth
def stats():
    rows = _query("""
        SELECT
            COUNT(*)                                                           AS total_events,
            COUNT(DISTINCT src_ip)                                             AS unique_ips,
            COUNT(DISTINCT CASE WHEN country NOT IN ('','Local') THEN country END) AS countries,
            SUM(CASE WHEN service='ssh'    THEN 1 ELSE 0 END)                 AS ssh_count,
            SUM(CASE WHEN service='http'   THEN 1 ELSE 0 END)                 AS http_count,
            SUM(CASE WHEN service='ftp'    THEN 1 ELSE 0 END)                 AS ftp_count,
            SUM(CASE WHEN service='telnet' THEN 1 ELSE 0 END)                 AS telnet_count,
            SUM(CASE WHEN username IS NOT NULL AND username!='' THEN 1 ELSE 0 END) AS cred_count
        FROM events
    """)
    return jsonify(rows[0] if rows else {})


@app.route("/api/timeline")
@_require_auth
def timeline():
    rows = _query("""
        SELECT strftime('%Y-%m-%dT%H:00', timestamp) AS hour, COUNT(*) AS count
        FROM events
        WHERE timestamp >= datetime('now', '-24 hours')
        GROUP BY hour ORDER BY hour
    """)
    return jsonify(rows)


@app.route("/api/top-ips")
@_require_auth
def top_ips():
    rows = _query("""
        SELECT src_ip, country, COUNT(*) AS count
        FROM events GROUP BY src_ip ORDER BY count DESC LIMIT 10
    """)
    return jsonify(rows)


@app.route("/api/countries")
@_require_auth
def countries():
    rows = _query("""
        SELECT country, COUNT(*) AS count
        FROM events WHERE country NOT IN ('','Local')
        GROUP BY country ORDER BY count DESC LIMIT 12
    """)
    return jsonify(rows)


@app.route("/api/top-credentials")
@_require_auth
def top_credentials():
    rows = _query("""
        SELECT service, username, password, COUNT(*) AS count
        FROM events WHERE username IS NOT NULL AND username != ''
        GROUP BY service, username, password ORDER BY count DESC LIMIT 25
    """)
    return jsonify(rows)


@app.route("/api/events")
@_require_auth
def events():
    limit  = min(int(request.args.get("limit", 50)), 500)
    offset = int(request.args.get("offset", 0))
    where, params = _build_filter(request.args)
    rows  = _query(
        f"SELECT * FROM events {where} ORDER BY id DESC LIMIT ? OFFSET ?",
        params + [limit, offset],
    )
    total = _query(f"SELECT COUNT(*) AS cnt FROM events {where}", params)
    return jsonify({"events": rows, "total": total[0]["cnt"] if total else 0})


@app.route("/api/map-data")
@_require_auth
def map_data():
    rows = _query("""
        SELECT src_ip, country, city, lat, lon, COUNT(*) AS count
        FROM events WHERE lat IS NOT NULL AND lat != 0
        GROUP BY src_ip ORDER BY count DESC LIMIT 500
    """)
    return jsonify(rows)


@app.route("/api/export")
@_require_auth
def export_data():
    fmt = request.args.get("format", "json")
    where, params = _build_filter(request.args)
    rows = _query(f"SELECT * FROM events {where} ORDER BY id DESC", params)

    if fmt == "csv":
        out = io.StringIO()
        if rows:
            writer = csv.DictWriter(out, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        return Response(
            out.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment; filename=honeypot_export.csv"},
        )
    return Response(
        __import__("json").dumps(rows, indent=2),
        mimetype="application/json",
        headers={"Content-Disposition": "attachment; filename=honeypot_export.json"},
    )


# ── SocketIO events ───────────────────────────────────────────────────────────

@socketio.on("connect")
def on_connect():
    log.debug("Dashboard client connected")


def start_dashboard():
    log.info("Dashboard listening on port %d", DASHBOARD_PORT)
    socketio.run(
        app,
        host="0.0.0.0",
        port=DASHBOARD_PORT,
        debug=False,
        use_reloader=False,
        log_output=False,
    )
