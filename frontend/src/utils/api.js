import axios from "axios";

const getVisitorId = () => {
  const key = "visitorId";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const generated =
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  localStorage.setItem(key, generated);
  return generated;
};

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const visitorId = getVisitorId();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers["X-Visitor-Id"] = visitorId;
  return config;
});

export default api;
