import React from "react";

// SVG confidence ring. Green >85, Amber 60-84, Red <60.
export function ConfidenceRing({ value = 0, size = 72, stroke = 7, showLabel = true }) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value));
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 85 ? "#059669" : pct >= 60 ? "#d97706" : "#e11d48";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono font-bold text-slate-900" style={{ fontSize: size * 0.24 }}>
            {pct}%
          </span>
        </div>
      )}
    </div>
  );
}

const levelStyles = {
  HIGH: "bg-emerald-50 text-emerald-700 border-emerald-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  LOW: "bg-rose-50 text-rose-700 border-rose-200",
  "N/A": "bg-slate-100 text-slate-500 border-slate-200",
};

export function ConfidenceBadge({ level, score }) {
  const cls = levelStyles[level] || levelStyles["N/A"];
  return (
    <span
      data-testid="confidence-badge"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {level}
      {typeof score === "number" && <span className="font-mono">· {score}%</span>}
    </span>
  );
}

const statusStyles = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  "PENDING CLINICIAN REVIEW": "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  SECOND_REVIEW: "bg-sky-50 text-sky-700 border-sky-200",
  "PENDING SECOND REVIEW": "bg-sky-50 text-sky-700 border-sky-200",
  READY: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function StatusBadge({ status }) {
  const cls = statusStyles[status] || "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}
