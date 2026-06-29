import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { SportsEsports } from "@mui/icons-material";
import { BRAND } from "../../theme";
import {
  createNexSession,
  fetchNexGame,
  fetchNexGames,
  fetchNexSession,
  fetchNexStations,
  recordNexGameVisit,
  type NexGame,
  type NexGameStatus,
  type NexSession,
  type NexStation,
  type NexStationStatus,
} from "../../api/nexClient";

function GamesTab({ stations }: { stations: NexStation[] }) {
  const [games, setGames] = useState<NexGame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"" | NexGameStatus>("");
  const [stationId, setStationId] = useState<number | "">("");
  const [query, setQuery] = useState("");
  const [details, setDetails] = useState<NexGame | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchNexGames({
      status: status || undefined,
      stationId: stationId || undefined,
      q: query || undefined,
    })
      .then((res) => setGames(Array.isArray(res.data?.items) ? res.data.items : []))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load NEX games"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, stationId]);

  const stationList = Array.isArray(stations) ? stations : [];
  const stationName = useMemo(
    () => Object.fromEntries(stationList.map((s) => [s.id, `${s.code} - ${s.name}`])),
    [stationList]
  );

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as "" | NexGameStatus)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Station</InputLabel>
          <Select label="Station" value={stationId} onChange={(e) => setStationId(e.target.value as number | "")}> 
            <MenuItem value="">All</MenuItem>
            {stationList.map((s) => (
              <MenuItem key={s.id} value={s.id}>{s.code} - {s.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={load}>Apply</Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Station</TableCell>
                <TableCell>Available</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {games.map((g) => (
                <TableRow key={g.id} hover>
                  <TableCell>{g.id}</TableCell>
                  <TableCell>{g.name}</TableCell>
                  <TableCell><Chip size="small" label={g.status} /></TableCell>
                  <TableCell>{g.station_id ? stationName[g.station_id] : "-"}</TableCell>
                  <TableCell>{g.is_available ? "Yes" : "No"}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" onClick={async () => {
                        const r = await fetchNexGame(g.id);
                        setDetails(r.data);
                      }}>Details</Button>
                      <Button
                        size="small"
                        onClick={async () => {
                          await recordNexGameVisit(g.id, { source: "admin_portal" });
                          load();
                        }}
                      >
                        Record Visit
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={!!details} onClose={() => setDetails(null)} maxWidth="sm" fullWidth>
        <DialogTitle>NEX Game Details</DialogTitle>
        <DialogContent dividers>
          {details && (
            <Stack spacing={1}>
              <Typography><strong>ID:</strong> {details.id}</Typography>
              <Typography><strong>Name:</strong> {details.name}</Typography>
              <Typography><strong>Description:</strong> {details.description || "-"}</Typography>
              <Typography><strong>Status:</strong> {details.status}</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetails(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function StationsTab({ stations, loading }: { stations: NexStation[]; loading: boolean }) {
  if (loading) {
    return <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}><CircularProgress /></Box>;
  }

  return (
    <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Code</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Available</TableCell>
            <TableCell>Capabilities</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {stations.map((s) => (
            <TableRow key={s.id} hover>
              <TableCell>{s.id}</TableCell>
              <TableCell>{s.code}</TableCell>
              <TableCell>{s.name}</TableCell>
              <TableCell><Chip size="small" label={s.status} /></TableCell>
              <TableCell>{s.is_available ? "Yes" : "No"}</TableCell>
              <TableCell>{s.capabilities || "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

function SessionsTab({ games, stations }: { games: NexGame[]; stations: NexStation[] }) {
  const [form, setForm] = useState({
    game_id: 0,
    station_id: 0,
    participant_name: "",
    participant_count: 1,
    start_at: "",
    end_at: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<NexSession | null>(null);
  const [lookupId, setLookupId] = useState("");

  const handleCreate = async () => {
    setError(null);
    try {
      const res = await createNexSession({
        ...form,
        notes: form.notes || undefined,
      });
      setCreated(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create session");
    }
  };

  const handleLookup = async () => {
    if (!lookupId) return;
    setError(null);
    try {
      const res = await fetchNexSession(Number(lookupId));
      setCreated(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch session");
    }
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Create NEX Session</Typography>
          <Stack spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Game</InputLabel>
              <Select label="Game" value={form.game_id} onChange={(e) => setForm({ ...form, game_id: Number(e.target.value) })}>
                <MenuItem value={0} disabled>Select game</MenuItem>
                {games.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Station</InputLabel>
              <Select label="Station" value={form.station_id} onChange={(e) => setForm({ ...form, station_id: Number(e.target.value) })}>
                <MenuItem value={0} disabled>Select station</MenuItem>
                {stations.map((s) => <MenuItem key={s.id} value={s.id}>{s.code} - {s.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Participant Name" value={form.participant_name} onChange={(e) => setForm({ ...form, participant_name: e.target.value })} />
            <TextField size="small" label="Participant Count" type="number" value={form.participant_count} onChange={(e) => setForm({ ...form, participant_count: Number(e.target.value) || 1 })} />
            <TextField size="small" type="datetime-local" label="Start" InputLabelProps={{ shrink: true }} value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
            <TextField size="small" type="datetime-local" label="End" InputLabelProps={{ shrink: true }} value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
            <TextField size="small" label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} multiline minRows={2} />
            <Button variant="contained" sx={{ bgcolor: BRAND.purple }} onClick={handleCreate}>Create Session</Button>
          </Stack>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Find Session</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <TextField size="small" label="Session ID" value={lookupId} onChange={(e) => setLookupId(e.target.value)} />
            <Button variant="outlined" onClick={handleLookup}>Fetch</Button>
          </Stack>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {created && (
            <Stack spacing={1}>
              <Typography><strong>ID:</strong> {created.id}</Typography>
              <Typography><strong>Game:</strong> {created.game?.name || created.game_id}</Typography>
              <Typography><strong>Station:</strong> {created.station?.name || created.station_id}</Typography>
              <Typography><strong>Participants:</strong> {created.participant_name} ({created.participant_count})</Typography>
              <Typography><strong>Window:</strong> {created.start_at} to {created.end_at}</Typography>
              <Typography><strong>Status:</strong> {created.status}</Typography>
            </Stack>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
}

export default function AdminNEXManagement() {
  const [tab, setTab] = useState(0);
  const [stations, setStations] = useState<NexStation[]>([]);
  const [games, setGames] = useState<NexGame[]>([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRefData = async () => {
    setError(null);
    try {
      const [stationsRes, gamesRes] = await Promise.all([
        fetchNexStations({ status: "active" as NexStationStatus }),
        fetchNexGames({ page_size: 100 }),
      ]);
      setStations(Array.isArray(stationsRes.data) ? stationsRes.data : []);
      setGames(Array.isArray(gamesRes.data?.items) ? gamesRes.data.items : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load NEX reference data");
    } finally {
      setLoadingStations(false);
    }
  };

  useEffect(() => {
    loadRefData();
  }, []);

  return (
    <Box sx={{ py: { xs: 4, md: 6 } }}>
      <Container maxWidth="xl">
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <SportsEsports sx={{ color: BRAND.purple }} />
          <Typography variant="h4" fontWeight={800}>NEX Playground Games</Typography>
        </Stack>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Manage NEX games, stations, sessions, and visit activity.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper sx={{ borderRadius: 3, mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="NEX Games" />
            <Tab label="NEX Stations" />
            <Tab label="NEX Sessions" />
          </Tabs>
        </Paper>

        {tab === 0 && <GamesTab stations={stations} />}
        {tab === 1 && <StationsTab stations={stations} loading={loadingStations} />}
        {tab === 2 && <SessionsTab games={games} stations={stations} />}
      </Container>
    </Box>
  );
}
