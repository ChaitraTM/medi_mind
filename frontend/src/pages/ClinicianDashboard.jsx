import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardText, ArrowRight, User } from "@phosphor-icons/react";
import { api } from "@/lib/api";

export default function ClinicianDashboard() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    api.reviews().then((res) => {
      const pending = res.reviews?.filter(r => r.status === "PENDING").length || 0;
      setPendingCount(pending);
    }).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <User size={24} weight="fill" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Clinician Dashboard</h1>
            <p className="mt-1 text-slate-600">Review AI predictions and manage patient cases.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/review" className="group block rounded-xl border border-slate-200 bg-white p-6 transition hover:border-amber-500 hover:shadow-md">
          <div className="flex items-start justify-between mb-4">
            <ClipboardText size={32} className="text-amber-500" />
            {pendingCount > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                {pendingCount}
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-900">Review Cases</h3>
          <p className="mt-1 text-sm text-slate-500">Approve, reject, or request second reviews for AI analyses.</p>
          <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-amber-600">
            Go to Reviews <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>
    </div>
  );
}
