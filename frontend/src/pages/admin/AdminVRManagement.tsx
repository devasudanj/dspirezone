import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add,
  Edit,
  FileUpload,
  Headset,
  InstallDesktop,
  OndemandVideo,
  SportsEsports,
  Videocam,
} from "@mui/icons-material";
import { BRAND } from "../../theme";
import {
  createGame,
  createHeadset,
  createInstallation,
  fetchGame,
  fetchGames,
  fetchHeadsets,
  fetchInstallations,
  fetchSessions,
  updateGame,
  uploadGameThumbnail,
  uploadGameVideo,
  VR_CATEGORIES,
  VR_STATUSES,
  type InstallationStatus,
  type VRGame,
  type VRGameCategory,
  type VRGamePayload,
  type VRGameStatus,
  type VRHeadset,
  type VRHeadsetPayload,
  type VRInstallation,
  type VRInstallationPayload,
  type VRSession,
} from "../../api/vrClient";

// ─── Shared helpers ───────────────────────────────────────────────────────────

const STATUS_COLOR: Record<
  VRGameStatus | InstallationStatus,
  "success" | "warning" | "error" | "default"
> = {
  ACTIVE: "success",
  EXPIRING_SOON: "warning",
  EXPIRED: "error",
  DISABLED: "default",
};

// ─── Games Tab ───────────────────────────────────────────────────────────────

const emptyGameForm = (): VRGamePayload => ({
  name: "",
  description: "",
  category: "Action",
  thumbnail_url: "",
  youtube_url: "",
  viewable_age: 7,
  is_multiplayer: false,
  status: "ACTIVE",
});

function GamesTab() {
  const [games, setGames] = useState<VRGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGame, setEditGame] = useState<VRGame | null>(null);
  const [form, setForm] = useState<VRGamePayload>(emptyGameForm());
  // Multi-select categories kept separately; category sent to API = selectedCategories[0]
  const [selectedCategories, setSelectedCategories] = useState<VRGameCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Upload state
  const [uploadTarget, setUploadTarget] = useState<{
    game: VRGame;
    type: "thumbnail" | "video";
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchGames({
      category: filterCategory || undefined,
      status: filterStatus || undefined,
    })
      .then((r) => setGames(r.data))
      .catch(() => setError("Failed to load VR games."))
      .finally(() => setLoading(false));
  }, [filterCategory, filterStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditGame(null);
    setSelectedCategories([]);
    setForm(emptyGameForm());
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = async (g: VRGame) => {
    setError(null);
    // Fetch full game detail — the list endpoint only returns id/name/category/thumbnail/status
    let full: VRGame = g;
    try {
      const res = await fetchGame(g.id);
      full = res.data;
    } catch {
      // fall back to list data if detail fetch fails
    }
    setEditGame(full);
    setSelectedCategories(
      full.category && VR_CATEGORIES.includes(full.category as VRGameCategory)
        ? [full.category as VRGameCategory]
        : []
    );
    setForm({
      name: full.name ?? "",
      description: full.description ?? "",
      category: (full.category as VRGameCategory) ?? "Action",
      thumbnail_url: full.thumbnail_url ?? "",
      youtube_url: (full as any).youtube_url ?? (full as any).video_url ?? "",
      viewable_age: full.viewable_age ?? 7,
      is_multiplayer: full.is_multiplayer ?? false,
      status: (full.status as VRGameStatus) ?? "ACTIVE",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const payload: VRGamePayload = {
      ...form,
      // Use first selected category; fall back to form value
      category: selectedCategories[0] ?? form.category,
      thumbnail_url: form.thumbnail_url || undefined,
      youtube_url: form.youtube_url || undefined,
    };
    try {
      if (editGame) {
        await updateGame(editGame.id, payload);
      } else {
        await createGame(payload);
      }
      setDialogOpen(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadFile = (game: VRGame, type: "thumbnail" | "video") => {
    setUploadTarget({ game, type });
    setUploadError(null);
    if (type === "thumbnail") {
      thumbInputRef.current?.click();
    } else {
      videoInputRef.current?.click();
    }
  };

  const handleFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "thumbnail" | "video"
  ) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    setUploading(true);
    setUploadError(null);
    try {
      if (type === "thumbnail") {
        await uploadGameThumbnail(uploadTarget.game.id, file);
      } else {
        await uploadGameVideo(uploadTarget.game.id, file);
      }
      load();
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error ? err.message : "Upload failed."
      );
    } finally {
      setUploading(false);
      setUploadTarget(null);
      // Reset file inputs so the same file can be re-selected if needed
      if (thumbInputRef.current) thumbInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  return (
    <Box>
      {/* Hidden file inputs */}
      <input
        ref={thumbInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFileSelected(e, "thumbnail")}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        style={{ display: "none" }}
        onChange={(e) => handleFileSelected(e, "video")}
      />

      {/* Toolbar */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Category</InputLabel>
            <Select
              label="Category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {VR_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {VR_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openCreate}
          sx={{ bgcolor: BRAND.purple }}
        >
          Add Game
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {uploadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {uploadError}
        </Alert>
      )}
      {uploading && (
        <Alert severity="info" icon={<CircularProgress size={16} />} sx={{ mb: 2 }}>
          Uploading file…
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "background.default" }}>
                  <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Thumbnail</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Age</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Multi</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Views</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {games.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 5, color: "text.secondary" }}>
                      No games found.
                    </TableCell>
                  </TableRow>
                ) : (
                  games.map((g) => (
                    <TableRow key={g.id} hover>
                      <TableCell>{g.id}</TableCell>
                      <TableCell>
                        {g.thumbnail_url ? (
                          <Box
                            component="img"
                            src={g.thumbnail_url}
                            alt={g.name}
                            sx={{
                              width: 48,
                              height: 32,
                              objectFit: "cover",
                              borderRadius: 1,
                              border: "1px solid",
                              borderColor: "divider",
                            }}
                          />
                        ) : (
                          <Avatar
                            variant="rounded"
                            sx={{ width: 48, height: 32, bgcolor: `${BRAND.purple}22`, color: BRAND.purple }}
                          >
                            <SportsEsports fontSize="small" />
                          </Avatar>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {g.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200, display: "block" }}>
                          {g.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={g.category} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={g.status}
                          size="small"
                          color={STATUS_COLOR[g.status]}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>{g.viewable_age}+</TableCell>
                      <TableCell>
                        {g.is_multiplayer ? (
                          <Chip label="Multi" size="small" color="info" />
                        ) : (
                          <Chip label="Solo" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>{g.view_count ?? 0}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Edit game">
                            <IconButton size="small" onClick={() => openEdit(g)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Upload thumbnail">
                            <IconButton
                              size="small"
                              onClick={() => handleUploadFile(g, "thumbnail")}
                              sx={{ color: BRAND.purple }}
                            >
                              <FileUpload fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Upload preview video">
                            <IconButton
                              size="small"
                              onClick={() => handleUploadFile(g, "video")}
                              sx={{ color: BRAND.gold }}
                            >
                              <Videocam fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editGame ? `Edit — ${editGame.name}` : "Add VR Game"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              fullWidth
              multiline
              minRows={2}
            />
            {/* Category — multi-select with checkboxes */}
            <FormControl fullWidth>
              <InputLabel>Categories</InputLabel>
              <Select
                label="Categories"
                multiple
                value={selectedCategories}
                onChange={(e) =>
                  setSelectedCategories(e.target.value as VRGameCategory[])
                }
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {(selected as VRGameCategory[]).map((v) => (
                      <Chip key={v} label={v} size="small" sx={{ bgcolor: `${BRAND.purple}18`, color: BRAND.purple, fontWeight: 600 }} />
                    ))}
                  </Box>
                )}
              >
                {VR_CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}>
                    <Checkbox
                      checked={selectedCategories.includes(c)}
                      size="small"
                      sx={{ mr: 0.5, color: BRAND.purple, "&.Mui-checked": { color: BRAND.purple } }}
                    />
                    <ListItemText primary={c} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={form.status ?? "ACTIVE"}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as VRGameStatus })
                    }
                  >
                    {VR_STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Viewable Age (min)"
                  type="number"
                  value={form.viewable_age ?? 7}
                  onChange={(e) =>
                    setForm({ ...form, viewable_age: parseInt(e.target.value, 10) || 0 })
                  }
                  fullWidth
                  inputProps={{ min: 0, max: 99 }}
                />
              </Grid>
            </Grid>

            <FormControlLabel
              control={
                <Switch
                  checked={form.is_multiplayer ?? false}
                  onChange={(e) =>
                    setForm({ ...form, is_multiplayer: e.target.checked })
                  }
                  color="primary"
                />
              }
              label="Multiplayer mode"
            />

            <TextField
              label="Thumbnail URL (optional)"
              value={form.thumbnail_url ?? ""}
              onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
              fullWidth
              placeholder="https://..."
            />
            <TextField
              label="YouTube URL (optional)"
              value={form.youtube_url ?? ""}
              onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
              fullWidth
              placeholder="https://youtu.be/..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.name}
            sx={{ bgcolor: BRAND.purple }}
          >
            {saving ? <CircularProgress size={18} color="inherit" /> : editGame ? "Save Changes" : "Create Game"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── Headsets Tab ─────────────────────────────────────────────────────────────

const emptyHeadsetForm = (): VRHeadsetPayload => ({
  code: "",
  model: "",
  is_active: true,
});

function HeadsetsTab() {
  const [headsets, setHeadsets] = useState<VRHeadset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<VRHeadsetPayload>(emptyHeadsetForm());
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetchHeadsets()
      .then((r) => setHeadsets(r.data))
      .catch(() => setError("Failed to load headsets."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(emptyHeadsetForm());
    setError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await createHeadset(form);
      setDialogOpen(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openCreate}
          sx={{ bgcolor: BRAND.purple }}
        >
          Add Headset
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "background.default" }}>
                  <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Model</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {headsets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 5, color: "text.secondary" }}>
                      No headsets found.
                    </TableCell>
                  </TableRow>
                ) : (
                  headsets.map((h) => (
                    <TableRow key={h.id} hover>
                      <TableCell>{h.id}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} sx={{ letterSpacing: 1 }}>
                          {h.code}
                        </Typography>
                      </TableCell>
                      <TableCell>{h.model}</TableCell>
                      <TableCell>
                        <Chip
                          label={h.is_active ? "Active" : "Inactive"}
                          size="small"
                          color={h.is_active ? "success" : "default"}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Headset</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              fullWidth
              required
              placeholder="e.g. DZ1"
              inputProps={{ maxLength: 20 }}
            />
            <TextField
              label="Model"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              fullWidth
              required
              placeholder="e.g. Meta Quest 3"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  color="primary"
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.code || !form.model}
            sx={{ bgcolor: BRAND.purple }}
          >
            {saving ? <CircularProgress size={18} color="inherit" /> : "Add Headset"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── Installations Tab ────────────────────────────────────────────────────────

interface InstallFormBase {
  game_id: number;
  install_date: string;
  expiry_date: string;
}

const emptyInstallBase = (gameId: number = 0): InstallFormBase => ({
  game_id: gameId,
  install_date: new Date().toISOString().slice(0, 10),
  expiry_date: "",
});

function InstallationsTab() {
  const [games, setGames] = useState<VRGame[]>([]);
  const [headsets, setHeadsets] = useState<VRHeadset[]>([]);
  const [installations, setInstallations] = useState<VRInstallation[]>([]);
  const [selectedGame, setSelectedGame] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formBase, setFormBase] = useState<InstallFormBase>(emptyInstallBase());
  // Multi-headset selection
  const [selectedHeadsetIds, setSelectedHeadsetIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ done: number; total: number } | null>(null);

  // Build a lookup map so we never rely on API returning headset_code
  const headsetMap = useMemo(
    () => Object.fromEntries(headsets.map((h) => [h.id, h])) as Record<number, VRHeadset>,
    [headsets]
  );

  // Build a set of headset ids already installed on the selected game
  const installedHeadsetIds = useMemo(
    () => new Set(installations.map((i) => i.headset_id)),
    [installations]
  );

  // Load games + headsets once
  useEffect(() => {
    Promise.all([fetchGames(), fetchHeadsets()])
      .then(([gr, hr]) => {
        setGames(gr.data);
        setHeadsets(hr.data);
      })
      .catch(() => setError("Failed to load reference data."))
      .finally(() => setDataLoading(false));
  }, []);

  const loadInstallations = useCallback((gameId: number) => {
    setLoading(true);
    setError(null);
    fetchInstallations(gameId)
      .then((r) => setInstallations(r.data))
      .catch(() => setError("Failed to load installations."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedGame) {
      loadInstallations(selectedGame as number);
    } else {
      setInstallations([]);
    }
  }, [selectedGame, loadInstallations]);

  const openCreate = () => {
    setFormBase(emptyInstallBase(selectedGame || 0));
    setSelectedHeadsetIds([]);
    setError(null);
    setSaveProgress(null);
    setDialogOpen(true);
  };

  const toggleHeadset = (id: number) => {
    setSelectedHeadsetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (selectedHeadsetIds.length === 0 || !formBase.expiry_date) return;
    setSaving(true);
    setError(null);
    setSaveProgress({ done: 0, total: selectedHeadsetIds.length });
    let done = 0;
    const errors: string[] = [];
    for (const headset_id of selectedHeadsetIds) {
      try {
        await createInstallation({
          game_id: formBase.game_id,
          headset_id,
          install_date: formBase.install_date,
          expiry_date: formBase.expiry_date,
        });
        done++;
        setSaveProgress({ done, total: selectedHeadsetIds.length });
      } catch (e: unknown) {
        const hLabel = headsetMap[headset_id]?.code ?? `#${headset_id}`;
        errors.push(`${hLabel}: ${e instanceof Error ? e.message : "failed"}`);
      }
    }
    setSaving(false);
    if (errors.length) {
      setError(errors.join(" | "));
    } else {
      setDialogOpen(false);
    }
    if (selectedGame) loadInstallations(selectedGame as number);
  };

  if (dataLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel>Select Game</InputLabel>
          <Select
            label="Select Game"
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value as number)}
          >
            <MenuItem value="">— choose a game —</MenuItem>
            {games.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                [{g.id}] {g.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openCreate}
          disabled={!selectedGame}
          sx={{ bgcolor: BRAND.purple }}
        >
          Assign Headsets
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : !selectedGame ? (
        <Paper sx={{ borderRadius: 3, p: 6, textAlign: "center" }}>
          <Typography color="text.secondary">Select a game above to view its headset installations.</Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          {/* Summary bar */}
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>{installations.length}</strong> headset{installations.length !== 1 ? "s" : ""} assigned
            </Typography>
          </Box>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "background.default" }}>
                  <TableCell sx={{ fontWeight: 700 }}>Headset Code</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Model</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Active</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Install Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Expiry Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {installations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5, color: "text.secondary" }}>
                      No headsets installed on this game yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  installations.map((inst, idx) => {
                    const hs = headsetMap[inst.headset_id] ?? headsetMap[String(inst.headset_id) as unknown as number];
                    const statusLabel = inst.status ? inst.status.replace(/_/g, " ") : "UNKNOWN";
                    const statusColor: "success" | "warning" | "error" | "default" =
                      STATUS_COLOR[inst.status as InstallationStatus] ?? "default";
                    return (
                      <TableRow key={inst.id ?? idx} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} sx={{ letterSpacing: 1 }}>
                            {hs?.code ?? inst.headset_code ?? `#${inst.headset_id}`}
                          </Typography>
                        </TableCell>
                        <TableCell>{hs?.model ?? "—"}</TableCell>
                        <TableCell>
                          {hs ? (
                            <Chip
                              label={hs.is_active ? "Active" : "Inactive"}
                              size="small"
                              color={hs.is_active ? "success" : "default"}
                            />
                          ) : "—"}
                        </TableCell>
                        <TableCell>{inst.install_date ?? "—"}</TableCell>
                        <TableCell>{inst.expiry_date ?? "—"}</TableCell>
                        <TableCell>
                          <Chip
                            label={statusLabel}
                            size="small"
                            color={statusColor}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* Assign Headsets dialog */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Assign Headsets to Game</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            {/* Game selector */}
            <FormControl fullWidth>
              <InputLabel>Game</InputLabel>
              <Select
                label="Game"
                value={formBase.game_id || ""}
                onChange={(e) => setFormBase({ ...formBase, game_id: e.target.value as number })}
              >
                {games.map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    [{g.id}] {g.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Date range */}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Install Date"
                  type="date"
                  value={formBase.install_date}
                  onChange={(e) => setFormBase({ ...formBase, install_date: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Expiry Date"
                  type="date"
                  value={formBase.expiry_date}
                  onChange={(e) => setFormBase({ ...formBase, expiry_date: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Divider />

            {/* Headset checklist */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="body2" fontWeight={700}>
                  Select Headsets
                  {selectedHeadsetIds.length > 0 && (
                    <Chip
                      label={`${selectedHeadsetIds.length} selected`}
                      size="small"
                      color="primary"
                      sx={{ ml: 1, bgcolor: BRAND.purple }}
                    />
                  )}
                </Typography>
                <Button
                  size="small"
                  onClick={() =>
                    setSelectedHeadsetIds(
                      selectedHeadsetIds.length === headsets.length
                        ? []
                        : headsets.map((h) => h.id)
                    )
                  }
                >
                  {selectedHeadsetIds.length === headsets.length ? "Deselect All" : "Select All"}
                </Button>
              </Stack>
              <Paper variant="outlined" sx={{ borderRadius: 2, maxHeight: 260, overflowY: "auto" }}>
                {headsets.length === 0 ? (
                  <Typography color="text.secondary" sx={{ p: 2 }} variant="body2">
                    No headsets available. Add headsets in the Headsets tab first.
                  </Typography>
                ) : (
                  headsets.map((h) => {
                    const alreadyInstalled = installedHeadsetIds.has(h.id) && formBase.game_id === selectedGame;
                    const checked = selectedHeadsetIds.includes(h.id);
                    return (
                      <MenuItem
                        key={h.id}
                        onClick={() => !alreadyInstalled && toggleHeadset(h.id)}
                        disabled={alreadyInstalled}
                        sx={{
                          px: 1,
                          opacity: alreadyInstalled ? 0.5 : 1,
                          "&.Mui-disabled": { pointerEvents: "auto", cursor: "default" },
                        }}
                      >
                        <Checkbox
                          checked={checked}
                          disableRipple
                          size="small"
                          sx={{ mr: 0.5, color: BRAND.purple, "&.Mui-checked": { color: BRAND.purple } }}
                        />
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" fontWeight={700} sx={{ letterSpacing: 1 }}>
                                {h.code}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {h.model}
                              </Typography>
                            </Stack>
                          }
                          secondary={
                            alreadyInstalled ? (
                              <Typography variant="caption" color="warning.main">Already installed</Typography>
                            ) : h.is_active ? null : (
                              <Typography variant="caption" color="text.disabled">Inactive</Typography>
                            )
                          }
                        />
                      </MenuItem>
                    );
                  })
                )}
              </Paper>
            </Box>

            {saveProgress && (
              <Alert severity="info" icon={<CircularProgress size={16} />}>
                Creating installations… {saveProgress.done} / {saveProgress.total}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || selectedHeadsetIds.length === 0 || !formBase.game_id || !formBase.expiry_date}
            sx={{ bgcolor: BRAND.purple }}
          >
            {saving
              ? <CircularProgress size={18} color="inherit" />
              : `Assign ${selectedHeadsetIds.length || ""} Headset${selectedHeadsetIds.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── Sessions Tab ─────────────────────────────────────────────────────────────

function SessionsTab() {
  const [sessions, setSessions] = useState<VRSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<VRSession | null>(null);

  useEffect(() => {
    fetchSessions()
      .then((r) => setSessions(r.data))
      .catch(() => setError("Failed to load sessions."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "background.default" }}>
                  <TableCell sx={{ fontWeight: 700 }}>Session Code</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Game</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Headsets</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Created At</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Detail</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5, color: "text.secondary" }}>
                      No sessions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} sx={{ letterSpacing: 1 }}>
                          {s.session_code}
                        </Typography>
                      </TableCell>
                      <TableCell>{s.game_name}</TableCell>
                      <TableCell>{s.duration_minutes} min</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {s.headset_codes.map((hc) => (
                            <Chip key={hc} label={hc} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {new Date(s.created_at).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setDetail(s)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* Session detail dialog */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Session — {detail?.session_code}
        </DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="caption" color="text.secondary">Game</Typography>
                <Typography fontWeight={700}>{detail.game_name}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Duration</Typography>
                <Typography fontWeight={700}>{detail.duration_minutes} minutes</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Headsets</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                  {detail.headset_codes.map((hc) => (
                    <Chip key={hc} label={hc} size="small" />
                  ))}
                </Stack>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Created At</Typography>
                <Typography fontWeight={700}>
                  {new Date(detail.created_at).toLocaleString("en-IN", {
                    dateStyle: "long",
                    timeStyle: "medium",
                  })}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDetail(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { label: "Games", icon: <SportsEsports /> },
  { label: "Headsets", icon: <Headset /> },
  { label: "Installations", icon: <InstallDesktop /> },
  { label: "Sessions", icon: <OndemandVideo /> },
];

export default function AdminVRManagement() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ py: { xs: 4, md: 6 } }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
          <Avatar sx={{ bgcolor: `${BRAND.purple}22`, color: BRAND.purple, width: 48, height: 48 }}>
            <SportsEsports />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight={800}>
              VR Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage VR games, headsets, installations, and sessions.
            </Typography>
          </Box>
        </Stack>

        {/* Tabs */}
        <Paper sx={{ borderRadius: 3, mt: 4, overflow: "hidden" }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: "1px solid",
              borderColor: "divider",
              "& .MuiTab-root": { fontWeight: 700, minHeight: 56 },
              "& .Mui-selected": { color: BRAND.purple },
              "& .MuiTabs-indicator": { bgcolor: BRAND.purple },
            }}
          >
            {TABS.map((t) => (
              <Tab key={t.label} label={t.label} icon={t.icon} iconPosition="start" />
            ))}
          </Tabs>

          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {tab === 0 && <GamesTab />}
            {tab === 1 && <HeadsetsTab />}
            {tab === 2 && <InstallationsTab />}
            {tab === 3 && <SessionsTab />}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
