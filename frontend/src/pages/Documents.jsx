import React, { useEffect, useState, useRef } from "react";
import {
  UploadSimple,
  FileText,
  Trash,
  Check,
  ChatText,
  Sparkle,
  Circle,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ConfidenceBadge, StatusBadge } from "@/components/Indicators";
import { EvidencePanel } from "@/components/EvidencePanel";

const PIPELINE = ["DOCUMENT UPLOADED", "PROCESSING", "CHUNKING", "INDEXED", "READY"];

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState(-1);
  const [selected, setSelected] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [querying, setQuerying] = useState(false);
  const fileRef = useRef();

  const load = () => api.documents().then(setDocs).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please select a PDF file.");
      return;
    }
    setUploading(true);
    setStage(0);
    const timers = [
      setTimeout(() => setStage(1), 400),
      setTimeout(() => setStage(2), 900),
      setTimeout(() => setStage(3), 1400),
    ];
    try {
      await api.uploadDocument(file);
      timers.forEach(clearTimeout);
      setStage(4);
      toast.success(`${file.name} indexed successfully`);
      await load();
      setTimeout(() => setStage(-1), 1200);
    } catch (err) {
      timers.forEach(clearTimeout);
      setStage(-1);
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteDocument(id);
      toast.success("Document deleted");
      if (selected?.id === id) { setSelected(null); setAnswer(null); }
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const runQuery = async () => {
    if (!selected || !question.trim()) return;
    setQuerying(true);
    setAnswer(null);
    try {
      const res = await api.queryDocument(selected.id, question.trim());
      setAnswer(res);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setQuerying(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Upload */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 font-heading text-lg font-bold text-slate-800">Document Knowledge Base</h2>
        <p className="mb-4 text-sm text-slate-500">
          Upload a PDF. MediMind extracts text, chunks it, and indexes it for retrieval-augmented answers.
        </p>

        <input ref={fileRef} type="file" accept=".pdf" hidden onChange={handleUpload} data-testid="doc-file-input" />
        <button
          data-testid="upload-doc-btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-8 transition-colors hover:border-primary disabled:opacity-60"
        >
          <UploadSimple size={28} className="text-primary" />
          <span className="text-sm font-semibold text-slate-700">
            {uploading ? "Processing…" : "Click to upload a PDF"}
          </span>
          <span className="text-xs text-slate-400">Max 15 MB · PDF only</span>
        </button>

        {stage >= 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2" data-testid="upload-pipeline">
            {PIPELINE.map((p, i) => (
              <div key={p} className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    i <= stage
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  {i < stage ? <Check size={12} weight="bold" /> : i === stage ? <Circle size={10} weight="fill" className="animate-pulse" /> : <Circle size={10} />}
                  {p}
                </span>
                {i < PIPELINE.length - 1 && <span className="text-slate-300">→</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document list */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="font-heading text-base font-semibold text-slate-800">
            Indexed Documents <span className="font-mono text-sm text-slate-400">({docs.length})</span>
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className={`flex items-center gap-4 px-6 py-3.5 transition-colors ${selected?.id === doc.id ? "bg-primary/5" : ""}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText size={18} className="text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-slate-800">{doc.filename}</p>
                  {doc.is_demo && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">DEMO DATA</span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {doc.num_chunks} chunks · {doc.size_kb} KB · {new Date(doc.upload_date).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge status={doc.status} />
              <button
                data-testid={`query-doc-${doc.id}`}
                onClick={() => { setSelected(doc); setAnswer(null); setQuestion(""); }}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
              >
                <ChatText size={14} /> Ask
              </button>
              {!doc.is_demo && (
                <button
                  data-testid={`delete-doc-${doc.id}`}
                  onClick={() => handleDelete(doc.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                >
                  <Trash size={16} />
                </button>
              )}
            </div>
          ))}
          {docs.length === 0 && (
            <p className="px-6 py-10 text-center text-sm text-slate-400">No documents indexed yet.</p>
          )}
        </div>
      </div>

      {/* Document Q&A */}
      {selected && (
        <div className="fade-up rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" data-testid="doc-qa-panel">
          <div className="mb-3 flex items-center gap-2">
            <Sparkle weight="fill" size={16} className="text-primary" />
            <h3 className="font-heading text-base font-semibold text-slate-800">
              Ask about: <span className="text-primary">{selected.filename}</span>
            </h3>
          </div>
          <div className="flex gap-2">
            <input
              data-testid="doc-question-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runQuery()}
              placeholder="e.g. According to this document, what are the recommended treatments?"
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              data-testid="doc-query-submit"
              onClick={runQuery}
              disabled={querying || !question.trim()}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-40"
            >
              {querying ? "Retrieving…" : "Ask"}
            </button>
          </div>

          {answer && (
            <div className="mt-4 fade-up">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <ConfidenceBadge level={answer.confidence_level} score={answer.confidence_score} />
                <span className="text-xs text-slate-400">Evidence: {answer.evidence_strength}</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Answer</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{answer.answer}</p>
              </div>
              {answer.sources?.length > 0 && <EvidencePanel sources={answer.sources} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
