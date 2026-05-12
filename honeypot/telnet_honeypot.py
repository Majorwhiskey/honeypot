import socket
import threading
import logging
from honeypot.config import TELNET_PORT
from honeypot.logger import log_event

log = logging.getLogger("honeypot.telnet")

# Negotiate: WILL SGA, WILL ECHO, DO SGA — makes the client hand over char mode
_NEGO = (
    b"\xff\xfb\x03"   # IAC WILL Suppress-Go-Ahead
    b"\xff\xfb\x01"   # IAC WILL Echo
    b"\xff\xfd\x03"   # IAC DO   Suppress-Go-Ahead
)

_BANNER = b"\r\nBusyBox v1.36.1 (2023-11-14 13:38:11 UTC) built-in shell (ash)\r\n\r\n"


def _recv_line(conn, echo=True, max_len=256):
    buf = bytearray()
    while len(buf) < max_len:
        try:
            ch = conn.recv(1)
        except Exception:
            break
        if not ch:
            break
        b = ch[0]
        # Skip IAC option sequences (3 bytes)
        if b == 0xFF:
            conn.recv(2)
            continue
        if b in (0x0D, 0x0A):  # CR or LF = end of line
            break
        if b in (0x7F, 0x08):  # backspace / DEL
            if buf:
                buf.pop()
                if echo:
                    conn.sendall(b"\x08 \x08")
        else:
            buf.append(b)
            if echo:
                conn.sendall(ch)
    return buf.decode(errors="ignore")


def _handle(conn, addr):
    ip, port = addr
    try:
        conn.settimeout(30)
        conn.sendall(_NEGO)
        conn.sendall(_BANNER)
        conn.sendall(b"login: ")
        username = _recv_line(conn)
        conn.sendall(b"\r\nPassword: ")
        password = _recv_line(conn, echo=False)
        log_event("telnet", ip, port, username=username, password=password)
        conn.sendall(b"\r\nLogin incorrect\r\n\r\n")
    except Exception:
        pass
    finally:
        try:
            conn.close()
        except Exception:
            pass


def start_telnet_honeypot():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(("0.0.0.0", TELNET_PORT))
    sock.listen(100)
    log.info("Telnet Honeypot listening on port %d", TELNET_PORT)
    while True:
        try:
            conn, addr = sock.accept()
            threading.Thread(target=_handle, args=(conn, addr), daemon=True).start()
        except Exception:
            pass
