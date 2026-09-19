import React from "react";
import { Link } from "react-router-dom";
import { ChatCircleDots, FileText, Scan, ArrowRight } from "@phosphor-icons/react";

export default function PatientDashboard() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-extrabold text-slate-900">Welcome to MediMind</h1>
        <p className="mt-2 text-slate-600">Your personal AI medical assistant. How can we help you today?</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <Link to="/assistant" className="group block rounded-xl border border-slate-200 bg-white p-6 transition hover:border-primary hover:shadow-md">
          <ChatCircleDots size={32} className="text-primary mb-4" />
          <h3 className="text-lg font-bold text-slate-900">Ask a Medical Question</h3>
          <p className="mt-1 text-sm text-slate-500">Chat with the AI assistant about symptoms or general medical questions.</p>
          <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary">
            Start Chat <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
        
        <Link to="/documents" className="group block rounded-xl border border-slate-200 bg-white p-6 transition hover:border-accent hover:shadow-md">
          <FileText size={32} className="text-accent mb-4" />
          <h3 className="text-lg font-bold text-slate-900">Upload a Document</h3>
          <p className="mt-1 text-sm text-slate-500">Upload PDFs or medical records to query specific information.</p>
          <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-accent">
            Go to Documents <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        <Link to="/imaging" className="group block rounded-xl border border-slate-200 bg-white p-6 transition hover:border-violet-600 hover:shadow-md">
          <Scan size={32} className="text-violet-600 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">Analyze an Image</h3>
          <p className="mt-1 text-sm text-slate-500">Upload Chest X-rays, skin lesions, or brain scans for AI analysis.</p>
          <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-violet-600">
            Go to Imaging <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>
    </div>
  );
}
