import api from "./client";

export type NexGameStatus = "active" | "inactive";
export type NexStationStatus = "active" | "inactive" | "maintenance";
export type NexSessionStatus = "scheduled" | "completed" | "cancelled";

export interface NexGame {
  id: number;
  name: string;
  description: string | null;
  status: NexGameStatus;
  is_available: boolean;
  station_id: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface NexStation {
  id: number;
  code: string;
  name: string;
  status: NexStationStatus;
  is_available: boolean;
  capabilities: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface NexSession {
  id: number;
  game_id: number;
  station_id: number;
  user_id: number | null;
  participant_name: string;
  participant_count: number;
  start_at: string;
  end_at: string;
  status: NexSessionStatus;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  game?: NexGame;
  station?: NexStation;
}

export interface NexGamesResponse {
  items: NexGame[];
  total: number;
  page: number;
  page_size: number;
}

export interface NexGameVisitPayload {
  session_id?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface NexGameVisitResponse {
  success: boolean;
  visit_id: number;
}

export interface CreateNexSessionPayload {
  game_id: number;
  station_id: number;
  participant_name: string;
  participant_count: number;
  start_at: string;
  end_at: string;
  notes?: string;
}

export const fetchNexGames = (params?: {
  page?: number;
  page_size?: number;
  status?: NexGameStatus;
  stationId?: number;
  q?: string;
}) => api.get<NexGamesResponse>("/nex-games/", { params });

export const fetchNexGame = (id: number) => api.get<NexGame>(`/nex-games/${id}`);

export const recordNexGameVisit = (id: number, payload: NexGameVisitPayload) =>
  api.post<NexGameVisitResponse>(`/nex-games/${id}/visit`, payload);

export const fetchNexStations = (params?: {
  status?: NexStationStatus;
  available?: boolean;
}) => api.get<NexStation[]>("/nex-stations/", { params });

export const createNexSession = (payload: CreateNexSessionPayload) =>
  api.post<NexSession>("/nex-sessions/", payload);

export const fetchNexSession = (id: number) => api.get<NexSession>(`/nex-sessions/${id}`);
