import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadSimple,
  Scan,
  Heartbeat,
  Bandaids,
  Brain,
  ArrowRight,
  Image as ImageIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ConfidenceRing } from "@/components/Indicators";
import { ExecutionTimeline } from "@/components/ExecutionTimeline";

const MODES = {
  CHEST_XRAY: {
    label: "Chest X-ray",
    agent: "Chest X-ray Agent",
    icon: Heartbeat,
    demo: "https://images.unsplash.com/photo-1631651363531-fd29aec4cb5c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwxfHxjaGVzdCUyMHgtcmF5JTIwbWVkaWNhbHxlbnwwfHx8fDE3ODgwOTU0MzJ8MA&ixlib=rb-4.1.0&q=85",
  },
  SKIN_LESION: {
    label: "Skin Lesion",
    agent: "Skin Lesion Agent",
    icon: Bandaids,
    demo: "https://images.unsplash.com/photo-1732993486279-9d0f3b91adb2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w8NjY2NzV8MHwxfHNlYXJjaHw0fHxza2luJTIwY29uZGl0aW9uJTIwZGVybWF0b2xvZ3l8ZW58MHx8fHwxNzg4MDk1NDMzfDA&ixlib=rb-4.1.0&q=85",
  },
  BRAIN_TUMOR: {
    label: "Brain Tumor",
    agent: "Brain Tumor Agent",
    icon: Brain,
    demo: "https://images.unsplash.com/photo-1631563019676-dade0dbdb8fc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwzfHxicmFpbiUyMG1yaSUyMHNjYW4lMjBtZWRpY2FsfGVufDB8fHx8MTc4ODA5NTQzM3ww&ixlib=rb-4.1.0&q=85",
  },
};

export default function Imaging() {
  const [mode, setMode] = useState("CHEST_XRAY");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState([]);
  const [visionMode, setVisionMode] = useState("DEMO");
  const fileRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    api.config().then((conf) => setVisionMode(conf.vision_mode)).catch(console.error);
  }, []);

  const reset = () => { setPreview(null); setResult(null); setSteps([]); };

  const analyze = async (file) => {
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setLoading(true);
    setSteps([
      { label: "Image Uploaded", status: "done", detail: file.name },
      { label: `${MODES[mode].agent}`, status: "running", detail: "Running inference" },
    ]);
    try {
      const res = await api.imaging(mode, file);
      setSteps([
        { label: "Image Uploaded", status: "done", detail: file.name },
        { label: MODES[mode].agent, status: "done", detail: "Inference complete" },
        { label: "Prediction Generated", status: "done", detail: res.prediction },
        { label: "Confidence Estimated", status: "done", detail: `${res.confidence}%` },
        { label: "Sent to Clinician Review", status: "warning", detail: "PENDING CLINICIAN REVIEW" },
      ]);
      setResult(res);
      toast.success("Analysis complete — sent for clinician review");
    } catch (err) {
      toast.error(err.message);
      setSteps((s) => s.map((x) => (x.status === "running" ? { ...x, status: "warning", detail: "Failed" } : x)));
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) analyze(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const useDemo = async () => {
    try {
      toast.loading("Loading demo image…", { id: "demo" });
      const resp = await fetch(MODES[mode].demo);
      const blob = await resp.blob();
      toast.dismiss("demo");
      analyze(new File([blob], `demo-${mode}.jpg`, { type: blob.type || "image/jpeg" }));
    } catch {
      toast.dismiss("demo");
      toast.error("Could not load demo image. Please upload your own.");
    }
  };

  const box = result?.bounding_box;
  const seg = result?.segmentation;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {visionMode === "DEMO" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3">
          <p className="text-sm font-semibold text-amber-800">
            ACADEMIC DEMONSTRATION — NOT A CLINICAL DIAGNOSIS
          </p>
          <p className="text-xs text-amber-700">
            Imaging analysis uses a demonstration inference adapter and always requires clinician review.
          </p>
        </div>
      )}

      {/* Mode tabs */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(MODES).map(([key, m]) => {
          const Icon = m.icon;
          const active = key === mode;
          return (
            <button
              key={key}
              data-testid={`imaging-mode-${key}`}
              onClick={() => { setMode(key); reset(); }}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                active ? "border-primary bg-primary/5" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <Icon size={26} weight="duotone" className={active ? "text-primary" : "text-slate-400"} />
              <span className={`text-sm font-semibold ${active ? "text-primary" : "text-slate-600"}`}>{m.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upload / preview */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Scan size={18} weight="duotone" className="text-primary" />
            <h3 className="font-heading text-base font-semibold text-slate-800">{MODES[mode].label} Upload</h3>
          </div>

          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} data-testid="imaging-file-input" />

          {preview ? (
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900" data-testid="imaging-preview">
              <img src={preview} alt="scan" className="max-h-[50vh] w-full object-contain" />
              {box && (
                <div
                  className="absolute border-2 border-rose-400"
                  style={{
                    left: `${box.x}%`, top: `${box.y}%`,
                    width: `${box.width}%`, height: `${box.height}%`,
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.06)",
                  }}
                >
                  <span className="absolute -top-6 left-0 rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    Region of interest
                  </span>
                </div>
              )}
              {seg && (
                <div
                  className="absolute rounded-full border-2 border-accent bg-accent/20"
                  style={{
                    left: `${seg.cx - seg.rx}%`, top: `${seg.cy - seg.ry}%`,
                    width: `${seg.rx * 2}%`, height: `${seg.ry * 2}%`,
                  }}
                >
                  <span className="absolute -top-6 left-0 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                    Segmentation
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <button
                data-testid="imaging-upload-btn"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-10 transition-colors hover:border-primary"
              >
                <UploadSimple size={28} className="text-primary" />
                <span className="text-sm font-semibold text-slate-700">Upload {MODES[mode].label} image</span>
                <span className="text-xs text-slate-400">Max 8 MB · JPG / PNG</span>
              </button>
              <button
                data-testid="imaging-demo-btn"
                onClick={useDemo}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-primary"
              >
                <ImageIcon size={16} /> Use demo image
              </button>
            </div>
          )}

          {preview && (
            <button
              onClick={reset}
              data-testid="imaging-reset-btn"
              className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50"
            >
              Upload a different image
            </button>
          )}
        </div>

        {/* Result */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-heading text-base font-semibold text-slate-800">Analysis Result</h3>

          {!preview && (
            <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
              <Scan size={36} weight="duotone" className="mb-2" />
              <p className="text-sm">Upload an image to see the AI analysis.</p>
            </div>
          )}

          {steps.length > 0 && <div className="mb-4"><ExecutionTimeline steps={steps} /></div>}

          {loading && !result && (
            <p className="text-center text-sm text-slate-500">Analyzing image…</p>
          )}

          {result && (
            <div className="fade-up space-y-4" data-testid="imaging-result">
              <div className="flex items-center gap-5">
                <ConfidenceRing value={result.confidence} size={88} stroke={8} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Predicted finding</p>
                  <p className="font-heading text-lg font-bold leading-tight text-slate-900">{result.prediction}</p>
                  <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    {result.status}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Analysis</p>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{result.analysis}</p>
              </div>

              {result.labels_considered?.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Labels considered</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.labels_considered.map((l) => (
                      <span key={l} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-600">{l}</span>
                    ))}
                  </div>
                </div>
              )}

              <button
                data-testid="goto-review-btn"
                onClick={() => navigate("/review")}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Open Clinician Review <ArrowRight weight="bold" size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
