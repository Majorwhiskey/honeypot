import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useSocket } from "../hooks/useSocket";
import ScrambleText from "../components/ScrambleText";

function ServiceBar({ label, count, maxCount, color }) {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[9px] font-bold text-[#c5c7be] uppercase tracking-widest">{label}</span>
        <span className="text-[10px] font-bold tracking-tighter" style={{ color }}>
          {count.toLocaleString()}
        </span>
      </div>
      <div className="w-full bg-[#333531] h-2">
        <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function TimelineChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const W = 600;
  const H = 72;
  if (data.length === 0) {
    return (
      <div className="h-20 flex items-center justify-center text-[10px] text-[#c5c7be]/30 uppercase font-bold tracking-widest">
        Awaiting attack data...
      </div>
    );
  }
  const bw = Math.max(1, Math.floor(W / data.length) - 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
      {data.map((d, i) => {
        const bh = Math.max(1, Math.round((d.count / max) * (H - 4)));
        const x = i * (W / data.length);
        const opacity = 0.35 + (d.count / max) * 0.65;
        return (
          <rect key={i} x={x} y={H - bh} width={bw} height={bh} fill="#ffba38" opacity={opacity} />
        );
      })}
    </svg>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [topIPs, setTopIPs] = useState([]);
  const [countries, setCountries] = useState([]);
  const [now, setNow] = useState(new Date());
  const [pulse, setPulse] = useState(false);

  const fetchAll = async () => {
    const [s, t, ips, c] = await Promise.all([
      api.get("/api/stats"),
      api.get("/api/timeline"),
      api.get("/api/top-ips"),
      api.get("/api/countries"),
    ]);
    setStats(s.data);
    setTimeline(t.data);
    setTopIPs(ips.data);
    setCountries(c.data);
  };

  useEffect(() => {
    fetchAll();
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handlers = useMemo(
    () => ({
      new_event: () => {
        fetchAll();
        setPulse(true);
        setTimeout(() => setPulse(false), 800);
      },
    }),
    []
  );
  useSocket(handlers);

  const systemTime = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const maxSvc = Math.max(
    stats?.ssh_count ?? 0,
    stats?.http_count ?? 0,
    stats?.ftp_count ?? 0,
    stats?.telnet_count ?? 0,
    1
  );
  const maxCountry = Math.max(...countries.map((c) => c.count), 1);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end mb-8 border-b border-[#454840]/20 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 ${pulse ? "bg-[#ffb4ab]" : "bg-[#ffba38]"} transition-colors`} />
            <ScrambleText
              text="MODULE: THREAT-INTEL-001"
              className="text-[10px] text-[#ffba38] font-bold tracking-[0.2em] uppercase"
            />
          </div>
          <ScrambleText
            text="Attack Telemetry"
            as="h2"
            delay={150}
            className="text-4xl font-bold tracking-tight text-[#e3e3dc] uppercase"
          />
          <p className="text-[#c5c7be] text-sm mt-1">
            Real-time honeypot intrusion monitoring and threat analysis.
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-[#c5c7be]/60 font-medium block">SYSTEM TIME</span>
          <span
            className={`text-xl font-bold tracking-widest animate-subtle-glitch transition-colors ${
              pulse ? "text-[#ffb4ab]" : "text-[#e3e3dc]"
            }`}
          >
            {systemTime} UTC
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-12 gap-5 mb-8">
        <div className="col-span-12 lg:col-span-3 bg-[#1a1c18] p-5 border-t-2 border-[#ffb4ab]/40">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[#ffb4ab] text-sm">bolt</span>
            <ScrambleText
              text="Total Events"
              delay={200}
              className="text-[10px] font-bold tracking-widest uppercase text-[#c5c7be]"
            />
          </div>
          <span className="text-5xl font-black text-[#ffb4ab] block">
            {stats?.total_events?.toLocaleString() ?? "—"}
          </span>
          <p className="mt-2 text-xs text-[#c5c7be]/60 uppercase">Attack attempts logged</p>
        </div>

        <div className="col-span-12 lg:col-span-3 bg-[#1a1c18] p-5 border-t-2 border-[#ffba38]/40">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[#ffba38] text-sm">devices</span>
            <ScrambleText
              text="Unique IPs"
              delay={300}
              className="text-[10px] font-bold tracking-widest uppercase text-[#c5c7be]"
            />
          </div>
          <span className="text-5xl font-black text-[#ffba38] block">
            {stats?.unique_ips?.toLocaleString() ?? "—"}
          </span>
          <p className="mt-2 text-xs text-[#c5c7be]/60 uppercase">Distinct threat sources</p>
        </div>

        <div className="col-span-12 lg:col-span-3 bg-[#1a1c18] p-5 border-t-2 border-[#bfcab1]/40">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[#bfcab1] text-sm">language</span>
            <ScrambleText
              text="Countries"
              delay={400}
              className="text-[10px] font-bold tracking-widest uppercase text-[#c5c7be]"
            />
          </div>
          <span className="text-5xl font-black text-[#bfcab1] block">
            {stats?.countries?.toLocaleString() ?? "—"}
          </span>
          <p className="mt-2 text-xs text-[#c5c7be]/60 uppercase">Nations of origin</p>
        </div>

        <div className="col-span-12 lg:col-span-3 bg-[#1a1c18] p-5 border-t-2 border-[#c1c6d7]/40">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[#c1c6d7] text-sm">key</span>
            <ScrambleText
              text="Credentials"
              delay={500}
              className="text-[10px] font-bold tracking-widest uppercase text-[#c5c7be]"
            />
          </div>
          <span className="text-5xl font-black text-[#c1c6d7] block">
            {stats?.cred_count?.toLocaleString() ?? "—"}
          </span>
          <p className="mt-2 text-xs text-[#c5c7be]/60 uppercase">Login attempts captured</p>
        </div>
      </div>

      {/* Timeline + Service Breakdown */}
      <div className="grid grid-cols-12 gap-5 mb-8">
        {/* 24h Timeline */}
        <div className="col-span-12 lg:col-span-8 bg-[#1a1c18] p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[#ffba38] text-sm">timeline</span>
            <ScrambleText
              text="Attack Volume — Last 24 Hours"
              delay={300}
              className="text-[10px] font-bold tracking-widest uppercase text-[#c5c7be]"
            />
          </div>
          <TimelineChart data={timeline} />
          <div className="flex justify-between mt-2">
            <span className="text-[9px] text-[#c5c7be]/30 font-bold uppercase">−24 HRS</span>
            <span className="text-[9px] text-[#c5c7be]/30 font-bold uppercase">NOW</span>
          </div>
        </div>

        {/* Service Breakdown */}
        <div className="col-span-12 lg:col-span-4 bg-[#292b26] p-6 border-l-2 border-[#ffba38]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <ScrambleText
                text="Protocol Analysis"
                delay={400}
                className="text-[10px] text-[#ffba38] font-bold tracking-widest uppercase block"
              />
              <ScrambleText
                text="By Service"
                as="h3"
                delay={500}
                className="text-lg font-black text-[#e3e3dc] uppercase tracking-tight"
              />
            </div>
            <span className="material-symbols-outlined text-[#ffba38] animate-pulse">sensors</span>
          </div>
          <div className="space-y-4">
            <ServiceBar label="SSH"    count={stats?.ssh_count    ?? 0} maxCount={maxSvc} color="#ffb4ab" />
            <ServiceBar label="HTTP"   count={stats?.http_count   ?? 0} maxCount={maxSvc} color="#c1c6d7" />
            <ServiceBar label="FTP"    count={stats?.ftp_count    ?? 0} maxCount={maxSvc} color="#bfcab1" />
            <ServiceBar label="Telnet" count={stats?.telnet_count ?? 0} maxCount={maxSvc} color="#ffba38" />
          </div>
        </div>
      </div>

      {/* Top IPs + Countries */}
      <div className="grid grid-cols-12 gap-5">
        {/* Top IPs Table */}
        <div className="col-span-12 lg:col-span-7 bg-[#1a1c18] border-t border-[#a8b49b]/10 relative overflow-hidden">
          <div className="scan-overlay" />
          <div className="bg-[#292b26] px-6 py-4">
            <ScrambleText
              text="Top Threat Actors by Volume"
              delay={300}
              className="text-[10px] font-bold tracking-widest uppercase text-[#c5c7be]"
            />
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#454840]/20">
                  <th className="py-3 px-4 text-[10px] font-bold text-[#c5c7be] uppercase tracking-widest">Rank</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-[#c5c7be] uppercase tracking-widest">Source IP</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-[#c5c7be] uppercase tracking-widest">Country</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-[#c5c7be] uppercase tracking-widest text-right">Events</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#454840]/10">
                {topIPs.map((ip, idx) => (
                  <tr key={ip.src_ip} className="hover:bg-[#383a35] transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-[#454840]">
                      #{String(idx + 1).padStart(2, "0")}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[#ffba38]">{ip.src_ip}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] bg-[#3c4633] text-[#a8b49b] px-2 py-0.5 font-bold uppercase">
                        {ip.country || "Unknown"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-[#e3e3dc]">
                      {ip.count.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {topIPs.length === 0 && (
                  <tr>
                    <td className="px-6 py-12 text-center text-xs text-[#c5c7be]/30 uppercase font-bold" colSpan={4}>
                      No events recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Countries Histogram */}
        <div className="col-span-12 lg:col-span-5 bg-[#1e201c] p-6">
          <ScrambleText
            text="Attack Origins by Country"
            as="p"
            delay={600}
            className="text-[10px] font-bold text-[#c5c7be] uppercase tracking-widest mb-6"
          />
          <div className="space-y-3">
            {countries.slice(0, 8).map((c, i) => {
              const pct = Math.round((c.count / maxCountry) * 100);
              const colors = ["#ffba38", "#ffb4ab", "#bfcab1", "#c1c6d7", "#a8b49b", "#bfcab1", "#c5c7be", "#8f9289"];
              const col = colors[i % colors.length];
              return (
                <div key={c.country || i}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-bold text-[#c5c7be] uppercase tracking-widest truncate max-w-[70%]">
                      {c.country || "Unknown"}
                    </span>
                    <span className="text-[10px] font-bold tracking-tighter" style={{ color: col }}>
                      {c.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-[#333531] h-2">
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: col }}
                    />
                  </div>
                </div>
              );
            })}
            {countries.length === 0 && (
              <p className="text-xs text-[#c5c7be]/30 uppercase font-bold text-center py-8">
                No country data yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer Meta */}
      <div className="mt-16 flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#c5c7be]/30">
        <ScrambleText text="HONEYPOT THREAT MONITOR // SENTINEL-V2.0" delay={800} />
        <ScrambleText text="ALL TRAFFIC LOGGED // ENCRYPTION AES-256 ACTIVE" delay={1000} />
      </div>
    </div>
  );
}
