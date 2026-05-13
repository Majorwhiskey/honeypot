import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useSocket } from "../hooks/useSocket";
import ScrambleText from "../components/ScrambleText";

const ITEMS_PER_PAGE = 20;

const SVC = {
  ssh:    { bg: "#3d1c1c", text: "#ffb4ab" },
  http:   { bg: "#1c1e2d", text: "#c1c6d7" },
  ftp:    { bg: "#1c2d1e", text: "#bfcab1" },
  telnet: { bg: "#2d2510", text: "#ffba38" },
};

function ServiceBadge({ service }) {
  const key = (service || "").toLowerCase();
  const c = SVC[key] || { bg: "#333531", text: "#c5c7be" };
  return (
    <span
      className="text-[10px] px-2 py-0.5 font-bold uppercase"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {service?.toUpperCase() || "N/A"}
    </span>
  );
}

export default function LiveFeedPage() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [service, setService] = useState("");
  const [q, setQ] = useState("");
  const [now, setNow] = useState(new Date());
  const [newCount, setNewCount] = useState(0);

  const fetchEvents = useCallback(async () => {
    const params = new URLSearchParams({
      limit: ITEMS_PER_PAGE,
      offset: (page - 1) * ITEMS_PER_PAGE,
      ...(service && { service }),
      ...(q && { q }),
    });
    const { data } = await api.get(`/api/events?${params}`);
    setEvents(data.events);
    setTotal(data.total);
  }, [page, service, q]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [service, q]);

  const handlers = useMemo(
    () => ({
      new_event: (ev) => {
        setNewCount((n) => n + 1);
        if (page === 1 && !service && !q) {
          setEvents((prev) => [ev, ...prev.slice(0, ITEMS_PER_PAGE - 1)]);
          setTotal((t) => t + 1);
        }
      },
    }),
    [page, service, q]
  );
  useSocket(handlers);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const systemTime = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-[#ffba38] animate-pulse" />
            <ScrambleText
              text="MODULE: FEED-ALPHA-01"
              className="text-[10px] text-[#ffba38] font-bold tracking-[0.2em] uppercase"
            />
          </div>
          <ScrambleText
            text="Live Threat Feed"
            as="h2"
            delay={150}
            className="text-4xl font-bold tracking-tight text-[#e3e3dc] uppercase"
          />
          <p className="text-[#c5c7be] text-sm mt-1">
            TOTAL EVENTS:{" "}
            <span className="text-[#bfcab1] font-bold">{total.toLocaleString()}</span>
            {newCount > 0 && (
              <span className="ml-3 text-[#ffba38] font-bold animate-pulse">
                +{newCount} NEW
              </span>
            )}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-[#c5c7be]/60 font-medium block">SYSTEM TIME</span>
          <span className="text-xl font-bold text-[#e3e3dc] tracking-widest animate-subtle-glitch">
            {systemTime} UTC
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-3 mb-6 items-center flex-wrap">
        {["", "ssh", "http", "ftp", "telnet"].map((s) => (
          <button
            key={s}
            onClick={() => setService(s)}
            className={`px-4 py-2 text-[10px] font-bold tracking-widest uppercase transition-colors ${
              service === s
                ? s === ""
                  ? "bg-[#3c4633] text-[#a8b49b]"
                  : "bg-[#ffba38] text-[#432c00]"
                : "bg-transparent border border-[#454840]/30 text-[#c5c7be] hover:bg-[#383a35]"
            }`}
            type="button"
          >
            {s === "" ? "ALL" : s.toUpperCase()}
          </button>
        ))}
        <div className="flex items-center bg-[#1a1c18] px-3 py-2 border border-[#454840]/30 flex-1 max-w-xs">
          <span className="material-symbols-outlined text-[#a8b49b]/60 text-sm mr-2">search</span>
          <input
            className="bg-transparent border-none text-xs focus:ring-0 focus:outline-none text-[#a8b49b] placeholder-[#a8b49b]/30 w-full font-bold tracking-widest uppercase"
            placeholder="SEARCH IP / COUNTRY / USER..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="text"
          />
          {q && (
            <button
              className="text-[#a8b49b]/40 hover:text-[#ffba38] transition-colors ml-1"
              onClick={() => setQ("")}
              type="button"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-[#1a1c18] border-t border-[#a8b49b]/10 relative overflow-hidden">
        <div className="scan-overlay" />
        <div className="bg-[#292b26]">
          <div className="grid grid-cols-12 px-6 py-4">
            <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-[#c5c7be]">Service</div>
            <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-[#c5c7be]">Source IP</div>
            <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-[#c5c7be]">Country</div>
            <div className="col-span-4 text-[10px] font-bold uppercase tracking-widest text-[#c5c7be]">Details</div>
            <div className="col-span-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#c5c7be]">Timestamp</div>
          </div>
        </div>
        <div className="divide-y divide-[#454840]/10">
          {events.map((ev, idx) => (
            <div
              key={ev.id || idx}
              className="grid grid-cols-12 items-center px-6 py-4 hover:bg-[#383a35] transition-colors"
            >
              <div className="col-span-2">
                <ServiceBadge service={ev.service} />
              </div>
              <div className="col-span-2 font-mono text-xs text-[#ffba38]">{ev.src_ip}</div>
              <div className="col-span-2">
                <span className="text-[10px] bg-[#3c4633] text-[#a8b49b] px-2 py-0.5 font-bold uppercase">
                  {ev.country || "??"}
                </span>
              </div>
              <div className="col-span-4 text-xs text-[#c5c7be] truncate">
                {ev.username ? (
                  <>
                    <span className="text-[#a8b49b] font-bold">{ev.username}</span>
                    {ev.password && (
                      <span className="text-[#454840]"> / {ev.password}</span>
                    )}
                  </>
                ) : (
                  <span className="text-[#454840]">{ev.path || ev.message || "—"}</span>
                )}
              </div>
              <div className="col-span-2 text-right text-xs text-[#c5c7be]">
                {new Date(ev.timestamp).toLocaleString("en-GB", {
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-[#454840]/30">stream</span>
              <p className="text-xs text-[#c5c7be]/40 uppercase font-bold">No events recorded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-[#454840]/10 mt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#c5c7be]/60">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(page * ITEMS_PER_PAGE, total)} of {total.toLocaleString()} total
          </p>
          <div className="flex gap-2">
            <button
              className="border border-[#454840]/20 px-3 py-1 text-[10px] font-bold uppercase text-[#c5c7be] transition-colors hover:bg-[#383a35] disabled:opacity-30"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              type="button"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`px-3 py-1 text-[10px] font-bold transition-all ${
                  p === page
                    ? "bg-[#bfcab1] text-[#2a3322]"
                    : "border border-[#454840]/20 text-[#c5c7be] hover:bg-[#383a35]"
                }`}
                onClick={() => setPage(p)}
                type="button"
              >
                {p}
              </button>
            ))}
            {totalPages > 5 && <span className="px-2 text-[#c5c7be]/40">...</span>}
            <button
              className="border border-[#454840]/20 px-3 py-1 text-[10px] font-bold uppercase text-[#c5c7be] transition-colors hover:bg-[#383a35] disabled:opacity-30"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-16 flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#c5c7be]/30">
        <ScrambleText text="HONEYPOT THREAT MONITOR // SENTINEL-V2.0" delay={800} />
        <ScrambleText text="ALL TRAFFIC LOGGED // ENCRYPTION AES-256 ACTIVE" delay={1000} />
      </div>
    </div>
  );
}
