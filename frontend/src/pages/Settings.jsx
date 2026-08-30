import React, { useEffect, useState } from "react";
import {
  Gear, Brain, Globe, Microphone, Database, CheckCircle, XCircle, ShieldCheck,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";

function StatusPill({ ok, okText, offText }) {
  return ok ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
      <CheckCircle weight="fill" size={14} /> {okText}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
      <XCircle weight="fill" size={14} /> {offText}
    </span>
  );
}

export default function Settings() {
  const [cfg, setCfg] = useState(null);
  useEffect(() => { api.config().then(setCfg).catch(() => setCfg({})); }, []);
  const c = cfg || {};

  const services = [
    { icon: Brain, title: "LLM Provider", desc: `${c.llm_provider || "openai"} · ${c.llm_model || "gpt-5.4"}`,
      ok: c.llm_active, okText: "Active", offText: "Fallback mode",
      note: "Powers agent reasoning and answer generation via the Emergent Universal Key." },
    { icon: Globe, title: "Web Search", desc: c.web_provider === "tavily" ? "Tavily (live)" : "Demo Web Search (fallback)",
      ok: c.web_provider === "tavily", okText: "Tavily", offText: "Demo Fallback",
      note: "Add TAVILY_API_KEY to enable live web research. Demo fallback is used otherwise." },
    { icon: Microphone, title: "Voice (STT/TTS)", desc: "OpenAI Whisper + TTS via Universal Key",
      ok: c.voice_active, okText: "Active", offText: "Not configured",
      note: "Speech-to-text and text-to-speech for voice interaction." },
    { icon: Database, title: "Vector Retrieval", desc: c.vector_db === "qdrant" ? "Qdrant" : "Local TF-IDF (persistent)",
      ok: true, okText: c.vector_db === "qdrant" ? "Qdrant" : "Local", offText: "Local",
      note: "Retrieval is modular — Qdrant can be connected via QDRANT_URL later." },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Gear size={20} weight="duotone" className="text-primary" />
        <h2 className="font-heading text-lg font-bold text-slate-800">Settings &amp; System Status</h2>
      </div>

      {/* Demo mode banner */}
      <div className={`rounded-2xl border p-5 ${c.demo_mode ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
        <div className="flex items-center gap-2">
          <ShieldCheck weight="fill" size={18} className={c.demo_mode ? "text-amber-600" : "text-emerald-600"} />
          <p className={`font-heading text-sm font-bold ${c.demo_mode ? "text-amber-800" : "text-emerald-800"}`}>
            {c.demo_mode ? "DEMO MODE" : "FULLY CONFIGURED"}
          </p>
        </div>
        <p className={`mt-1 text-xs ${c.demo_mode ? "text-amber-700" : "text-emerald-700"}`}>
          {c.demo_mode
            ? "The app runs end-to-end with local fallbacks. External APIs are optional enhancements and their absence never crashes the application."
            : "All external services are connected and active."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {services.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Icon size={18} weight="duotone" className="text-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                    <p className="font-mono text-[11px] text-slate-400">{s.desc}</p>
                  </div>
                </div>
              </div>
              <StatusPill ok={s.ok} okText={s.okText} offText={s.offText} />
              <p className="mt-3 text-xs leading-relaxed text-slate-500">{s.note}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-2 font-heading text-base font-semibold text-slate-800">Environment Configuration</h3>
        <p className="mb-3 text-sm text-slate-500">
          Add these variables to <span className="font-mono text-xs">backend/.env</span> to enable optional services.
          The application is fully functional without them.
        </p>
        <div className="rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-300">
          <p><span className="text-emerald-400">EMERGENT_LLM_KEY</span>=sk-emergent-...  <span className="text-slate-500"># LLM + voice</span></p>
          <p><span className="text-emerald-400">LLM_PROVIDER</span>=openai  <span className="text-slate-500"># openai | anthropic | gemini</span></p>
          <p><span className="text-emerald-400">LLM_MODEL</span>=gpt-5.4</p>
          <p><span className="text-amber-400">TAVILY_API_KEY</span>=  <span className="text-slate-500"># optional — live web search</span></p>
          <p><span className="text-amber-400">QDRANT_URL</span>=  <span className="text-slate-500"># optional — vector DB</span></p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 font-heading text-base font-semibold text-slate-800">Safety Guardrails</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          {[
            "Input guardrail detects emergency & unsafe self-treatment requests",
            "Output guardrail softens definitive/diagnostic language",
            "All imaging results require clinician review before use",
            "RAG answers must be grounded in retrieved evidence",
            "Persistent medical disclaimer shown throughout the app",
          ].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <CheckCircle weight="fill" size={16} className="shrink-0 text-emerald-500" /> {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
