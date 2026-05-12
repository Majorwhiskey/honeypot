import socket
import threading
import logging
from honeypot.config import FTP_PORT
from honeypot.logger import log_event

log = logging.getLogger("honeypot.ftp")

_BANNER = b"220 FTP server (vsftpd 3.0.5) ready.\r\n"


def _handle(conn, addr):
    ip, port = addr
    try:
        conn.settimeout(30)
        conn.sendall(_BANNER)
        username = None
        while True:
            raw = conn.recv(1024)
            if not raw:
                break
            line = raw.decode(errors="ignore").strip()
            if not line:
                continue
            parts = line.split(None, 1)
            cmd   = parts[0].upper()
            arg   = parts[1] if len(parts) > 1 else ""

            if cmd == "USER":
                username = arg
                conn.sendall(b"331 Please specify the password.\r\n")
            elif cmd == "PASS":
                log_event("ftp", ip, port, username=username, password=arg)
                conn.sendall(b"530 Login incorrect.\r\n")
                username = None
            elif cmd == "QUIT":
                conn.sendall(b"221 Goodbye.\r\n")
                break
            elif cmd == "SYST":
                conn.sendall(b"215 UNIX Type: L8\r\n")
            elif cmd == "FEAT":
                conn.sendall(b"211-Features:\r\n PASV\r\n UTF8\r\n211 End\r\n")
            elif cmd == "NOOP":
                conn.sendall(b"200 NOOP ok.\r\n")
            else:
                conn.sendall(b"530 Please login with USER and PASS.\r\n")
    except Exception:
        pass
    finally:
        try:
            conn.close()
        except Exception:
            pass


def start_ftp_honeypot():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(("0.0.0.0", FTP_PORT))
    sock.listen(100)
    log.info("FTP Honeypot listening on port %d", FTP_PORT)
    while True:
        try:
            conn, addr = sock.accept()
            threading.Thread(target=_handle, args=(conn, addr), daemon=True).start()
        except Exception:
            pass
