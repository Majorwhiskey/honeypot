import os

SSH_PORT = 2222
HTTP_PORT = 8080
DASHBOARD_PORT = 5000

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(_ROOT, "data", "honeypot.db")
HOST_KEY_PATH = os.path.join(_ROOT, "data", "server.key")

SSH_BANNER = "SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.6"
HTTP_SERVER_HEADER = "Apache/2.4.41 (Ubuntu)"

GEOIP_API = "http://ip-api.com/json/{ip}"
