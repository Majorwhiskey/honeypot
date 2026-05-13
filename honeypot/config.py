import os
from dotenv import load_dotenv

load_dotenv()

def _int(key, default):
    return int(os.getenv(key, default))

SSH_PORT       = _int("SSH_PORT", 2222)
HTTP_PORT      = _int("HTTP_PORT", 8888)
FTP_PORT       = _int("FTP_PORT", 2121)
TELNET_PORT    = _int("TELNET_PORT", 2323)
DASHBOARD_PORT = _int("DASHBOARD_PORT", 5000)

_ROOT         = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH       = os.path.join(_ROOT, "data", "honeypot.db")
HOST_KEY_PATH = os.path.join(_ROOT, "data", "server.key")
LOG_FILE      = os.path.join(_ROOT, os.getenv("LOG_FILE", "data/honeypot.log"))

SSH_BANNER         = os.getenv("SSH_BANNER",         "SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.6")
HTTP_SERVER_HEADER = os.getenv("HTTP_SERVER_HEADER", "Apache/2.4.41 (Ubuntu)")

# ip-api fields: status,country,city,lat,lon,as (as = ASN + org name)
GEOIP_API = "http://ip-api.com/json/{ip}?fields=status,country,city,lat,lon,as"

DASHBOARD_USER = os.getenv("DASHBOARD_USER", "")
DASHBOARD_PASS = os.getenv("DASHBOARD_PASS", "")

DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")
SLACK_WEBHOOK_URL   = os.getenv("SLACK_WEBHOOK_URL",   "")

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
