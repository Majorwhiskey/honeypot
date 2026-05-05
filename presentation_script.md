# Cybersecurity Internship Presentation Script
## Pragyan EduSec LLP — Phase 2 Internship Review
### Amogh P Ukkadgatri | USN: 2KE22EC008 | Academic Year 2024–2025

---

## Slide 1 — Introduction

Good morning respected external guide, internal faculty members, and my fellow students.

Today I am here to present my Phase 2 Internship Review on the domain of Cybersecurity. I have completed my internship at Pragyan EduSec LLP, and in this presentation I will be covering the advanced practical work carried out during Phase 2, the key learnings gained, and a live demonstration of the real-world cybersecurity project I built as the culmination of this phase.

Phase 1 established my foundational knowledge — networking, Linux, Active Directory, and introductory ethical hacking. Phase 2 took that foundation and applied it. Everything you see here today was built, tested, and executed by me on real systems.

---

## Slide 2 — Company Profile

Pragyan EduSec LLP is a forward-thinking EdTech and Cybersecurity training organization based in Karnataka, India.

The organization focuses on transforming students into industry-ready professionals through hands-on and practical training approaches. Unlike traditional academic learning, the curriculum here is designed to reflect real-world tools, workflows, and modern threat landscapes — aligned with globally recognized frameworks including the NIST Cybersecurity Framework, MITRE ATT&CK, OWASP, and Cisco's Ethical Hacker Programme.

The organization provides structured internship programs, expert-led workshops, and access to digital lab environments — playing an important role in bridging the gap between theoretical knowledge and practical industry skills.

---

## Slide 3 — Internship Domain

My internship domain was Cybersecurity and Ethical Hacking. Phase 2 specifically advanced into four major practical areas:

**Advanced Ethical Hacking via Cisco NetAcad** — I completed all remaining Cisco Ethical Hacker modules covering threat actor profiling, OSINT reconnaissance, active Nmap scanning, the Metasploit exploitation framework, and the Cyber Kill Chain.

**Web Application Security through OverTheWire Natas** — I worked through the first six Natas levels, which teach exploitation of real OWASP Top 10 vulnerabilities including HTML source leakage, cookie manipulation, directory listing attacks, and HTTP header forgery.

**WiFi Security and Wireless Penetration Testing** — I completed a full WPA2 penetration test on an authorized lab access point using the Airmon-ng suite, capturing the 4-way handshake and cracking a test passphrase in under 3 minutes.

**Real-World Project — Honeypot System** — The flagship deliverable of Phase 2. I designed and built a multi-service honeypot from scratch in Python, featuring SSH and HTTP decoy services, GeoIP enrichment, SQLite logging, and a live cyberpunk threat-intelligence dashboard.

---

## Slide 4 — Work Carried Out — Phase 2

Let me walk through what was accomplished in each area during Phase 2.

**Cisco Ethical Hacker — All 7 Modules Completed.**
I finished all NetAcad modules covering OSINT recon using Google Dorking, WHOIS, Shodan, and theHarvester — active scanning with Nmap including SYN scans, version detection, OS fingerprinting, and vulnerability scripts — the Metasploit Framework architecture — and post-exploitation methodology. This gave me a structured, industry-validated understanding of the full ethical hacking lifecycle.

**Bash Security Scripting.**
I wrote two functional security automation tools: a subnet port scanner using `/dev/tcp` that scans an entire subnet without requiring any external tools, and a real-time brute-force login detector that continuously parses authentication logs using `tail -f` and `grep` to detect repeated failed login attempts. These scripts demonstrated how manual security monitoring can be automated.

**WiFi Security Lab.**
On an authorized lab access point, I completed a full WPA2 penetration test workflow — enabling monitor mode, capturing the 4-way WPA2 handshake by sending deauthentication frames, and cracking a weak test password using the rockyou wordlist in under 3 minutes. I also studied WPS Pixie Dust attacks and Evil Twin attack methodology, along with wireless defense countermeasures.

**OverTheWire Bandit — All 35 Levels Completed.**
I completed the entire Bandit wargame — progressing from basic Linux navigation through SSH private key authentication, encoding and decoding, SUID binary exploitation, cron-based privilege escalation, restricted shell escape using `vi` and the `$0` special variable, and full Git forensics including inspecting deleted credentials in commit history, switching branches, and reading tags.

**OverTheWire Natas — Web Application Security, Levels 0–5.**
I exploited HTML source leakage, JavaScript restriction bypass via DevTools, directory listing vulnerabilities, `robots.txt` disclosure of hidden paths, HTTP Referer header forgery using `curl -H`, and cookie-based authentication bypass — demonstrating that client-side data can never be trusted for authentication. Each level represents a real-world vulnerability class.

---

## Slide 5 — Work to Be Done — Phase 3 & Beyond

With Phase 2 complete, the roadmap for Phase 3 is clear and structured.

**Advanced Natas Levels (6+) and Deep Web Security** — The upcoming Natas levels introduce PHP source code analysis, SQL injection, Local File Inclusion, and command injection — the more severe OWASP Top 10 classes that are responsible for the majority of real-world web breaches.

**TryHackMe and HackTheBox CTF Platforms** — Moving from guided wargames to real machine exploitation. These platforms simulate actual servers with vulnerabilities, requiring full methodology: enumeration, exploitation, privilege escalation, and professional report writing.

**Certification Roadmap — eJPT, CEH, OSCP** — I will pursue the eJPT (eLearnSecurity Junior Penetration Tester) as my first practical offensive certification, followed by CompTIA Security+, CEH, and ultimately OSCP — the gold standard in penetration testing.

**Cloud Security and Digital Forensics** — Exploring cloud security on AWS and Azure, and developing expertise in digital forensics and incident response to build a complete security skill profile.

---

## Slide 6 — Key Learnings

Phase 2 produced five deep, practical learning outcomes — each validated through hands-on execution.

**Real-World Projects Build True Depth.** Building the Honeypot System end-to-end — from raw socket programming to a live, styled web dashboard — taught architecture, debugging under real constraints, and full-stack integration in a way no tutorial or course could replicate.

**Web Applications Expose Surprising Weaknesses.** Even the first five Natas levels showed how HTML source code, cookies, directory listings, `robots.txt`, and HTTP headers routinely expose sensitive data in ways developers consistently overlook. These are not theoretical vulnerabilities — they exist in production systems today.

**WiFi is More Vulnerable Than Expected.** Capturing a WPA2 handshake and cracking it in under 3 minutes on a test network demonstrated exactly why strong passphrases, WPA3 adoption, and disabling WPS are non-negotiable security requirements for any real network.

**Git History is Permanent.** During Bandit Level 32 and beyond, I found credentials that had been "deleted" from a repository but remained fully readable in git commit history. This is a frequently exploited real-world vulnerability that every developer must internalize from day one.

**Scripting Multiplies Effectiveness.** Writing a brute-force log detector and subnet scanner transformed abstract Bash knowledge into genuine security tooling. A security analyst who can automate monitoring can process thousands of events per second — a manual approach simply does not scale.

---

## Slide 7 — Project: Honeypot System

*[Open `http://localhost:5000` in the browser. Open `http://localhost:8888/wp-login.php` in a second tab.]*

The flagship deliverable of Phase 2 is a fully functional, multi-service honeypot built entirely in Python. Let me explain what it does and then demonstrate it live.

A honeypot is a deliberately exposed decoy system. It looks like a real server but its only purpose is to attract attackers, record everything they do, and give defenders intelligence about real attack behaviour — with zero real data at risk.

This system has five core components:

**SSH Honeypot** — listens on port 2222 and impersonates a real OpenSSH server using the paramiko library. When an attacker attempts to log in, we capture the username and password they tried, then reject the connection. The attacker thinks it failed — we have their credential.

**HTTP Honeypot** — listens on port 8888 and serves convincing fake pages: a WordPress login, phpMyAdmin, a generic admin panel, and even a fake `.env` file containing plausible-looking AWS keys and database credentials. Every hit, every form submission, and every credential entered is logged.

**Live Threat Dashboard** — a Flask-powered web interface at `http://localhost:5000` showing everything in real time: attack statistics, a global origin map, hourly timeline, top attacker chart, and a credential intelligence feed showing every username and password attempted across both SSH and HTTP.

**GeoIP Enrichment** — every attacker IP is automatically resolved to country, city, and coordinates using the ip-api.com API, enabling geographic threat visualisation on a live world map.

**SQLite Event Logging** — all events are persisted in a local structured database with full metadata. No external infrastructure required — the entire system runs with `python main.py`.

---

## Slide 8 — Technical Architecture

*[Switch to terminal or code view if presenting to a technical audience]*

The system is built entirely in Python and runs three concurrent daemon threads launched from a single `main.py` entry point.

**Python and Paramiko for SSH** — I used the paramiko library to implement a fully compliant SSH server that handles host-key negotiation and authentication callbacks. When a client connects, paramiko calls my `check_auth_password()` handler which logs the credential and always returns `AUTH_FAILED` — so the attacker gets rejected but we have their attempt captured.

**Flask — Two Separate Instances** — I run two completely independent Flask applications: one for the HTTP honeypot on port 8888 (serving fake login pages and logging form submissions), and one for the dashboard API on port 5000 (exposing REST endpoints for `/api/stats`, `/api/events`, `/api/top-credentials`, and the map data). Both run as daemon threads from `main.py`.

**Real-Time Frontend** — The dashboard frontend is built with Chart.js for the attack timeline and top-IP bar charts, and Leaflet.js for the world map with attack-origin markers. It polls the API every 15 seconds and animates counter updates so changes are immediately visible.

**Credential Capture from HTTP Forms** — When a POST request arrives at a fake login page, the honeypot extracts credentials by checking known field names: `username`, `log`, `pma_username` for usernames and `password`, `pwd`, `pma_password` for passwords. These are stored in the database alongside the IP, timestamp, and GeoIP data, and surfaced in the credential intelligence table on the dashboard.

**Skills demonstrated in this one project:** socket programming, multi-threading, REST API design, GeoIP enrichment, SQLite, full-stack web development, and deception-based security architecture — all applied together.

---

## Slide 9 — Conclusion & Future Plans

Phase 2 of this internship with Pragyan EduSec LLP marks a decisive transition — from building foundational knowledge to executing real-world security work.

**What Phase 2 Delivered:**

I delivered an end-to-end cybersecurity project — the Honeypot System — a production-quality Python tool that captures live attack traffic through SSH and HTTP decoy services, enriches events with GeoIP data, and visualises everything on a real-time threat-intelligence dashboard. This is not a tutorial project. Every line was written, debugged, and tested by me.

I completed the entire OverTheWire Bandit wargame — all 35 levels — and the first six Natas levels covering real web application exploitation. I completed all Cisco Ethical Hacker modules. I performed a successful WPA2 penetration test on an authorized lab network. I wrote functional security automation scripts.

**The Road Ahead:**

The path forward is purposefully structured. I will pursue the eJPT certification as my first formal offensive security credential, followed by CEH and ultimately OSCP. I will continue through Natas and transition to TryHackMe and HackTheBox for independent machine-based practice. I will explore cloud security on AWS and Azure and contribute to open-source security tooling to build a public portfolio.

My goal is to build a strong career in cybersecurity as a penetration tester and security professional. This internship, and specifically the work done in Phase 2, has made that path concrete and achievable.

Thank you. I am happy to answer any questions.

---

## Live Demo Checklist

Before presenting, verify:

- [ ] `python main.py` is running (ports 2222, 5000, 8888 all listening)
- [ ] `http://localhost:5000` loads the dashboard
- [ ] `http://localhost:8888/wp-login.php` loads the WordPress fake login
- [ ] `http://localhost:8888/admin` loads the admin panel
- [ ] `http://localhost:8888/phpmyadmin` loads the phpMyAdmin page

**Demo sequence for Slide 7:**
1. Open dashboard — show stat cards, map, charts
2. Open `http://localhost:8888/wp-login.php` — enter `admin` / `password123` and click Log In
3. Switch to dashboard — show the new event appear in Live Event Feed with `admin:password123`
4. Show Credential Intelligence table — the entry appears with HTTP badge, username, and password
5. Open a terminal — run `ssh -p 2222 root@localhost`, type `toor` as password
6. Back to dashboard — SSH event appears in feed and credential table

---

## Q&A Preparation

**Q: Is this legal to run?**
A: Yes — on a network and system you own or control. I run it locally or on my own VM. Deploying a honeypot on a network you do not own without permission is illegal.

**Q: Won't attackers figure out it's a honeypot?**
A: Automated bots do not — they cycle through credential lists and move on. A skilled human attacker might notice the SSH server never grants a shell, but the goal is to capture the reconnaissance and credential-stuffing phase, which this does completely.

**Q: Why is the HTTP port 8888 and not 80?**
A: Ports below 1024 require administrator privileges on Linux and are often blocked on development machines. Port 8888 is a common high-number HTTP alternative. On a real deployment this would run on port 80 with proper privileges or behind a reverse proxy.

**Q: How is this different from a real server being attacked?**
A: A real server has actual users, sessions, and data at risk. The honeypot has nothing real — every credential is fake, no shell is ever granted, and no sensitive data is ever exposed. It is purely a logging and intelligence-gathering trap.

**Q: Why SQLite and not a proper database?**
A: SQLite is ideal here — zero configuration, no separate process, and the write volume from a single honeypot is well within its performance limits. The entire project runs with just `pip install -r requirements.txt` and `python main.py`.

**Q: Could this be used maliciously?**
A: No — it only serves static HTML pages and logs inbound requests. It has no outbound attack capability. The only deception is making the server look legitimate to attract attackers — which is the definition of a honeypot.
