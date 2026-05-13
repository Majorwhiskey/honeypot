import { useEffect, useState } from "react";

const BOOT_LINES = [
  "INITIALIZING THREAT SENSORS...",
  "HONEYPOT SERVICES: ONLINE",
  "DATABASE CONNECTION: ESTABLISHED",
  "SENTINEL NODE: ACTIVE",
];

export default function WelcomeGate({ onUnlock }) {
  const [phase, setPhase] = useState("boot");
  const [bootLine, setBootLine] = useState(0);
  const [callsign, setCallsign] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (phase !== "boot") return;
    const t = setInterval(() => {
      setBootLine((n) => {
        if (n >= BOOT_LINES.length - 1) {
          clearInterval(t);
          setTimeout(() => setPhase("input"), 300);
          return n;
        }
        return n + 1;
      });
    }, 380);
    return () => clearInterval(t);
  }, [phase]);

  const submit = (e) => {
    e.preventDefault();
    const name = callsign.trim() || "OPERATOR";
    setPhase("loading");
    setTimeout(() => {
      setMessage(`SENTINEL ACTIVE. Monitoring initiated for operator: ${name}.`);
      setPhase("granted");
      setTimeout(() => onUnlock(), 2200);
    }, 1100);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0b0c09]/90 backdrop-blur-md flex items-center justify-center px-4">
      <div className="w-full max-w-xl border border-[#454840]/40 bg-[#1a1c18]/95 p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[#454840]/25">
          <span className="material-symbols-outlined text-[#ffb4ab] text-4xl">bug_report</span>
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-bold tracking-tighter text-[#a8b49b] uppercase">HONEYPOT</span>
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#ffba38]">
              Threat Monitor
            </span>
          </div>
        </div>

        {/* Boot sequence */}
        {phase === "boot" && (
          <div className="space-y-2 min-h-[110px]">
            {BOOT_LINES.slice(0, bootLine + 1).map((line, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[#3c4633] font-mono text-xs">{">"}</span>
                <span
                  className={`font-mono text-xs uppercase tracking-widest ${
                    i === bootLine ? "text-[#ffba38]" : "text-[#a8b49b]/60"
                  }`}
                >
                  {line}
                </span>
                {i === bootLine && (
                  <span className="inline-block w-2 h-3 bg-[#ffba38] animate-pulse ml-1" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Operator input */}
        {phase === "input" && (
          <>
            <h1 className="text-3xl font-black text-[#ffba38] uppercase tracking-tight">ACCESS TERMINAL</h1>
            <p className="mt-3 text-sm text-[#c5c7be] uppercase tracking-wide">
              Enter your operator callsign to begin monitoring
            </p>
            <form className="mt-6 flex gap-3" onSubmit={submit}>
              <input
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                placeholder="OPERATOR CALLSIGN"
                className="flex-1 bg-[#121410] border border-[#454840]/40 px-3 py-2 text-[#e3e3dc] uppercase text-sm outline-none focus:border-[#ffba38]"
                autoFocus
              />
              <button
                type="submit"
                className="px-5 py-2 bg-[#ffba38] text-[#432c00] text-xs font-black tracking-widest uppercase"
              >
                ENTER
              </button>
            </form>
          </>
        )}

        {/* Loading / Granted */}
        {(phase === "loading" || phase === "granted") && (
          <div className="min-h-[110px] flex flex-col justify-center">
            {phase === "loading" && (
              <div className="flex items-center gap-3 text-[#c5c7be]">
                <div className="h-6 w-6 border-2 border-[#ffba38]/30 border-t-[#ffba38] rounded-full animate-spin" />
                <span className="text-sm uppercase tracking-wide font-mono">Establishing secure channel...</span>
              </div>
            )}
            {phase === "granted" && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[#bfcab1]">check_circle</span>
                  <span className="text-[#bfcab1] text-sm font-bold uppercase tracking-widest">ACCESS GRANTED</span>
                </div>
                <p className="text-[#e3e3dc] text-base leading-relaxed">{message}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
