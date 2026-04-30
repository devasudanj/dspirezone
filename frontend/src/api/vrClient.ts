import axios, { AxiosError } from "axios";

const VR_BASE_URL = "https://dspirezone-vr-app.azurewebsites.net";

const vrApi = axios.create({
  baseURL: VR_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Normalise errors
vrApi.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ detail?: unknown }>) => {
    const detail = err.response?.data?.detail;
    const detailMsg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
        ? detail
            .map((e: unknown) =>
              e && typeof e === "object" && "msg" in e
                ? (e as { msg: string }).msg
                : JSON.stringify(e)
            )
            .join("; ")
        : null;
    const msg = detailMsg || err.message || "An unexpected error occurred";
    return Promise.reject(new Error(msg));
  }
);

// ─── Games ───────────────────────────────────────────────────────────────────

export interface VRGame {
  id: number;
  name: string;
  description: string;
  category: VRGameCategory;
  thumbnail_url: string | null;
  youtube_url: string | null;
  viewable_age: number;
  is_multiplayer: boolean;
  status: VRGameStatus;
  view_count?: number;
}

export type VRGameCategory =
  | "Action"
  | "Adventure"
  | "Kids"
  | "Horror"
  | "Educational"
  | "Sports"
  | "Simulation"
  | "Puzzle"
  | "Other";

export type VRGameStatus = "ACTIVE" | "EXPIRED" | "DISABLED";

export interface VRGamePayload {
  name: string;
  description: string;
  category: VRGameCategory;
  thumbnail_url?: string;
  youtube_url?: string;
  viewable_age: number;
  is_multiplayer: boolean;
  status: VRGameStatus;
}

export const fetchGames = (params?: { category?: string; status?: string }) =>
  vrApi.get<VRGame[]>("/games/", { params });

export const fetchGame = (id: number) => vrApi.get<VRGame>(`/games/${id}`);

export const createGame = (payload: VRGamePayload) =>
  vrApi.post<VRGame>("/admin/games", payload);

export const updateGame = (id: number, payload: Partial<VRGamePayload>) =>
  vrApi.patch<VRGame>(`/admin/games/${id}`, payload);

export const uploadGameThumbnail = (id: number, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return vrApi.post<VRGame>(`/admin/games/${id}/upload-thumbnail`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const uploadGameVideo = (id: number, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return vrApi.post<VRGame>(`/admin/games/${id}/upload-video`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ─── Headsets ────────────────────────────────────────────────────────────────

export interface VRHeadset {
  id: number;
  code: string;
  model: string;
  is_active: boolean;
}

export interface VRHeadsetPayload {
  code: string;
  model: string;
  is_active: boolean;
}

export const fetchHeadsets = () => vrApi.get<VRHeadset[]>("/headsets/");

export const createHeadset = (payload: VRHeadsetPayload) =>
  vrApi.post<VRHeadset>("/admin/headsets", payload);

// ─── Installations ────────────────────────────────────────────────────────────

export type InstallationStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";

export interface VRInstallation {
  id: number;
  game_id: number;
  game_name?: string;
  headset_id: number;
  headset_code?: string;
  install_date: string;
  expiry_date: string;
  status: InstallationStatus;
}

export interface VRInstallationPayload {
  game_id: number;
  headset_id: number;
  install_date: string;
  expiry_date: string;
}

export const fetchInstallations = (gameId: number) =>
  vrApi.get<VRInstallation[]>(`/games/${gameId}/installations`);

export const createInstallation = (payload: VRInstallationPayload) =>
  vrApi.post<VRInstallation>("/admin/installations", payload);

// ─── Sessions ────────────────────────────────────────────────────────────────

export interface VRSession {
  id: number;
  session_code: string;
  game_name: string;
  duration_minutes: number;
  headset_codes: string[];
  created_at: string;
}

export const fetchSessions = () => vrApi.get<VRSession[]>("/sessions/");

export const fetchSession = (id: number) =>
  vrApi.get<VRSession>(`/sessions/${id}`);

export const VR_CATEGORIES: VRGameCategory[] = [
  "Action",
  "Adventure",
  "Kids",
  "Horror",
  "Educational",
  "Sports",
  "Simulation",
  "Puzzle",
  "Other",
];

export const VR_STATUSES: VRGameStatus[] = ["ACTIVE", "EXPIRED", "DISABLED"];
