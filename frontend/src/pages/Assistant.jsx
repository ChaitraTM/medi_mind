import React, { useState, useRef, useEffect } from "react";
import {
  PaperPlaneRight,
  Microphone,
  Stop,
  SpeakerHigh,
  ClockCounterClockwise,
  Robot,
  User,
  Warning,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ConfidenceBadge } from "@/components/Indicators";
import { ExecutionTimeline } from "@/components/ExecutionTimeline";
import { EvidencePanel } from "@/components/EvidencePanel";

const SUGGESTIONS = [
  "What are the common symptoms of iron deficiency anemia?",
  "What is the recommended first-line treatment for type 2 diabetes?",
  "Find the latest treatment recommendations for hypertension",
  "What are the symptoms of Ehlers-Danlos syndrome?",
];

export default function Assistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [recording, setRecording] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const scrollRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const loadHistory = () => api.conversations().then(setHistory).catch(() => {});

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setLoading(true);
    try {
      const res = await api.chat({ message: q, conversation_id: conversationId });
      setConversationId(res.conversation_id);
      setMessages((m) => [...m, { role: "assistant", data: res }]);
    } catch (e) {
      toast.error(e.message);
      setMessages((m) => [...m, { role: "assistant", error: e.message }]);
    } finally {
      setLoading(false);
    }
  };

  const [speechRecognition, setSpeechRecognition] = useState(null);

  useEffect(() => {
    // Initialize speech recognition if supported
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        toast.success("Transcribed");
        setRecording(false);
      };
      
      recognition.onerror = (event) => {
        toast.error(`Speech recognition error: ${event.error}`);
        setRecording(false);
      };
      
      recognition.onend = () => {
        setRecording(false);
      };
      
      setSpeechRecognition(recognition);
    }
  }, []);

  const startRecording = () => {
    if (!speechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }
    try {
      speechRecognition.start();
      setRecording(true);
      toast.info("Listening...", { id: "stt" });
    } catch (e) {
      toast.error("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (speechRecognition) {
      speechRecognition.stop();
    }
    setRecording(false);
    toast.dismiss("stt");
  };

  const speak = (text) => {
    if (!window.speechSynthesis) {
      toast.error("Text-to-speech is not supported in this browser.");
      return;
    }
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    // Clean up the text (remove markdown, asterisks, URLs)
    const cleanText = text
      .replace(/\*/g, '')
      .replace(/#/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');
      
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Try to find a good voice (e.g. Google US English, Samantha, etc.)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Samantha")) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => toast.info("Speaking...", { id: "tts" });
    utterance.onend = () => toast.dismiss("tts");
    utterance.onerror = () => {
      toast.dismiss("tts");
      toast.error("Failed to speak.");
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const openConversation = (conv) => {
    const restored = [];
    conv.messages.forEach((m) => {
      restored.push({ role: "user", content: m.question });
      restored.push({ role: "assistant", data: m });
    });
    setMessages(restored);
    setConversationId(conv.id);
    setHistoryOpen(false);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-4xl flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkle weight="fill" size={18} className="text-primary" />
          <h2 className="font-heading text-lg font-bold text-slate-800">AI Medical Assistant</h2>
        </div>
        <button
          data-testid="chat-history-btn"
          onClick={() => {
            loadHistory();
            setHistoryOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-primary"
        >
          <ClockCounterClockwise size={15} /> History
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        data-testid="chat-messages"
        className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Robot weight="duotone" size={30} className="text-primary" />
            </div>
            <p className="font-heading text-base font-semibold text-slate-700">
              Ask a medical question
            </p>
            <p className="mb-5 mt-1 max-w-sm text-sm text-slate-500">
              Your query is routed through guardrails, an orchestrator, and specialized agents with
              evidence and confidence.
            </p>
            <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  data-testid={`suggestion-${i}`}
                  onClick={() => send(s)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-xs text-slate-600 transition-colors hover:border-primary hover:text-slate-900"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="fade-up flex justify-end gap-2.5">
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-white">
                {m.content}
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <User size={16} className="text-primary" />
              </div>
            </div>
          ) : (
            <div key={i} className="fade-up flex gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900">
                <Robot size={16} className="text-white" />
              </div>
              <div className="min-w-0 max-w-[85%] space-y-3">
                {m.error ? (
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <Warning weight="fill" size={16} /> {m.error}
                    <button onClick={() => send(messages[i - 1]?.content)} className="ml-2 font-semibold underline">
                      Retry
                    </button>
                  </div>
                ) : (
                  <MessageCard data={m.data} onSpeak={speak} />
                )}
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="fade-up flex gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900">
              <Robot size={16} className="text-white" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              <span className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
              </span>
              Agents working…
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="mt-3 flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <button
          data-testid="mic-btn"
          onClick={recording ? stopRecording : startRecording}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
            recording ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
          title="Voice input"
        >
          {recording ? <Stop weight="fill" size={20} /> : <Microphone size={20} />}
        </button>
        <textarea
          data-testid="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={recording ? "Listening…" : "Ask a medical question…"}
          className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
        <button
          data-testid="chat-send-btn"
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
        >
          <PaperPlaneRight weight="fill" size={18} />
        </button>
      </div>

      {/* History drawer */}
      {historyOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setHistoryOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="font-heading font-semibold text-slate-800">Conversation History</h3>
              <button onClick={() => setHistoryOpen(false)} data-testid="close-history-btn">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {history.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-400">No conversations yet.</p>
              )}
              {history.map((conv) => (
                <button
                  key={conv.id}
                  data-testid={`history-item-${conv.id}`}
                  onClick={() => openConversation(conv)}
                  className="w-full rounded-lg border border-slate-200 p-3 text-left transition-colors hover:border-primary"
                >
                  <p className="truncate text-sm font-medium text-slate-800">{conv.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {conv.message_count} message(s) · {new Date(conv.updated_at).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageCard({ data, onSpeak }) {
  if (!data) return null;
  return (
    <>
      {data.execution_steps?.length > 0 && <ExecutionTimeline steps={data.execution_steps} />}

      <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-4">
        {data.emergency && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3">
            <Warning weight="fill" size={18} className="mt-0.5 shrink-0 text-rose-600" />
            <p className="text-sm font-medium text-rose-700">Emergency detected — this is not an emergency service.</p>
          </div>
        )}

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            <Robot size={13} /> {data.agent}
          </span>
          {data.intent && data.intent !== "GENERAL" && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {data.intent}
            </span>
          )}
          {data.confidence_level && data.confidence_level !== "N/A" && (
            <ConfidenceBadge level={data.confidence_level} score={data.confidence_score} />
          )}
          {data.evidence_strength && data.evidence_strength !== "N/A" && (
            <span className="text-xs text-slate-400">Evidence: {data.evidence_strength}</span>
          )}
        </div>

        {data.handoff_reason && (
          <p className="mb-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700">
            ↪ {data.handoff_reason}
          </p>
        )}

        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{data.response}</p>

        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
          <p className="text-[10.5px] text-slate-400">
            AI-generated · not a diagnosis · consult a professional
          </p>
          <button
            data-testid="speak-btn"
            onClick={() => onSpeak(data.response)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <SpeakerHigh size={14} /> Listen
          </button>
        </div>
      </div>

      {data.sources?.length > 0 && <EvidencePanel sources={data.sources} />}
    </>
  );
}
