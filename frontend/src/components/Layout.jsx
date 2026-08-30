import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  SquaresFour,
  ChatCircleDots,
  Scan,
  FileText,
  ClipboardText,
  Graph,
  ChartBar,
  Gear,
  Heartbeat,
  List,
  X,
} from "@phosphor-icons/react";

const NAV = [
  { to: "/", label: "Dashboard", icon: SquaresFour, testid: "nav-dashboard", end: true },
  { to: "/assistant", label: "AI Assistant", icon: ChatCircleDots, testid: "nav-assistant" },
  { to: "/imaging", label: "Medical Imaging", icon: Scan, testid: "nav-imaging" },
  { to: "/documents", label: "Documents", icon: FileText, testid: "nav-documents" },
  { to: "/review", label: "Clinician Review", icon: ClipboardText, testid: "nav-review" },
  { to: "/workflow", label: "Agent Workflow", icon: Graph, testid: "nav-workflow" },
  { to: "/analytics", label: "Analytics", icon: ChartBar, testid: "nav-analytics" },
  { to: "/settings", label: "Settings", icon: Gear, testid: "nav-settings" },
];

function SidebarContent({ onNavigate }) {
  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <Heartbeat weight="fill" size={22} className="text-white" />
        </div>
        <div>
          <p className="font-heading text-lg font-extrabold leading-none tracking-tight text-white">
            MediMind
          </p>
          <p className="mt-1 text-[10px] font-medium leading-none text-slate-400">
            Multi-Agent Medical AI
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={item.testid}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <Icon size={20} weight="duotone" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-5 py-4">
        <div className="rounded-lg bg-slate-800/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
            Demo Mode Ready
          </p>
          <p className="mt-1 text-[11px] leading-snug text-slate-400">
            Runs fully offline with local fallbacks. External APIs are optional.
          </p>
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const title = NAV.find((n) => (n.end ? n.to === location.pathname : location.pathname.startsWith(n.to)) && n.to !== "/")
    ?.label || (location.pathname === "/" ? "Dashboard" : "MediMind");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              data-testid="mobile-menu-btn"
              aria-label="Open menu"
            >
              {mobileOpen ? <X size={22} /> : <List size={22} />}
            </button>
            <div>
              <h1 className="font-heading text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {title}
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                Evidence-grounded AI for safer medical assistance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            <span className="text-[11px] font-semibold text-amber-700">Academic Prototype</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 pb-16 sm:p-8">{children}</main>

        {/* Persistent disclaimer */}
        <div
          data-testid="global-disclaimer"
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-slate-900 px-4 py-2 text-center lg:left-64"
        >
          <p className="mx-auto max-w-5xl text-[10.5px] leading-tight text-slate-400 sm:text-[11px]">
            <span className="font-semibold text-slate-300">Medical Disclaimer:</span> MediMind is an
            academic research prototype and is not intended to diagnose, treat, cure, or prevent any
            disease. AI-generated information may be inaccurate and should not replace professional
            medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}
