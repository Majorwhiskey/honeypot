# Presentation Script — Honeypot System

---

## Slide 1 — Introduction (30 sec)

"Good [morning/afternoon]. Today I'm presenting a honeypot system I built in Python.

A honeypot is a deliberately exposed decoy server. It looks like a real system but its only job is to attract attackers, record everything they do, and help us understand the threat landscape — all without any real data at risk."

---

## Slide 2 — Problem Statement (30 sec)

"The internet is constantly being scanned by bots and attackers looking for weak SSH servers, exposed admin panels, and leaked `.env` files. Most of the time this traffic is invisible to defenders.

My project answers the question: *what does real attack traffic look like, and what credentials are attackers actually trying?*"

---

## Slide 3 — System Overview (45 sec)

"The system has three components running in parallel as threads:

1. **SSH Honeypot** on port 2222 — it impersonates a real OpenSSH server. When an attacker tries to log in, we capture the username and password, then reject the connection.

2. **HTTP Honeypot** on port 8080 — it serves convincing fake pages: a WordPress login, phpMyAdmin, an admin panel, and even a fake `.env` file full of plausible-looking credentials. Every hit is logged.

3. **Dashboard** on port 5000 — a real-time web interface showing everything that's happening."

---

## Slide 4 — Technical Stack (30 sec)

"I built this entirely in Python using:

- **Paramiko** — the SSH library that lets me run a fully compliant SSH server
- **Flask** — for both the HTTP honeypot and the dashboard
- **SQLite** — lightweight local database, zero setup required
- **ip-api.com** — free GeoIP API to resolve every attacker IP to a country and city
- **Leaflet.js + Chart.js** — for the map and charts on the dashboard"

---

## Slide 5 — Live Demo (2–3 min)

*[Start `python main.py` in the terminal, open `http://localhost:5000` in the browser]*

"This is the dashboard. You can see:

- The **stat cards** at the top — total attacks, unique IPs, countries, SSH vs HTTP split
- The **global map** — each dot is a real attacker IP, plotted by GeoIP coordinates
- The **timeline chart** — attack volume hour by hour over the last 24 hours
- The **credential feed** — the most commonly tried SSH usernames and passwords. You'll notice `admin/admin`, `root/123456` and similar patterns — these are bots running dictionary attacks

*[Open a terminal and run: `ssh root@localhost -p 2222`]*

Watch — a new event just appeared in the live feed. The SSH honeypot captured my login attempt and logged the credential."

---

## Slide 6 — Key Findings / Insights (30 sec)

"Even running this on a local machine for a short time, the patterns are clear:

- The vast majority of SSH traffic is automated — bots cycling through massive credential lists
- HTTP scanners probe for `/wp-login.php`, `/admin`, and `/.env` within seconds of a server going up
- Attackers come from many different countries, with traffic often routed through VPNs or cloud VMs

This kind of intelligence is exactly what security teams use to build blocklists and tune IDS rules."

---

## Slide 7 — Challenges & What I Learned (30 sec)

"The biggest challenge was getting the SSH server to behave exactly like a real one — paramiko gave me the building blocks but I had to understand the SSH handshake protocol to make the banner and key exchange convincing enough that bots wouldn't just skip past it.

I also learned how GeoIP enrichment works in practice — caching responses so we don't hammer the free API for every single event from the same IP."

---

## Slide 8 — Future Work (20 sec)

"If I were to extend this further:

- Add Telnet and FTP honeypots for a broader attack surface
- Integrate Shodan or AbuseIPDB for reputation scoring of attacker IPs
- Add alerting — email or Slack notification when attack rate spikes
- Deploy it on a public cloud VM to capture real internet traffic"

---

## Slide 9 — Conclusion (20 sec)

"To summarise: I built a multi-service honeypot in Python that passively captures real attack traffic, enriches it with geolocation data, and presents it on a live threat-intelligence dashboard. It demonstrates how deception-based security tools work and gives genuine visibility into how attackers behave on the internet.

Thank you — happy to take any questions."

---

## Q&A Prep

**Q: Is this legal to run?**
A: Yes — on a network you control or own. I run it locally or on my own VM. You cannot deploy a honeypot on someone else's network without permission.

**Q: Won't attackers figure out it's a honeypot?**
A: Bots usually don't — they're automated and just try standard credentials. A skilled human attacker might notice (e.g. the SSH server never grants a shell), but the goal is to capture the reconnaissance and credential-stuffing phase, which this does effectively.

**Q: How is this different from a real server being attacked?**
A: A real server would have actual users and data at risk. The honeypot has nothing real — every credential is fake, no shell is ever granted, and no sensitive data is exposed. It's purely a logging trap.

**Q: Could someone use the HTTP honeypot to attack others?**
A: No — it only serves static HTML pages and logs requests. It has no outbound attack capability.

**Q: Why SQLite and not a proper database?**
A: SQLite is perfect here — single-node, zero config, and the write volume from a honeypot is well within its limits. It also means the entire project runs with just `pip install` and `python main.py`.
