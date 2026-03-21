import React, { useEffect, useState } from "react";
import {
  Box, Container, Typography, Grid, TextField, Button,
  Paper, Alert, CircularProgress, Divider, Chip, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select,
  FormControl, InputLabel,
} from "@mui/material";
import { Save, Add, Delete, EditCalendar } from "@mui/icons-material";
import api from "../../api/client";
import { BRAND } from "../../theme";
import type { Venue } from "../../types";

interface AvailabilityRule {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface BlackoutDate {
  id: number;
  date: string;
  reason: string | null;
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AdminVenue() {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [blackouts, setBlackouts] = useState<BlackoutDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Venue form
  const [form, setForm] = useState<Partial<Venue>>({});

  // Blackout form
  const [blackoutDialog, setBlackoutDialog] = useState(false);
  const [blackoutForm, setBlackoutForm] = useState({ date: "", reason: "" });

  // Availability rule form
  const [ruleDialog, setRuleDialog] = useState(false);
  const [ruleForm, setRuleForm] = useState({ day_of_week: "0", open_time: "10:00", close_time: "21:00" });

  useEffect(() => {
    Promise.all([
      api.get<Venue>("/admin/venue"),
      api.get<AvailabilityRule[]>("/admin/availability-rules"),
      api.get<BlackoutDate[]>("/admin/blackouts"),
    ]).then(([vRes, aRes, bRes]) => {
      setVenue(vRes.data);
      setForm(vRes.data);
      setRules(aRes.data.sort((left, right) => left.day_of_week - right.day_of_week || left.start_time.localeCompare(right.start_time)));
      setBlackouts(bRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleVenueSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await api.patch<Venue>("/admin/venue", form);
      setVenue(res.data);
      setForm(res.data);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save venue settings.");
    } finally {
      setSaving(false);
    }
  };

  const addRule = async () => {
    try {
      const res = await api.post<AvailabilityRule>("/admin/availability-rules", {
        day_of_week: Number(ruleForm.day_of_week),
        start_time: ruleForm.open_time,
        end_time: ruleForm.close_time,
      });
      setRules((prev) => [...prev, res.data].sort((left, right) => left.day_of_week - right.day_of_week || left.start_time.localeCompare(right.start_time)));
      setRuleDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add rule.");
    }
  };

  const deleteRule = async (id: number) => {
    try {
      await api.delete(`/admin/availability-rules/${id}`);
      setRules((p) => p.filter((r) => r.id !== id));
    } catch {
      setError("Failed to delete rule.");
    }
  };

  const addBlackout = async () => {
    try {
      const res = await api.post<BlackoutDate>("/admin/blackouts", blackoutForm);
      setBlackouts((p) => [...p, res.data]);
      setBlackoutDialog(false);
      setBlackoutForm({ date: "", reason: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add blackout date.");
    }
  };

  const deleteBlackout = async (id: number) => {
    try {
      await api.delete(`/admin/blackouts/${id}`);
      setBlackouts((p) => p.filter((b) => b.id !== id));
    } catch {
      setError("Failed to delete blackout.");
    }
  };

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ py: { xs: 4, md: 6 } }}>
      <Container maxWidth="lg">
        <Typography variant="h4" fontWeight={800} gutterBottom>Venue Configuration</Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>Manage venue settings, availability rules, and blocked dates.</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>Venue settings saved successfully.</Alert>}

        {/* ── Venue Settings ──────────────────────────────────────────────────── */}
        <Paper sx={{ p: { xs: 2, md: 4 }, mb: 5, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>Venue Settings</Typography>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <TextField fullWidth label="Venue Name" value={form.name ?? ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth type="number" label="Base Hourly Rate (₹)" value={form.base_hourly_rate ?? ""} onChange={(e) => setForm((p) => ({ ...p, base_hourly_rate: parseFloat(e.target.value) }))} inputProps={{ min: 0 }} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth type="number" label="Buffer Minutes" value={form.buffer_minutes ?? ""} onChange={(e) => setForm((p) => ({ ...p, buffer_minutes: parseInt(e.target.value) }))} inputProps={{ min: 0 }} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth type="number" label="Min Booking Hours" value={form.min_hours ?? ""} onChange={(e) => setForm((p) => ({ ...p, min_hours: parseInt(e.target.value) }))} inputProps={{ min: 1 }} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth type="number" label="Included Rooms (free)" value={form.included_rooms_count ?? ""} onChange={(e) => setForm((p) => ({ ...p, included_rooms_count: parseInt(e.target.value) }))} inputProps={{ min: 0 }} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth type="number" label="Extra Room Rate (₹/hr)" value={form.extra_room_hourly_rate ?? ""} onChange={(e) => setForm((p) => ({ ...p, extra_room_hourly_rate: parseFloat(e.target.value) }))} inputProps={{ min: 0 }} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth type="number" label="Food Court Table Rate (₹)" value={form.foodcourt_table_rate ?? ""} onChange={(e) => setForm((p) => ({ ...p, foodcourt_table_rate: parseFloat(e.target.value) }))} inputProps={{ min: 0 }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Address" value={form.address ?? ""} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={3} label="Description" value={form.description ?? ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </Grid>
          </Grid>
          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
              onClick={handleVenueSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Settings"}
            </Button>
          </Box>
        </Paper>

        {/* ── Availability Rules ──────────────────────────────────────────────── */}
        <Paper sx={{ p: { xs: 2, md: 4 }, mb: 5, borderRadius: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>Opening Hours / Availability Rules</Typography>
            <Button variant="outlined" size="small" startIcon={<Add />} onClick={() => setRuleDialog(true)}>
              Add Rule
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "background.default" }}>
                <TableCell sx={{ fontWeight: 700 }}>Day</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Open</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Close</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{DAY_NAMES[r.day_of_week]}</TableCell>
                  <TableCell>{r.start_time}</TableCell>
                  <TableCell>{r.end_time}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" onClick={() => deleteRule(r.id)}><Delete fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {rules.length === 0 && (
                <TableRow><TableCell colSpan={4} sx={{ textAlign: "center", color: "text.secondary" }}>No rules yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        {/* ── Blackout Dates ──────────────────────────────────────────────────── */}
        <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>Blackout Dates</Typography>
            <Button variant="outlined" size="small" startIcon={<Add />} onClick={() => setBlackoutDialog(true)}>
              Add Blackout
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {blackouts.map((b) => (
              <Chip
                key={b.id}
                label={`${b.date}${b.reason ? ` — ${b.reason}` : ""}`}
                onDelete={() => deleteBlackout(b.id)}
                color="error"
                variant="outlined"
              />
            ))}
            {blackouts.length === 0 && <Typography color="text.secondary">No blackout dates.</Typography>}
          </Stack>
        </Paper>

        {/* Add Rule Dialog */}
        <Dialog open={ruleDialog} onClose={() => setRuleDialog(false)} maxWidth="xs" fullWidth>
          <DialogTitle fontWeight={700}>Add Availability Rule</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Day of Week</InputLabel>
                  <Select value={ruleForm.day_of_week} label="Day of Week" onChange={(e) => setRuleForm((p) => ({ ...p, day_of_week: String(e.target.value) }))}>
                    {DAY_NAMES.map((d, i) => <MenuItem key={i} value={String(i)}>{d}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Open Time" type="time" value={ruleForm.open_time} onChange={(e) => setRuleForm((p) => ({ ...p, open_time: e.target.value }))} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Close Time" type="time" value={ruleForm.close_time} onChange={(e) => setRuleForm((p) => ({ ...p, close_time: e.target.value }))} InputLabelProps={{ shrink: true }} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setRuleDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={addRule}>Add</Button>
          </DialogActions>
        </Dialog>

        {/* Add Blackout Dialog */}
        <Dialog open={blackoutDialog} onClose={() => setBlackoutDialog(false)} maxWidth="xs" fullWidth>
          <DialogTitle fontWeight={700}>Add Blackout Date</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField fullWidth required label="Date" type="date" InputLabelProps={{ shrink: true }} value={blackoutForm.date} onChange={(e) => setBlackoutForm((p) => ({ ...p, date: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Reason (optional)" value={blackoutForm.reason} onChange={(e) => setBlackoutForm((p) => ({ ...p, reason: e.target.value }))} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setBlackoutDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={addBlackout} disabled={!blackoutForm.date}>Add</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
