import os
import socket
import threading
import paramiko
from honeypot.config import SSH_PORT, SSH_BANNER, HOST_KEY_PATH
from honeypot.logger import log_event


class _SSHServer(paramiko.ServerInterface):
    def __init__(self, ip, port):
        self.ip = ip
        self.port = port

    def check_channel_request(self, kind, chanid):
        if kind == "session":
            return paramiko.OPEN_SUCCEEDED
        return paramiko.OPEN_FAILED_ADMINISTRATIVELY_PROHIBITED

    def check_auth_password(self, username, password):
        log_event("ssh", self.ip, self.port, username=username, password=password)
        print(f"[SSH] {self.ip}:{self.port}  {username}:{password}")
        return paramiko.AUTH_FAILED

    def check_auth_publickey(self, username, key):
        return paramiko.AUTH_FAILED

    def get_allowed_auths(self, username):
        return "password"


def _get_host_key():
    if os.path.exists(HOST_KEY_PATH):
        return paramiko.RSAKey.from_private_key_file(HOST_KEY_PATH)
    key = paramiko.RSAKey.generate(2048)
    os.makedirs(os.path.dirname(HOST_KEY_PATH), exist_ok=True)
    key.write_private_key_file(HOST_KEY_PATH)
    print("[SSH] Generated new RSA host key")
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
            chan.close()
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
    print(f"[SSH Honeypot] Listening on port {SSH_PORT}")
    while True:
        try:
            client, addr = sock.accept()
            t = threading.Thread(
                target=_handle, args=(client, addr, host_key), daemon=True
            )
            t.start()
        except Exception:
            pass
