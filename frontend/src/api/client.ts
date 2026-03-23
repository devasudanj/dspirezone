import axios, { AxiosError } from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Attach token from localStorage automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalise errors
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ detail?: unknown }>) => {
    const detail = err.response?.data?.detail;
    const detailMsg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
        ? detail.map((e: unknown) => (e && typeof e === "object" && "msg" in e ? (e as { msg: string }).msg : JSON.stringify(e))).join("; ")
        : null;
    const msg = detailMsg || err.message || "An unexpected error occurred";
    return Promise.reject(new Error(msg));
  }
);

export default api;
