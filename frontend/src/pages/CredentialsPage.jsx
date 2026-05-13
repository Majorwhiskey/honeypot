import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useSocket } from "../hooks/useSocket";
import ScrambleText from "../components/ScrambleText";

const SVC_COLOR = {
  ssh:    "#ffb4ab",
  http:   "#c1c6d7",
  ftp:    "#bfcab1",
  telnet: "#ffba38",
};

export default function CredentialsPage() {
  const [creds, setCreds] = useState([]);
  const [now, setNow] = useState(new Date());
  const [downloading, setDownloading] = useState(false);

  const fetchCreds = async () => {
    const { data } = await api.get("/api/top-credentials");
    setCreds(data);
  };

  useEffect(() => {
    fetchCreds();
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handlers = useMemo(() => ({ new_event: fetchCreds }), []);
  useSocket(handlers);

  const maxCount = Math.max(...creds.map((c) => c.count), 1);
  const systemTime = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const svcTotals = creds.reduce((acc, c) => {
    const s = (c.service || "unknown").toLowerCase();
    acc[s] = (acc[s] || 0) + c.count;
    return acc;
  }, {});

  const downloadExport = async () => {
    setDownloading(true);
    try {
      const res = await api.get("/api/export?format=csv", { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "honeypot_export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Telemetry Header */}
      <div className="flex justify-between items-end mb-8 border-b border-[#454840]/20 pb-4">
        <div>
          <ScrambleText
            text="MODULE ID: CRED-INTEL-007"
            className="text-xs text-[#ffba38] uppercase tracking-widest font-bold"
          />
          <ScrambleText
            text="Captured Credentials"
            as="h1"
            delay={150}
            className="text-4xl font-extrabold tracking-tighter text-[#e3e3dc] mt-1 uppercase"
          />
          <p className="text-[#c5c7be] text-sm mt-1">
            Top {creds.length} credential pairs captured across all honeypot services.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-[#c5c7be] uppercase tracking-widest">
            SYSTEM TIME: {systemTime} UTC
          </span>
          <div className="w-48 h-1 bg-[#333531] mt-2 relative overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 transition-all duration-1000 ${
                downloading ? "animate-shimmer w-full" : "bg-[#bfcab1] w-4/5"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        <div className="bg-[#1a1c18] p-4 flex flex-col items-center justify-center border-t-2 border-[#ffb4ab]/30">
          <span className="text-[10px] font-bold uppercase text-[#c5c7be]/40 mb-1">Unique Pairs</span>
          <span className="text-2xl font-black text-[#ffb4ab]">{creds.length}</span>
        </div>
        <div className="bg-[#1a1c18] p-4 flex flex-col items-center justify-center border-t-2 border-[#ffba38]/30">
          <span className="text-[10px] font-bold uppercase text-[#c5c7be]/40 mb-1">Most Attempted</span>
          <span className="text-lg font-black text-[#ffba38] truncate max-w-full px-2 text-center">
            {creds[0]?.username || "—"}
          </span>
        </div>
        <div className="bg-[#1a1c18] p-4 flex flex-col items-center justify-center border-t-2 border-[#bfcab1]/30">
          <span className="text-[10px] font-bold uppercase text-[#c5c7be]/40 mb-1">Top Count</span>
          <span className="text-2xl font-black text-[#bfcab1]">
            {creds[0]?.count?.toLocaleString() || "—"}
          </span>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Credentials Table — 2/3 width */}
        <div className="lg:col-span-2 bg-[#1a1c18] p-6 border-l-4 border-[#ffba38] relative overflow-hidden">
          <div className="scan-overlay" />
          <div className="absolute top-0 right-0 p-4 opacity-[0.04]">
            <span className="material-symbols-outlined text-[8rem]">key</span>
          </div>

          <div className="flex items-center justify-between mb-6 relative z-10">
            <h3 className="text-[1.25rem] font-black uppercase tracking-widest text-[#e3e3dc]">
              Top Credential Pairs
            </h3>
            <button
              onClick={downloadExport}
              disabled={downloading}
              className="px-4 py-2 bg-[#3c4633] text-[#a8b49b] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#454840] transition-colors disabled:opacity-50"
              type="button"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              {downloading ? "EXPORTING..." : "EXPORT CSV"}
            </button>
          </div>

          <div className="overflow-x-auto custom-scrollbar relative z-10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#292b26]">
                  <th className="py-3 px-4 text-[10px] font-bold text-[#c5c7be] uppercase tracking-widest">#</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-[#c5c7be] uppercase tracking-widest">Service</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-[#c5c7be] uppercase tracking-widest">Username</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-[#c5c7be] uppercase tracking-widest">Password</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-[#c5c7be] uppercase tracking-widest text-right">
                    Attempts
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#454840]/10">
                {creds.map((cred, idx) => {
                  const col = SVC_COLOR[(cred.service || "").toLowerCase()] || "#c5c7be";
                  const pct = Math.round((cred.count / maxCount) * 100);
                  return (
                    <tr key={idx} className="hover:bg-[#383a35] transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-[#454840]">
                        #{String(idx + 1).padStart(2, "0")}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="text-[10px] font-bold uppercase px-2 py-0.5"
                          style={{ color: col, backgroundColor: `${col}18` }}
                        >
                          {cred.service?.toUpperCase() || "N/A"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-sm text-[#a8b49b] font-bold">
                        {cred.username || "—"}
                      </td>
                      <td className="py-3 px-4 font-mono text-sm text-[#c5c7be]">
                        {cred.password || "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <div className="w-16 bg-[#333531] h-1">
                            <div className="h-full bg-[#ffba38]" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm font-black text-[#e3e3dc]">
                            {cred.count.toLocaleString()}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {creds.length === 0 && (
                  <tr>
                    <td
                      className="px-6 py-16 text-center text-sm text-[#c5c7be]/30 uppercase font-bold"
                      colSpan={5}
                    >
                      No credentials captured yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Panel */}
        <div className="space-y-6">
          <div className="bg-[#292b26] p-6 border border-[#454840]/10">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-[#ffba38]">info</span>
              <span className="font-bold uppercase text-xs tracking-widest">Attempts by Service</span>
            </div>
            <div className="space-y-4">
              {Object.entries(svcTotals).map(([svc, cnt]) => (
                <div
                  key={svc}
                  className="flex justify-between items-center border-b border-[#454840]/10 pb-2"
                >
                  <span className="text-[0.6875rem] text-[#c5c7be] uppercase">{svc}</span>
                  <span className="font-black text-[#e3e3dc]">{cnt.toLocaleString()}</span>
                </div>
              ))}
              {Object.keys(svcTotals).length === 0 && (
                <p className="text-xs text-[#c5c7be]/30 uppercase">No data yet</p>
              )}
            </div>
          </div>
          <div className="bg-[#ffba38]/5 p-6 border border-[#ffba38]/20">
            <p className="text-[0.6rem] text-[#ffba38] uppercase font-bold leading-relaxed">
              <span className="material-symbols-outlined align-middle mr-2 text-sm">warning</span>
              All credential data is collected from live honeypot services. This data reflects real attack attempts. Handle with care.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#c5c7be]/30">
        <ScrambleText text="HONEYPOT THREAT MONITOR // SENTINEL-V2.0" delay={800} />
        <ScrambleText text="AUTHORIZED USE ONLY // ENCRYPTION AES-256 ACTIVE" delay={1000} />
      </div>
    </div>
  );
}
