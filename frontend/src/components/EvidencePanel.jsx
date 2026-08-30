import React from "react";
import { FileText, Globe, Quotes } from "@phosphor-icons/react";

export function EvidencePanel({ sources = [] }) {
  if (!sources.length) return null;
  return (
    <div data-testid="evidence-panel" className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Quotes weight="fill" size={16} className="text-primary" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Evidence &amp; Sources ({sources.length})
        </p>
      </div>
      <div className="space-y-2.5">
        {sources.map((s, i) => {
          const isWeb = s.document_id === "web" || s.url;
          return (
            <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  {isWeb ? (
                    <Globe size={14} className="shrink-0 text-accent" />
                  ) : (
                    <FileText size={14} className="shrink-0 text-primary" />
                  )}
                  <span className="truncate text-xs font-semibold text-slate-700">
                    {s.document_name}
                  </span>
                </div>
                {typeof s.relevance === "number" && (
                  <span className="shrink-0 font-mono text-[10px] text-slate-500">
                    relevance {(s.relevance * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="line-clamp-3 text-xs leading-relaxed text-slate-600">{s.text}</p>
              {s.url && (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block truncate text-[11px] font-medium text-accent hover:underline"
                >
                  {s.url}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
