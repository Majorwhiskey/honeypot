import os
import logging
import sqlite3
from flask import Flask, jsonify, render_template, request
from honeypot.config import DB_PATH, DASHBOARD_PORT

logging.getLogger("werkzeug").setLevel(logging.ERROR)

app = Flask(
    __name__,
    template_folder=os.path.join(os.path.dirname(__file__), "templates"),
    static_folder=os.path.join(os.path.dirname(__file__), "static"),
)


def _query(sql, params=()):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/stats")
def stats():
    rows = _query("""
        SELECT
            COUNT(*)                                                AS total_events,
            COUNT(DISTINCT src_ip)                                  AS unique_ips,
            COUNT(DISTINCT CASE WHEN country != '' AND country != 'Local'
                               THEN country END)                    AS countries,
            SUM(CASE WHEN service='ssh'  THEN 1 ELSE 0 END)        AS ssh_count,
            SUM(CASE WHEN service='http' THEN 1 ELSE 0 END)        AS http_count
        FROM events
    """)
    return jsonify(rows[0] if rows else {})


@app.route("/api/timeline")
def timeline():
    rows = _query("""
        SELECT
            strftime('%Y-%m-%dT%H:00', timestamp) AS hour,
            COUNT(*)                               AS count
        FROM events
        WHERE timestamp >= datetime('now', '-24 hours')
        GROUP BY hour
        ORDER BY hour
    """)
    return jsonify(rows)


@app.route("/api/top-ips")
def top_ips():
    rows = _query("""
        SELECT src_ip, country, COUNT(*) AS count
        FROM events
        GROUP BY src_ip
        ORDER BY count DESC
        LIMIT 10
    """)
    return jsonify(rows)


@app.route("/api/top-credentials")
def top_credentials():
    rows = _query("""
        SELECT username, password, COUNT(*) AS count
        FROM events
        WHERE service='ssh' AND username IS NOT NULL AND username != ''
        GROUP BY username, password
        ORDER BY count DESC
        LIMIT 15
    """)
    return jsonify(rows)


@app.route("/api/events")
def events():
    limit = min(int(request.args.get("limit", 50)), 200)
    rows = _query("SELECT * FROM events ORDER BY id DESC LIMIT ?", (limit,))
    return jsonify(rows)


@app.route("/api/map-data")
def map_data():
    rows = _query("""
        SELECT src_ip, country, city, lat, lon, COUNT(*) AS count
        FROM events
        WHERE lat IS NOT NULL AND lat != 0
        GROUP BY src_ip
        ORDER BY count DESC
        LIMIT 500
    """)
    return jsonify(rows)


def start_dashboard():
    print(f"[Dashboard] Listening on port {DASHBOARD_PORT}")
    app.run(host="0.0.0.0", port=DASHBOARD_PORT, debug=False, use_reloader=False, threaded=True)
