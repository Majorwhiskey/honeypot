import os
import re
import socket
import threading
import logging
import paramiko
from datetime import datetime, timezone
from honeypot.config import SSH_PORT, SSH_BANNER, HOST_KEY_PATH
from honeypot.logger import log_event

log = logging.getLogger("honeypot.ssh")

_DOWNLOAD_RE = re.compile(
    r"(?:wget|curl)\s+(?:-\S+\s+)*(?:--\S+\s+)*(https?://\S+|ftp://\S+)", re.I
)

# ── Fake shell command table ───────────────────────────────────────────────────

_CMDS = {
    "id":             "uid=0(root) gid=0(root) groups=0(root)",
    "whoami":         "root",
    "hostname":       "ubuntu-server",
    "uname":          "Linux",
    "uname -a":       "Linux ubuntu-server 5.15.0-76-generic #83-Ubuntu SMP Thu Jun 15 19:16:32 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux",
    "uname -r":       "5.15.0-76-generic",
    "uname -s":       "Linux",
    "uname -m":       "x86_64",
    "pwd":            "/root",
    "ls":             "Desktop  Documents  snap",
    "ls -la": (
        "total 28\r\n"
        "drwx------  4 root root 4096 May 12 08:23 .\r\n"
        "drwxr-xr-x 20 root root 4096 May 12 08:01 ..\r\n"
        "-rw-r--r--  1 root root 3526 Apr 21 08:01 .bashrc\r\n"
        "-rw-r--r--  1 root root  161 Apr 21 08:01 .profile\r\n"
        "drwxr-xr-x  2 root root 4096 May 12 08:01 Desktop\r\n"
        "drwxr-xr-x  2 root root 4096 May 12 08:01 Documents"
    ),
    "ls -l":          "total 8\r\ndrwxr-xr-x 2 root root 4096 May 12 08:01 Desktop\r\ndrwxr-xr-x 2 root root 4096 May 12 08:01 Documents",
    "uptime":         " 08:23:47 up 14 days,  2:15,  1 user,  load average: 0.08, 0.02, 0.01",
    "free -m": (
        "               total        used        free      shared  buff/cache   available\r\n"
        "Mem:            1993         234        1247          12         511        1626\r\n"
        "Swap:              0           0           0"
    ),
    "df -h": (
        "Filesystem      Size  Used Avail Use% Mounted on\r\n"
        "/dev/sda1        25G  4.1G   20G  17% /\r\n"
        "tmpfs           997M     0  997M   0% /dev/shm"
    ),
    "ps": (
        "  PID TTY          TIME CMD\r\n"
        " 1234 pts/0    00:00:00 bash\r\n"
        " 1235 pts/0    00:00:00 ps"
    ),
    "ps aux": (
        "USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\r\n"
        "root         1  0.0  0.3 169596 6240 ?        Ss   08:01   0:02 /sbin/init\r\n"
        "root       789  0.0  0.5 672260 10816 ?       Ssl  08:01   0:00 /usr/bin/python3\r\n"
        "root      1234  0.0  0.2  22136  4352 pts/0   Ss   08:23   0:00 -bash"
    ),
    "w": (
        " 08:23:47 up 14 days,  2:15,  1 user,  load average: 0.08, 0.02, 0.01\r\n"
        "USER     TTY      FROM             LOGIN@   IDLE JCPU   PCPU WHAT\r\n"
        "root     pts/0    192.168.1.1      08:23    0.00s  0.01s  0.00s w"
    ),
    "who":            "root     pts/0        2025-05-12 08:23 (192.168.1.1)",
    "last":           "root     pts/0        192.168.1.1      Mon May 12 08:23   still logged in",
    "history":        "",
    "env": (
        "SHELL=/bin/bash\r\nTERM=xterm\r\nHOME=/root\r\n"
        "LOGNAME=root\r\nPATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\r\nPWD=/root"
    ),
    "printenv":       "SHELL=/bin/bash\r\nTERM=xterm\r\nHOME=/root\r\nLOGNAME=root\r\nPATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\r\nPWD=/root",
    "cat /etc/os-release": (
        'NAME="Ubuntu"\r\nVERSION="22.04.3 LTS (Jammy Jellyfish)"\r\n'
        'ID=ubuntu\r\nID_LIKE=debian\r\nPRETTY_NAME="Ubuntu 22.04.3 LTS"\r\nVERSION_ID="22.04"'
    ),
    "cat /etc/hostname": "ubuntu-server",
    "cat /etc/passwd": (
        "root:x:0:0:root:/root:/bin/bash\r\n"
        "daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\r\n"
        "www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\r\n"
        "ubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash"
    ),
    "cat /etc/shadow":        "cat: /etc/shadow: Permission denied",
    "sudo cat /etc/shadow":   "sudo: no tty present and no askpass program specified",
    "ifconfig": (
        "eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\r\n"
        "        inet 10.0.2.15  netmask 255.255.255.0  broadcast 10.0.2.255\r\n"
        "        ether 08:00:27:3f:1a:2b  txqueuelen 1000  (Ethernet)\r\n"
        "lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536\r\n"
        "        inet 127.0.0.1  netmask 255.0.0.0"
    ),
    "ip a":    "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\r\n    inet 127.0.0.1/8 scope host lo\r\n2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500\r\n    inet 10.0.2.15/24 brd 10.0.2.255 scope global eth0",
    "ip addr": "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\r\n    inet 127.0.0.1/8 scope host lo\r\n2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500\r\n    inet 10.0.2.15/24 brd 10.0.2.255 scope global eth0",
    "netstat -an": (
        "Active Internet connections (servers and established)\r\n"
        "Proto Recv-Q Send-Q Local Address           Foreign Address         State\r\n"
        "tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN\r\n"
        "tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN"
    ),
}

_EXIT_CMDS = {"exit", "logout", "quit", "q", "bye"}


def _process_cmd(cmd, ip):
    """Return response text, or None to end the session."""
    stripped = cmd.strip()
    if not stripped:
        return ""
    if stripped.lower() in _EXIT_CMDS:
        return None

    # Download attempt — log URL as threat intelligence
    m = _DOWNLOAD_RE.search(stripped)
    if m:
        url = m.group(1)
        log_event("ssh", ip, 0, command=stripped, path=url, scanner="malware_download")
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        host = url.split("/")[2] if "/" in url[8:] else url
        return (
            f"--{ts}--  {url}\r\n"
            f"Resolving {host}... failed: Temporary failure in name resolution."
        )

    # Exact match
    if stripped in _CMDS:
        return _CMDS[stripped]

    # Prefix matches
    low = stripped.lower()
    if low.startswith("echo "):
        return stripped[5:]
    if low.startswith("cd "):
        return ""
    if low.startswith("cat "):
        return f"cat: {stripped[4:]}: No such file or directory"
    if low.startswith("ls "):
        arg = stripped[3:].strip()
        return f"ls: cannot access '{arg}': No such file or directory"
    if low.startswith("mkdir ") or low.startswith("touch "):
        return ""
    if low.startswith("rm ") or low.startswith("rmdir "):
        return ""
    if low.startswith("chmod ") or low.startswith("chown "):
        return ""
    if low.startswith("python") or low.startswith("python3"):
        return "Python 3.10.12 (main, Nov 20 2023, 15:14:05) [GCC 11.4.0 on linux]\r\nType \"help\", \"copyright\", \"credits\" or \"license\" for more information.\r\n>>>"

    first = stripped.split()[0]
    return f"-bash: {first}: command not found"


# ── Fake interactive shell ────────────────────────────────────────────────────

_MOTD = (
    b"\r\nWelcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-76-generic x86_64)\r\n"
    b"\r\n * Documentation:  https://help.ubuntu.com\r\n"
    b" * Management:     https://landscape.canonical.com\r\n"
    b"\r\nLast login: Mon May 12 06:11:34 2025 from 192.168.1.1\r\n"
)
_PROMPT = b"root@ubuntu-server:~# "


def _run_shell(chan, ip):
    try:
        chan.settimeout(120)
        chan.sendall(_MOTD)
        chan.sendall(_PROMPT)

        buf = b""
        while True:
            try:
                data = chan.recv(1024)
            except Exception:
                break
            if not data:
                break

            for byte in data:
                ch = bytes([byte])
                if ch in (b"\r", b"\n"):
                    chan.sendall(b"\r\n")
                    cmd = buf.decode(errors="ignore").strip()
                    buf = b""
                    if cmd:
                        response = _process_cmd(cmd, ip)
                        if response is None:
                            chan.sendall(b"logout\r\n")
                            return
                        if response:
                            chan.sendall(response.replace("\r\n", "\r\n").encode() + b"\r\n")
                    chan.sendall(_PROMPT)
                elif byte in (127, 8):   # DEL / backspace
                    if buf:
                        buf = buf[:-1]
                        chan.sendall(b"\x08 \x08")
                else:
                    buf += ch
                    chan.sendall(ch)
    except Exception:
        pass
    finally:
        try:
            chan.close()
        except Exception:
            pass


# ── Paramiko server interface ─────────────────────────────────────────────────

class _SSHServer(paramiko.ServerInterface):
    def __init__(self, ip, port):
        self.ip       = ip
        self.port     = port
        self._chan    = None
        self._username = None

    def check_channel_request(self, kind, chanid):
        if kind == "session":
            return paramiko.OPEN_SUCCEEDED
        return paramiko.OPEN_FAILED_ADMINISTRATIVELY_PROHIBITED

    def check_auth_password(self, username, password):
        self._username = username
        log_event("ssh", self.ip, self.port, username=username, password=password)
        return paramiko.AUTH_SUCCESSFUL

    def check_auth_publickey(self, username, key):
        return paramiko.AUTH_FAILED

    def get_allowed_auths(self, username):
        return "password"

    def check_channel_shell_request(self, channel):
        return True

    def check_channel_pty_request(self, channel, term, width, height, pixelwidth, pixelheight, modes):
        return True

    def check_channel_exec_request(self, channel, command):
        cmd = command.decode(errors="ignore")
        log_event("ssh", self.ip, self.port, command=cmd, username=self._username)
        resp = _process_cmd(cmd, self.ip)
        if resp:
            channel.sendall((resp + "\n").encode())
        channel.send_exit_status(0)
        threading.Thread(target=channel.close, daemon=True).start()
        return True


# ── Transport / accept loop ───────────────────────────────────────────────────

def _get_host_key():
    if os.path.exists(HOST_KEY_PATH):
        return paramiko.RSAKey.from_private_key_file(HOST_KEY_PATH)
    key = paramiko.RSAKey.generate(2048)
    os.makedirs(os.path.dirname(HOST_KEY_PATH), exist_ok=True)
    key.write_private_key_file(HOST_KEY_PATH)
    log.info("Generated new RSA host key")
    return key


def _handle(client_sock, addr, host_key):
    transport = paramiko.Transport(client_sock)
    transport.local_version = SSH_BANNER
    transport.add_server_key(host_key)
    server = _SSHServer(addr[0], addr[1])
    try:
        transport.start_server(server=server)
        chan = transport.accept(20)
        if chan:
            _run_shell(chan, addr[0])
    except Exception:
        pass
    finally:
        try:
            transport.close()
        except Exception:
            pass


def start_ssh_honeypot():
    host_key = _get_host_key()
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(("0.0.0.0", SSH_PORT))
    sock.listen(100)
    log.info("SSH Honeypot listening on port %d", SSH_PORT)
    while True:
        try:
            client, addr = sock.accept()
            threading.Thread(
                target=_handle, args=(client, addr, host_key), daemon=True
            ).start()
        except Exception:
            pass
