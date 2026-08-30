import React from "react";
import {
  CheckCircle,
  CircleNotch,
  Warning,
  ArrowsClockwise,
} from "@phosphor-icons/react";

const iconFor = (status) => {
  if (status === "done") return <CheckCircle weight="fill" className="text-emerald-500" size={18} />;
  if (status === "running") return <CircleNotch className="text-primary animate-spin" size={18} />;
  if (status === "warning") return <Warning weight="fill" className="text-rose-500" size={18} />;
  return <ArrowsClockwise className="text-slate-300" size={18} />;
};

export function ExecutionTimeline({ steps = [] }) {
  if (!steps.length) return null;
  return (
    <div data-testid="execution-timeline" className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Agent Execution
      </p>
      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <li
            key={i}
            className="step-in flex items-start gap-2.5 text-sm"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="mt-0.5 shrink-0">{iconFor(s.status)}</span>
            <span className="min-w-0">
              <span className="font-medium text-slate-800">{s.label}</span>
              {s.detail && <span className="ml-1.5 text-xs text-slate-500">— {s.detail}</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
