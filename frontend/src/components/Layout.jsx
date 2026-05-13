import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSocket } from "../hooks/useSocket";
import ScrambleText from "./ScrambleText";

const mainNav = [
  { to: "/dashboard", label: "Dashboard", icon: "monitoring" },
  { to: "/feed", label: "Live Feed", icon: "stream" },
  { to: "/credentials", label: "Credentials", icon: "key" },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [eventCount, setEventCount] = useState(0);
  const [lastEventTime, setLastEventTime] = useState(null);

  const handlers = useMemo(
    () => ({
      new_event: () => {
        setEventCount((n) => n + 1);
        setLastEventTime(new Date());
      },
    }),
    []
  );
  useSocket(handlers);

  const timeSince = lastEventTime
    ? `${Math.round((Date.now() - lastEventTime) / 1000)}s ago`
    : "Waiting...";

  return (
    <div className="min-h-screen bg-[#121410] text-[#e3e3dc] font-['Manrope'] overflow-hidden">
      {/* Micro-Grid Overlay */}
      <div className="fixed inset-0 micro-grid pointer-events-none z-0" />

      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-[#121410] border-b border-[#454840]/15">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#ffb4ab] text-3xl">bug_report</span>
          <div className="flex flex-col leading-tight">
            <ScrambleText text="HONEYPOT" className="text-lg font-bold tracking-tighter text-[#a8b49b] uppercase" />
            <ScrambleText text="Threat Monitor" delay={300} className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#ffba38]" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          {/* Live event counter badge */}
          {eventCount > 0 && (
            <div className="hidden md:flex items-center gap-2 bg-[#3d1c1c]/60 border border-[#ffb4ab]/20 px-3 py-1">
              <div className="w-1.5 h-1.5 bg-[#ffb4ab] rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-[#ffb4ab] tracking-widest uppercase">
                {eventCount} Events
              </span>
            </div>
          )}
          {/* Clearance badge */}
          <div className="flex items-center gap-2 bg-[#3c4633] px-3 py-1.5">
            <span className="material-symbols-outlined text-[#a8b49b] text-lg">shield</span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-[#a8b49b]">SENTINEL</span>
          </div>
        </div>
      </header>

      {/* SideNavBar */}
      <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 flex flex-col justify-between bg-[#1a1c18] border-r border-[#454840]/15 z-40">
        <div className="flex flex-col">
          {/* Sentinel Status */}
          <div className="p-6 border-b border-[#454840]/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#3d1c1c] flex items-center justify-center animate-status-pulse">
                <span className="material-symbols-outlined text-[#ffb4ab]">radar</span>
              </div>
              <div>
                <p className="text-[10px] font-black text-[#a8b49b] uppercase tracking-tighter">
                  SENTINEL NODE
                </p>
                <ScrambleText
                  text="STATUS: MONITORING"
                  as="p"
                  delay={500}
                  className="text-[9px] font-bold text-[#ffba38] tracking-widest animate-status-pulse"
                />
              </div>
            </div>
            <div className="text-[9px] text-[#c5c7be]/40 uppercase font-bold tracking-widest">
              Last Event:{" "}
              <span className="text-[#ffb4ab]">{lastEventTime ? timeSince : "—"}</span>
            </div>
          </div>

          {/* Main Nav */}
          <nav className="mt-4">
            {mainNav.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center px-4 py-3 transition-all duration-200 ease-in-out group ${
                    active
                      ? "bg-[#3c4633] text-[#a8b49b] border-l-4 border-[#ffba38]"
                      : "text-[#a8b49b]/40 hover:bg-[#292b26] hover:text-[#a8b49b]"
                  }`}
                >
                  <span className="material-symbols-outlined mr-3 text-sm">{item.icon}</span>
                  <ScrambleText
                    text={item.label}
                    trigger="hover"
                    className="text-xs font-bold tracking-widest uppercase"
                  />
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom — system label */}
        <div className="p-6 border-t border-[#454840]/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1e201c] flex items-center justify-center border border-[#454840]/20">
              <span className="material-symbols-outlined text-[1rem] text-[#a8b49b]">security</span>
            </div>
            <div>
              <div className="text-[0.6rem] font-bold text-[#c5c7be] uppercase tracking-tighter">SECURE NODE</div>
              <div className="text-[0.5rem] font-medium text-[#ffba38]">LVL 4 CLEARANCE</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Background ghost text */}
      <div className="fixed bottom-12 right-12 pointer-events-none opacity-[0.04] z-0 select-none">
        <div className="text-[8rem] font-black text-[#454840] tracking-tighter leading-none">
          HONEYPOT
        </div>
      </div>

      {/* Main content */}
      <main className="ml-64 mt-16 min-h-screen bg-[#121410] relative">
        {children}
      </main>
    </div>
  );
}
