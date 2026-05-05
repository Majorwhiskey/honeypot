import logging
from flask import Flask, request
from honeypot.config import HTTP_PORT, HTTP_SERVER_HEADER
from honeypot.logger import log_event

logging.getLogger("werkzeug").setLevel(logging.ERROR)

app = Flask(__name__)

# ---------------------------------------------------------------------------
# Fake pages
# ---------------------------------------------------------------------------

_WP_LOGIN = """<!DOCTYPE html>
<html lang="en-US">
<head><meta charset="UTF-8"><title>Log In &lsaquo; My Site &mdash; WordPress</title>
<style>
html{background:#f0f0f1}body{background:#f0f0f1;color:#3c434a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;line-height:1.4;margin:0}
.login{width:320px;margin:0 auto;padding:8% 0 0}.login h1{text-align:center;font-size:22px;color:#1d2327;padding-bottom:12px}
.login form{margin-top:20px;padding:26px;background:#fff;border:1px solid #c3c4c7;border-radius:4px}
.login label{display:block;margin-bottom:5px;font-weight:600}.field{margin-bottom:20px}
.login input[type=text],.login input[type=password]{width:100%;padding:10px;border:1px solid #8c8f94;border-radius:4px;font-size:14px;box-sizing:border-box}
.btn{background:#2271b1;color:#fff;padding:0 16px;height:37px;font-size:14px;border:none;border-radius:3px;cursor:pointer;width:100%}
.btn:hover{background:#135e96}.nav{text-align:center;margin-top:16px;font-size:13px}
.nav a{color:#2271b1;text-decoration:none}
</style></head>
<body><div class="login">
<h1>My WordPress Site</h1>
<form method="post" action="/wp-login.php">
<div class="field"><label for="user_login">Username or Email Address</label>
<input type="text" name="log" id="user_login" autocomplete="username" size="20" required></div>
<div class="field"><label for="user_pass">Password</label>
<input type="password" name="pwd" id="user_pass" autocomplete="current-password" size="20" required></div>
<p><input type="submit" name="wp-submit" class="btn" value="Log In"></p>
</form>
<p class="nav"><a href="/wp-login.php?action=lostpassword">Lost your password?</a></p>
</div></body></html>"""

_PMA_LOGIN = """<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>phpMyAdmin</title>
<style>
body{font-family:sans-serif;background:#f4f4f4;margin:0;padding:0}
#page_content{width:360px;margin:80px auto;background:#fff;border:1px solid #ccc;border-radius:4px;padding:30px}
h1{font-size:18px;color:#333;margin-bottom:20px;text-align:center}
label{display:block;margin-bottom:4px;font-size:13px;color:#555;font-weight:bold}
input[type=text],input[type=password]{width:100%;padding:8px;margin-bottom:16px;border:1px solid #ccc;border-radius:3px;box-sizing:border-box;font-size:14px}
input[type=submit]{background:#d33;color:#fff;border:none;padding:8px 20px;border-radius:3px;cursor:pointer;font-size:14px;width:100%}
input[type=submit]:hover{background:#b00}.server{font-size:11px;color:#888;text-align:center;margin-top:12px}
</style></head>
<body><div id="page_content">
<h1>phpMyAdmin</h1>
<form method="post" action="/phpmyadmin/index.php">
<label>Username:</label><input type="text" name="pma_username" autocomplete="username">
<label>Password:</label><input type="password" name="pma_password" autocomplete="current-password">
<input type="submit" value="Go">
</form>
<p class="server">Server: 127.0.0.1 &nbsp;|&nbsp; MySQL 8.0.32</p>
</div></body></html>"""

_ADMIN_LOGIN = """<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Admin Login</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{background:#1a1a2e;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh}
.box{background:#16213e;border:1px solid #0f3460;border-radius:8px;padding:40px;width:340px}
h2{color:#e94560;text-align:center;margin-bottom:24px;letter-spacing:2px;font-size:18px}
label{color:#a0aec0;font-size:13px;display:block;margin-bottom:6px}
input[type=text],input[type=password]{width:100%;padding:10px;background:#0f3460;border:1px solid #e94560;border-radius:4px;color:#fff;font-size:14px;margin-bottom:18px}
button{width:100%;padding:10px;background:#e94560;color:#fff;border:none;border-radius:4px;font-size:15px;cursor:pointer;letter-spacing:1px}
button:hover{background:#c0392b}
</style></head>
<body><div class="box">
<h2>ADMIN PANEL</h2>
<form method="post" action="/admin/login">
<label>Username</label><input type="text" name="username" autocomplete="username" placeholder="admin">
<label>Password</label><input type="password" name="password" autocomplete="current-password" placeholder="••••••••">
<button type="submit">LOGIN</button>
</form>
</div></body></html>"""

_APACHE_DEFAULT = """<!DOCTYPE html>
<html><head><title>Apache2 Ubuntu Default Page: It works</title>
<style>
body{background:#fff;color:#333;font-family:Ubuntu,sans-serif;padding:40px}
h1{color:#333;font-size:28px}hr{border:1px solid #ddd}p{font-size:14px;line-height:1.6;color:#555}
</style></head>
<body>
<h1>Apache2 Ubuntu Default Page</h1><hr>
<p>This is the default welcome page used to test the correct operation of the Apache2 server after installation on Ubuntu systems.</p>
<p>If you can read this page, it means that the Apache HTTP server installed at this site is working properly. You should <b>replace this file</b> (located at <code>/var/www/html/index.html</code>) before continuing to operate your HTTP server.</p>
<hr><address>Apache/2.4.41 (Ubuntu) Server at localhost Port 80</address>
</body></html>"""

_FAKE_ENV = b"""APP_NAME=MyApplication
APP_ENV=production
APP_KEY=base64:fakekey1234567890abcdefghijklmnopqrstuvwxyz==
APP_DEBUG=false
APP_URL=http://myapp.local

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=myapp_production
DB_USERNAME=myapp_user
DB_PASSWORD=Str0ngP@ssw0rd2024!

CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USERNAME=postmaster@myapp.local
MAIL_PASSWORD=mg_api_key_fake

AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=myapp-storage
"""

# ---------------------------------------------------------------------------
# Request logging helper
# ---------------------------------------------------------------------------

_USERNAME_FIELDS = ("username", "user", "log", "email", "uname", "login", "pma_username", "usr")
_PASSWORD_FIELDS = ("password", "pass", "pwd", "passwd", "secret", "pma_password", "psw")


def _extract(fields):
    for f in fields:
        v = request.form.get(f) or request.args.get(f)
        if v:
            return v
    return None


def _log():
    payload = None
    if request.method == "POST":
        payload = request.get_data(as_text=True)[:1000]
    log_event(
        "http",
        request.remote_addr,
        request.environ.get("REMOTE_PORT", 0),
        method=request.method,
        path=request.path,
        user_agent=request.headers.get("User-Agent"),
        username=_extract(_USERNAME_FIELDS),
        password=_extract(_PASSWORD_FIELDS),
        payload=payload,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.after_request
def _server_header(response):
    response.headers["Server"] = HTTP_SERVER_HEADER
    response.headers["X-Powered-By"] = "PHP/8.1.12"
    return response


@app.route("/wp-login.php", methods=["GET", "POST"])
@app.route("/wp-admin", methods=["GET", "POST"])
@app.route("/wp-admin/", methods=["GET", "POST"])
def wp_login():
    _log()
    return _WP_LOGIN, 200, {"Content-Type": "text/html"}


@app.route("/phpmyadmin", methods=["GET", "POST"])
@app.route("/phpmyadmin/", methods=["GET", "POST"])
@app.route("/pma", methods=["GET", "POST"])
@app.route("/pma/", methods=["GET", "POST"])
def phpmyadmin():
    _log()
    return _PMA_LOGIN, 200, {"Content-Type": "text/html"}


@app.route("/admin", methods=["GET", "POST"])
@app.route("/admin/", methods=["GET", "POST"])
@app.route("/admin/login", methods=["GET", "POST"])
@app.route("/administrator", methods=["GET", "POST"])
@app.route("/login", methods=["GET", "POST"])
def admin():
    _log()
    return _ADMIN_LOGIN, 200, {"Content-Type": "text/html"}


@app.route("/.env")
@app.route("/.env.backup")
@app.route("/.env.local")
def env_file():
    _log()
    return _FAKE_ENV, 200, {"Content-Type": "text/plain"}


@app.route("/", defaults={"path": ""}, methods=["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH"])
@app.route("/<path:path>", methods=["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH"])
def catch_all(path):
    _log()
    return _APACHE_DEFAULT, 200, {"Content-Type": "text/html"}


def start_http_honeypot():
    print(f"[HTTP Honeypot] Listening on port {HTTP_PORT}")
    app.run(host="0.0.0.0", port=HTTP_PORT, debug=False, use_reloader=False, threaded=True)
