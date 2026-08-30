import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip,
} from "recharts";
import {
  ChartBar, ChatCircleDots, MagnifyingGlass, Scan, Gauge,
  CheckCircle, XCircle, Clock,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { ConfidenceRing } from "@/components/Indicators";

const COLORS = ["#0369a1", "#0d9488", "#7c3aed", "#d97706", "#e11d48", "#059669"];

export default function Analytics() {
  const [data, setData] = useState(null);
  useEffect(() => { api.analytics().then(setData).catch(() => setData({})); }, []);
  const d = data || {};

  const agentData = Object.entries(d.agent_usage || {}).map(([name, value]) => ({
    name: name.replace(" Agent", ""),
    value,
  }));

  const metrics = [
    { label: "Total Queries", value: d.total_queries, icon: ChatCircleDots, color: "text-primary" },
    { label: "RAG Queries", value: d.rag_queries, icon: MagnifyingGlass, color: "text-accent" },
    { label: "Web Searches", value: d.web_searches, icon: MagnifyingGlass, color: "text-violet-600" },
    { label: "Imaging Analyses", value: d.imaging_queries, icon: Scan, color: "text-amber-600" },
  ];

  const reviewStats = [
    { label: "Pending", value: d.pending_reviews, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Approved", value: d.approved_reviews, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Rejected", value: d.rejected_reviews, icon: XCircle, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Second Review", value: d.second_review_requests, icon: Clock, color: "text-sky-600", bg: "bg-sky-50" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-2">
        <ChartBar size={20} weight="duotone" className="text-primary" />
        <h2 className="font-heading text-lg font-bold text-slate-800">Analytics</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <Icon size={20} weight="duotone" className={`mb-2 ${m.color}`} />
              <p className="font-mono text-3xl font-bold tracking-tighter text-slate-900">{m.value ?? 0}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">{m.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-4 font-heading text-base font-semibold text-slate-800">Agent Usage</h3>
          {agentData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={agentData} margin={{ top: 8, right: 8, bottom: 8, left: -18 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} interval={0} angle={-12} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {agentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-sm text-slate-400">No agent executions yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Gauge size={18} weight="duotone" className="text-primary" />
            <h3 className="font-heading text-base font-semibold text-slate-800">Avg Confidence</h3>
          </div>
          <div className="flex flex-col items-center">
            <ConfidenceRing value={Math.round(d.average_confidence || 0)} size={120} stroke={11} />
            <p className="mt-3 text-center text-xs text-slate-400">
              Application-level confidence across {d.total_queries || 0} executions.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-heading text-base font-semibold text-slate-800">Clinician Review Outcomes</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {reviewStats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`rounded-xl border border-slate-200 ${s.bg} p-5`}>
                <Icon size={20} weight="duotone" className={`mb-2 ${s.color}`} />
                <p className="font-mono text-3xl font-bold tracking-tighter text-slate-900">{s.value ?? 0}</p>
                <p className="mt-0.5 text-xs font-medium text-slate-600">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-2 font-heading text-base font-semibold text-slate-800">Scientific Evaluation</h3>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">{d.evaluation_metrics || "Evaluation data not available yet."}</p>
          <p className="mt-1 text-xs text-slate-400">
            Formal accuracy / F1 metrics require running a labelled evaluation dataset, which has not been executed.
          </p>
        </div>
      </div>
    </div>
  );
}
