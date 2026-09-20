import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChatCircleDots,
  FileText,
  Scan,
  ClipboardText,
  Gauge,
  ArrowUpRight,
  Robot,
  ArrowRight,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { ConfidenceRing } from "@/components/Indicators";

const METRICS = [
  { key: "total_conversations", label: "Total Conversations", icon: ChatCircleDots, color: "text-primary", bg: "bg-primary/10" },
  { key: "documents_indexed", label: "Documents Indexed", icon: FileText, color: "text-accent", bg: "bg-accent/10" },
  { key: "imaging_analyses", label: "Imaging Analyses", icon: Scan, color: "text-violet-600", bg: "bg-violet-100" },
  { key: "pending_reviews", label: "Pending Reviews", icon: ClipboardText, color: "text-amber-600", bg: "bg-amber-100" },
];

const DEMOS = [
  { title: "Ask a Medical Question", desc: "Symptoms of iron deficiency anemia", to: "/assistant" },
  { title: "Upload & Query a Document", desc: "PDF → chunk → index → answer", to: "/documents" },
  { title: "Analyze a Medical Image", desc: "Chest X-ray, skin lesion, brain scan", to: "/imaging" },
  { title: "Review AI Predictions", desc: "Approve / reject imaging results", to: "/review" },
];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.dashboard().then(setData).catch(() => setData({}));
  }, []);

  const d = data || {};

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero */}
      <div className="fade-up overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
              <Robot weight="fill" size={14} className="text-accent" />
              <span className="text-[11px] font-semibold text-slate-200">Multi-Agent Orchestration Active</span>
            </div>
            <h2 className="font-heading text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Welcome to MediMind
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-slate-300">
              Evidence-grounded AI for safer medical assistance. Route queries through guardrails,
              specialized agents, retrieval, confidence estimation and human review.
            </p>
          </div>
          <button
            data-testid="dashboard-launch-assistant"
            onClick={() => navigate("/assistant")}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Launch AI Assistant <ArrowRight weight="bold" size={16} />
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${m.bg}`}>
                <Icon size={20} weight="duotone" className={m.color} />
              </div>
              <p className="font-mono text-3xl font-bold tracking-tighter text-slate-900">
                {d[m.key] ?? "—"}
              </p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">{m.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Average confidence */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Gauge size={18} weight="duotone" className="text-primary" />
            <h3 className="font-heading text-base font-semibold text-slate-800">Average Confidence</h3>
          </div>
          <div className="flex items-center gap-5">
            <ConfidenceRing value={Math.round(d.average_confidence || 0)} size={96} stroke={9} />
            <div>
              <p className="text-sm text-slate-600">Across all agent executions</p>
              <p className="mt-1 text-xs text-slate-400">
                Application-level confidence, not model logprobs.
              </p>
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-4 font-heading text-base font-semibold text-slate-800">Recent Activity</h3>
          {d.recent_activity?.length ? (
            <div className="space-y-2">
              {d.recent_activity.map((a, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <Robot size={14} className="text-primary" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{a.agent_name}</p>
                      <p className="truncate text-xs text-slate-500">{a.query || a.input_type}</p>
                    </div>
                  </div>
                  {typeof a.confidence === "number" && a.confidence > 0 && (
                    <span className="shrink-0 font-mono text-xs font-semibold text-slate-600">
                      {a.confidence}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">
              No activity yet. Run a demo to populate this feed.
            </p>
          )}
        </div>
      </div>

      {/* Demo shortcuts */}
      <div>
        <h3 className="mb-3 font-heading text-base font-semibold text-slate-800">Demo Scenarios</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DEMOS.map((demo) => (
            <button
              key={demo.to}
              onClick={() => navigate(demo.to)}
              data-testid={`demo-shortcut-${demo.to.replace("/", "") || "home"}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-primary"
            >
              <div className="flex items-start justify-between">
                <p className="font-heading text-sm font-semibold text-slate-800">{demo.title}</p>
                <ArrowUpRight size={16} className="text-slate-300 transition-colors group-hover:text-primary" />
              </div>
              <p className="mt-1 text-xs text-slate-500">{demo.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
