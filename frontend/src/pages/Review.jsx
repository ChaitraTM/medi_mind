import React, { useEffect, useState } from "react";
import {
  Check,
  X,
  ArrowsClockwise,
  ClipboardText,
  CaretDown,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ConfidenceRing, StatusBadge } from "@/components/Indicators";

export default function Review() {
  const [reviews, setReviews] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [notes, setNotes] = useState({});

  const load = () => api.reviews().then(setReviews).catch(() => {});
  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    setBusy(id);
    try {
      const fn = { approve: api.approveReview, reject: api.rejectReview, second: api.secondReview }[action];
      await fn(id, notes[id] || "");
      toast.success(`Review ${action === "second" ? "escalated for second review" : action + "d"}`);
      setNotes((n) => ({ ...n, [id]: "" }));
      await load();
    } catch (e) {
      toast.error("Action failed. Please retry.");
    } finally {
      setBusy(null);
    }
  };

  const filtered = filter === "ALL" ? reviews : reviews.filter((r) => r.status === filter);
  const pendingCount = reviews.filter((r) => r.status === "PENDING").length;

  const FILTERS = [
    { key: "ALL", label: "All" },
    { key: "PENDING", label: "Pending" },
    { key: "APPROVED", label: "Approved" },
    { key: "REJECTED", label: "Rejected" },
    { key: "SECOND_REVIEW", label: "Second Review" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <ClipboardText size={20} weight="duotone" className="text-primary" />
          <h2 className="font-heading text-lg font-bold text-slate-800">Clinician Review Queue</h2>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
              {pendingCount} pending
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              data-testid={`review-filter-${f.key}`}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === f.key ? "bg-primary text-white" : "bg-white text-slate-500 border border-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <ClipboardText size={36} weight="duotone" className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-400">No reviews in this category.</p>
          <p className="mt-1 text-xs text-slate-400">Analyze a medical image to create a review.</p>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((r) => (
          <div key={r.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid={`review-card-${r.id}`}>
            <div className="flex flex-col gap-4 p-4 sm:flex-row">
              <img src={r.image} alt="scan" className="h-40 w-full shrink-0 rounded-xl border border-slate-200 bg-slate-900 object-contain sm:w-40" />
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{r.agent}</span>
                  <StatusBadge status={r.status} />
                  <span className="font-mono text-[10px] text-slate-400">ID {r.id.slice(0, 8)}</span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Predicted finding</p>
                <p className="font-heading text-base font-bold text-slate-900">{r.prediction}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {r.filename} · {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-center justify-center">
                <ConfidenceRing value={r.confidence} size={72} stroke={7} />
              </div>
            </div>

            {/* Actions */}
            {(r.status === "PENDING" || r.status === "SECOND_REVIEW") && (
              <div className="border-t border-slate-100 px-4 pt-3">
                <textarea
                  data-testid={`review-note-${r.id}`}
                  value={notes[r.id] || ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  rows={2}
                  placeholder="Optional clinician note (recorded in the audit trail)…"
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary"
                />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
              {r.status === "PENDING" || r.status === "SECOND_REVIEW" ? (
                <>
                  <button
                    data-testid={`approve-btn-${r.id}`}
                    disabled={busy === r.id}
                    onClick={() => act(r.id, "approve")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check weight="bold" size={15} /> Approve
                  </button>
                  <button
                    data-testid={`reject-btn-${r.id}`}
                    disabled={busy === r.id}
                    onClick={() => act(r.id, "reject")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    <X weight="bold" size={15} /> Reject
                  </button>
                  {r.status !== "SECOND_REVIEW" && (
                    <button
                      data-testid={`second-btn-${r.id}`}
                      disabled={busy === r.id}
                      onClick={() => act(r.id, "second")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <ArrowsClockwise size={15} /> Second Review
                    </button>
                  )}
                </>
              ) : (
                <p className="text-sm font-medium text-slate-500">
                  Decision recorded: <StatusBadge status={r.status} />
                </p>
              )}
              <button
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                data-testid={`expand-btn-${r.id}`}
              >
                Details <CaretDown size={13} className={`transition-transform ${expanded === r.id ? "rotate-180" : ""}`} />
              </button>
            </div>

            {expanded === r.id && (
              <div className="space-y-3 border-t border-slate-100 px-4 py-4">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">AI Explanation</p>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{r.explanation}</p>
                </div>
                <div>
                  <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <ClockCounterClockwise size={12} /> Audit Trail
                  </p>
                  <div className="space-y-1.5">
                    {r.audit_trail?.map((a, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                          {a.action}
                        </span>
                        <span className="text-slate-500">{a.note}</span>
                        {a.clinician_note && (
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            “{a.clinician_note}”
                          </span>
                        )}
                        <span className="ml-auto text-[10px] text-slate-400">{new Date(a.at).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
