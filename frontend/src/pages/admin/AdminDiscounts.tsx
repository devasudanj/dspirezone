import React, { useEffect, useState } from "react";
import {
  Box, Container, Typography, Paper, Table, TableBody,
  TableCell, TableHead, TableRow, Chip, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  FormControlLabel, Switch, Grid, Alert, CircularProgress,
  IconButton, Stack,
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";
import api from "../../api/client";
import { BRAND } from "../../theme";

interface DiscountCode {
  id: number;
  code: string;
  description: string;
  discount_pct: number;
  active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
}

interface DiscountForm {
  code: string;
  description: string;
  discount_pct: string;
  active: boolean;
  valid_from: string;
  valid_until: string;
}

const emptyForm = (): DiscountForm => ({
  code: "",
  description: "",
  discount_pct: "",
  active: true,
  valid_from: "",
  valid_until: "",
});

export default function AdminDiscounts() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCode, setEditCode] = useState<DiscountCode | null>(null);
  const [form, setForm] = useState<DiscountForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchCodes = () => {
    setLoading(true);
    api
      .get<DiscountCode[]>("/admin/discounts")
      .then((r) => setCodes(r.data))
      .catch(() => setError("Failed to load discount codes."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCodes(); }, []);

  const openCreate = () => {
    setEditCode(null);
    setForm(emptyForm());
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (dc: DiscountCode) => {
    setEditCode(dc);
    setForm({
      code: dc.code,
      description: dc.description ?? "",
      discount_pct: String(dc.discount_pct),
      active: dc.active,
      valid_from: dc.valid_from ?? "",
      valid_until: dc.valid_until ?? "",
    });
    setError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      discount_pct: parseFloat(form.discount_pct),
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
    };
    try {
      if (editCode) {
        await api.patch(`/admin/discounts/${editCode.id}`, payload);
      } else {
        await api.post("/admin/discounts", payload);
      }
      setDialogOpen(false);
      fetchCodes();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Failed to save discount code.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (dc: DiscountCode) => {
    try {
      await api.patch(`/admin/discounts/${dc.id}`, { active: !dc.active });
      fetchCodes();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/admin/discounts/${id}`);
      setDeleteConfirm(null);
      fetchCodes();
    } catch {
      setError("Failed to delete discount code.");
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ color: BRAND.purple }}>
          Discount Codes
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openCreate}
          sx={{ bgcolor: BRAND.purple, "&:hover": { bgcolor: BRAND.purpleLight }, fontWeight: 700 }}
        >
          New Code
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: BRAND.purple }}>
              <TableRow>
                {["Code", "Description", "Discount", "Active", "Valid From", "Valid Until", "Actions"].map((h) => (
                  <TableCell key={h} sx={{ color: "#fff", fontWeight: 700 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {codes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No discount codes yet. Click "New Code" to add one.
                  </TableCell>
                </TableRow>
              ) : (
                codes.map((dc) => (
                  <TableRow key={dc.id} hover>
                    <TableCell>
                      <Typography fontWeight={700} sx={{ fontFamily: "monospace", color: BRAND.purple }}>
                        {dc.code}
                      </Typography>
                    </TableCell>
                    <TableCell>{dc.description || "—"}</TableCell>
                    <TableCell>
                      <Chip label={`${dc.discount_pct}% off`} color="secondary" size="small" sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <Switch
                        size="small"
                        checked={dc.active}
                        onChange={() => void toggleActive(dc)}
                        color="success"
                      />
                    </TableCell>
                    <TableCell>{dc.valid_from ?? "—"}</TableCell>
                    <TableCell>{dc.valid_until ?? "—"}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={() => openEdit(dc)} title="Edit">
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => setDeleteConfirm(dc.id)} title="Delete">
                          <Delete fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: BRAND.purple }}>
          {editCode ? "Edit Discount Code" : "New Discount Code"}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Code"
                fullWidth
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                inputProps={{ maxLength: 30 }}
                placeholder="DZ-APR25"
                disabled={!!editCode}
                helperText={editCode ? "Code cannot be changed" : "Format: DZ-MMMDD"}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Discount %"
                fullWidth
                type="number"
                value={form.discount_pct}
                onChange={(e) => setForm((f) => ({ ...f, discount_pct: e.target.value }))}
                inputProps={{ min: 1, max: 100, step: 1 }}
                placeholder="25"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. April 25% off promotion"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Valid From (optional)"
                fullWidth
                type="date"
                value={form.valid_from}
                onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Valid Until (optional)"
                fullWidth
                type="date"
                value={form.valid_until}
                onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.active}
                    onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                    color="success"
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void handleSave()}
            disabled={saving || !form.code || !form.discount_pct}
            sx={{ bgcolor: BRAND.purple, "&:hover": { bgcolor: BRAND.purpleLight }, fontWeight: 700 }}
          >
            {saving ? <CircularProgress size={18} /> : (editCode ? "Save Changes" : "Create Code")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle fontWeight={700}>Delete Discount Code?</DialogTitle>
        <DialogContent>
          <Typography>This action cannot be undone. Are you sure?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => deleteConfirm !== null && void handleDelete(deleteConfirm)}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
