import os
import sys
import time
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from honeypot.logger import init_db
from honeypot.ssh_honeypot import start_ssh_honeypot
from honeypot.http_honeypot import start_http_honeypot
from dashboard.app import start_dashboard

if __name__ == "__main__":
    _root = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(os.path.join(_root, "data"), exist_ok=True)
    init_db()

    print("=" * 58)
    print("  HONEYPOT SYSTEM  —  PRAGYAN EDUSEC")
    print("  KLE INSTITUTE OF TECHNOLOGY  //  INTERNSHIP PROJECT")
    print("=" * 58)

    services = [
        ("SSH Honeypot",  start_ssh_honeypot),
        ("HTTP Honeypot", start_http_honeypot),
        ("Dashboard",     start_dashboard),
    ]

    threads = []
    for name, target in services:
        t = threading.Thread(target=target, name=name, daemon=True)
        t.start()
        threads.append(t)

    print()
    print("  Dashboard  →  http://localhost:5000")
    print("  SSH        →  port 2222")
    print("  HTTP       →  http://localhost:8888")
    print()
    print("  Press Ctrl+C to stop")
    print("=" * 58)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[*] Shutting down.")
