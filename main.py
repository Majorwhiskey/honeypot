import os
import sys
import signal
import logging
import logging.handlers
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from honeypot.config import (
    SSH_PORT, HTTP_PORT, FTP_PORT, TELNET_PORT, DASHBOARD_PORT,
    LOG_LEVEL, LOG_FILE,
)
from honeypot.logger import init_db
from honeypot.ssh_honeypot    import start_ssh_honeypot
from honeypot.http_honeypot   import start_http_honeypot
from honeypot.ftp_honeypot    import start_ftp_honeypot
from honeypot.telnet_honeypot import start_telnet_honeypot
from dashboard.app            import start_dashboard


def _setup_logging():
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    fmt = logging.Formatter(
        "%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    root = logging.getLogger()
    root.setLevel(getattr(logging, LOG_LEVEL.upper(), logging.INFO))

    # Rotating file — 10 MB × 5 files
    fh = logging.handlers.RotatingFileHandler(LOG_FILE, maxBytes=10 * 1024 * 1024, backupCount=5)
    fh.setFormatter(fmt)
    root.addHandler(fh)

    # Console (INFO and above)
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(fmt)
    ch.setLevel(logging.INFO)
    root.addHandler(ch)

    # Silence noisy third-party loggers
    for noisy in ("paramiko", "werkzeug", "socketio", "engineio"):
        logging.getLogger(noisy).setLevel(logging.ERROR)


_stop_event = threading.Event()


def _handle_signal(sig, frame):
    print("\n[*] Shutting down …")
    _stop_event.set()


if __name__ == "__main__":
    _setup_logging()
    log = logging.getLogger("honeypot.main")

    _root = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(os.path.join(_root, "data"), exist_ok=True)
    init_db()

    signal.signal(signal.SIGINT,  _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    banner = "=" * 62
    print(banner)
    print("  HONEYPOT SYSTEM  --  PRAGYAN EDUSEC")
    print("  KLE INSTITUTE OF TECHNOLOGY  //  INTERNSHIP PROJECT")
    print(banner)

    services = [
        ("SSH Honeypot",    start_ssh_honeypot),
        ("HTTP Honeypot",   start_http_honeypot),
        ("FTP Honeypot",    start_ftp_honeypot),
        ("Telnet Honeypot", start_telnet_honeypot),
        ("Dashboard",       start_dashboard),
    ]

    threads = []
    for name, target in services:
        t = threading.Thread(target=target, name=name, daemon=True)
        t.start()
        threads.append(t)

    print()
    print(f"  Dashboard  ->  http://localhost:{DASHBOARD_PORT}")
    print(f"  SSH        ->  port {SSH_PORT}")
    print(f"  HTTP       ->  http://localhost:{HTTP_PORT}")
    print(f"  FTP        ->  port {FTP_PORT}")
    print(f"  Telnet     ->  port {TELNET_PORT}")
    if FTP_PORT < 1024 or TELNET_PORT < 1024:
        print()
        print("  NOTE: ports < 1024 require  sudo  on Linux")
    print()
    print(f"  Logs       ->  {LOG_FILE}")
    print()
    print("  Press Ctrl+C to stop")
    print(banner)

    _stop_event.wait()
    log.info("Honeypot stopped.")
