import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API });

// Friendly error extraction
const err = (e, fallback) => {
  const detail = e?.response?.data?.detail;
  return typeof detail === "string" ? detail : fallback;
};

export const api = {
  health: () => client.get("/health").then((r) => r.data),
  config: () => client.get("/config").then((r) => r.data),
  dashboard: () => client.get("/dashboard").then((r) => r.data),
  analytics: () => client.get("/analytics").then((r) => r.data),

  chat: (payload) =>
    client.post("/chat", payload).then((r) => r.data).catch((e) => {
      throw new Error(err(e, "The AI assistant is temporarily unavailable. Please try again."));
    }),

  conversations: () => client.get("/conversations").then((r) => r.data),

  documents: () => client.get("/documents").then((r) => r.data),
  uploadDocument: (file, onProgress) => {
    const fd = new FormData();
    fd.append("file", file);
    return client
      .post("/documents/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: onProgress,
      })
      .then((r) => r.data)
      .catch((e) => {
        throw new Error(err(e, "Could not upload the document. Please try a different PDF."));
      });
  },
  deleteDocument: (id) =>
    client.delete(`/documents/${id}`).then((r) => r.data).catch((e) => {
      throw new Error(err(e, "Could not delete the document."));
    }),
  queryDocument: (id, query) =>
    client.post(`/documents/${id}/query`, { query }).then((r) => r.data).catch((e) => {
      throw new Error(err(e, "Could not query the document. Please retry."));
    }),

  webSearch: (query) =>
    client.post("/web-search", { query }).then((r) => r.data).catch((e) => {
      throw new Error(err(e, "Web search failed. Please retry."));
    }),

  imaging: (modality, file, onProgress) => {
    const fd = new FormData();
    fd.append("file", file);
    const route = {
      CHEST_XRAY: "chest-xray",
      SKIN_LESION: "skin-lesion",
      BRAIN_TUMOR: "brain-tumor",
    }[modality];
    return client
      .post(`/imaging/${route}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: onProgress,
      })
      .then((r) => r.data)
      .catch((e) => {
        throw new Error(err(e, "Image analysis failed. Please upload a valid image."));
      });
  },

  reviews: () => client.get("/reviews").then((r) => r.data),
  approveReview: (id, note) => client.post(`/reviews/${id}/approve`, { note }).then((r) => r.data),
  rejectReview: (id, note) => client.post(`/reviews/${id}/reject`, { note }).then((r) => r.data),
  secondReview: (id, note) => client.post(`/reviews/${id}/second-review`, { note }).then((r) => r.data),

  transcribe: (blob) => {
    const fd = new FormData();
    fd.append("file", blob, "audio.webm");
    return client.post("/voice/transcribe", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data).catch((e) => {
      throw new Error(err(e, "Voice transcription is not available."));
    });
  },
  speak: (text) =>
    client.post("/voice/speak", { text }).then((r) => r.data).catch((e) => {
      throw new Error(err(e, "Text-to-speech is not available."));
    }),
};

client.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.login = (username, password) => {
  const params = new URLSearchParams();
  params.append("username", username);
  params.append("password", password);
  return client.post("/auth/login", params).then(r => r.data);
};
api.register = (username, password) => client.post("/auth/register", { username, password }).then(r => r.data);
api.me = () => client.get("/auth/me").then(r => r.data);
