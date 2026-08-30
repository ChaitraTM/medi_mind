import React, { useCallback, useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MarkerType } from "reactflow";
import "reactflow/dist/style.css";
import { Play, Robot } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const base = {
  padding: 10,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  fontSize: 12,
  fontWeight: 600,
  color: "#0f172a",
  width: 170,
  textAlign: "center",
  fontFamily: "Manrope, sans-serif",
};

const NODES = [
  { id: "input", position: { x: 340, y: 0 }, data: { label: "🧑 User Input" } },
  { id: "guardrail", position: { x: 340, y: 90 }, data: { label: "Input Guardrail" } },
  { id: "orchestrator", position: { x: 340, y: 180 }, data: { label: "Orchestrator / Router" } },
  { id: "rag", position: { x: 70, y: 290 }, data: { label: "Medical RAG Agent" } },
  { id: "web", position: { x: 340, y: 290 }, data: { label: "Web Search Agent" } },
  { id: "vision", position: { x: 610, y: 290 }, data: { label: "Vision Agents" } },
  { id: "chest", position: { x: 560, y: 390 }, data: { label: "Chest X-ray" } },
  { id: "skin", position: { x: 560, y: 460 }, data: { label: "Skin Lesion" } },
  { id: "brain", position: { x: 560, y: 530 }, data: { label: "Brain Tumor" } },
  { id: "confidence", position: { x: 340, y: 620 }, data: { label: "Confidence Estimator" } },
  { id: "review", position: { x: 340, y: 710 }, data: { label: "Human Review" } },
  { id: "response", position: { x: 340, y: 800 }, data: { label: "✓ Final Response" } },
].map((n) => ({ ...n, style: base, sourcePosition: "bottom", targetPosition: "top" }));

const EDGES = [
  ["input", "guardrail"], ["guardrail", "orchestrator"],
  ["orchestrator", "rag"], ["orchestrator", "web"], ["orchestrator", "vision"],
  ["rag", "web", "low-conf"], ["rag", "confidence"], ["web", "confidence"],
  ["vision", "chest"], ["vision", "skin"], ["vision", "brain"],
  ["chest", "confidence"], ["skin", "confidence"], ["brain", "confidence"],
  ["confidence", "review"], ["review", "response"],
].map(([source, target, label]) => ({
  id: `${source}-${target}`,
  source,
  target,
  label: label === "low-conf" ? "low confidence" : undefined,
  animated: false,
  style: { stroke: "#cbd5e1", strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "#cbd5e1" },
  labelStyle: { fontSize: 9, fill: "#94a3b8" },
}));

const PATHS = {
  MEDICAL_QA: ["input", "guardrail", "orchestrator", "rag", "confidence", "review", "response"],
  DOCUMENT_QA: ["input", "guardrail", "orchestrator", "rag", "confidence", "review", "response"],
  WEB_RESEARCH: ["input", "guardrail", "orchestrator", "web", "confidence", "review", "response"],
  CHEST_XRAY: ["input", "guardrail", "orchestrator", "vision", "chest", "confidence", "review", "response"],
  SKIN_LESION: ["input", "guardrail", "orchestrator", "vision", "skin", "confidence", "review", "response"],
  BRAIN_TUMOR: ["input", "guardrail", "orchestrator", "vision", "brain", "confidence", "review", "response"],
  GENERAL: ["input", "guardrail", "orchestrator", "rag", "confidence", "review", "response"],
};

export default function Workflow() {
  const [active, setActive] = useState([]);
  const [query, setQuery] = useState("What are the symptoms of iron deficiency anemia?");
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);

  const animatePath = useCallback((path, handoff) => {
    const full = handoff && !path.includes("web") ? [...path.slice(0, 4), "web", ...path.slice(4)] : path;
    setActive([]);
    full.forEach((id, i) => {
      setTimeout(() => setActive((a) => [...a, id]), i * 550);
    });
  }, []);

  const run = async () => {
    if (!query.trim() || running) return;
    setRunning(true);
    setActive(["input"]);
    try {
      const res = await api.chat({ message: query.trim() });
      const path = PATHS[res.intent] || PATHS.GENERAL;
      animatePath(path, !!res.handoff_reason);
      setLastRun(res);
      toast.success(`Routed to ${res.agent}`);
    } catch (e) {
      toast.error(e.message);
      setActive([]);
    } finally {
      setTimeout(() => setRunning(false), 4000);
    }
  };

  const nodes = useMemo(
    () =>
      NODES.map((n) => ({
        ...n,
        className: active.includes(n.id) ? "node-active" : "",
        style: {
          ...base,
          ...(active.includes(n.id)
            ? { border: "2px solid #0369a1", background: "#f0f9ff", color: "#0369a1" }
            : {}),
        },
      })),
    [active]
  );

  const edges = useMemo(
    () =>
      EDGES.map((e) => {
        const on = active.includes(e.source) && active.includes(e.target);
        return {
          ...e,
          className: on ? "edge-active" : "",
          style: { stroke: on ? "#0369a1" : "#cbd5e1", strokeWidth: on ? 2.5 : 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: on ? "#0369a1" : "#cbd5e1" },
        };
      }),
    [active]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-heading text-lg font-bold text-slate-800">Agent Workflow</h2>
        <p className="mb-4 text-sm text-slate-500">
          Run a live query to watch it flow through the multi-agent graph. Executed nodes are highlighted.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            data-testid="workflow-query-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="Enter a query to trace the workflow…"
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            data-testid="workflow-run-btn"
            onClick={run}
            disabled={running}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            <Play weight="fill" size={15} /> {running ? "Running…" : "Run Query"}
          </button>
        </div>

        {lastRun && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs">
            <Robot size={14} className="text-primary" />
            <span className="font-semibold text-slate-700">{lastRun.agent}</span>
            <span className="rounded bg-primary/10 px-2 py-0.5 font-medium text-primary">{lastRun.intent}</span>
            <span className="font-mono text-slate-500">confidence {lastRun.confidence_score}%</span>
            {lastRun.handoff_reason && <span className="text-amber-600">↪ {lastRun.handoff_reason}</span>}
          </div>
        )}
      </div>

      <div className="h-[600px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50" data-testid="workflow-graph">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#cbd5e1" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
