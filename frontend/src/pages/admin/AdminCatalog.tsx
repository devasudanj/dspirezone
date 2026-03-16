import React, { useEffect, useState } from "react";
import {
  Box, Container, Typography, Paper, Table, TableBody,
  TableCell, TableHead, TableRow, Chip, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, Grid, Alert,
  CircularProgress, IconButton, Stack,
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";
import api from "../../api/client";
import { BRAND } from "../../theme";
import type { CatalogItem } from "../../types";

export default function AdminCatalog() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "service_addon" as CatalogItem["type"],
    price: "",
    price_type: "fixed" as CatalogItem["price_type"],
    unit_label: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchItems = () => {
    setLoading(true);
    api.get<CatalogItem[]>("/admin/catalog").then((r) => setItems(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchItems(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: "", description: "", type: "service_addon" as CatalogItem["type"], price: "", price_type: "fixed" as CatalogItem["price_type"], unit_label: "" });
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (item: CatalogItem) => {
    setEditItem(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      type: item.type,
      price: String(item.price),
      price_type: item.price_type,
      unit_label: item.unit_label ?? "",
    });
    setError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const payload = { ...form, price: parseFloat(form.price) };
    try {
      if (editItem) {
        await api.put(`/admin/catalog/${editItem.id}`, payload);
      } else {
        await api.post("/admin/catalog", payload);
      }
      setDialogOpen(false);
      fetchItems();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Failed to save item.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/admin/catalog/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      setError("Failed to delete item.");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const addons = items.filter((i) => i.type === "service_addon");
  const favors = items.filter((i) => i.type === "favor_essential");

  return (
    <Box sx={{ py: { xs: 4, md: 6 } }}>
      <Container maxWidth="xl">
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h4" fontWeight={800}>Catalog Management</Typography>
          <Button variant="contained" color="primary" startIcon={<Add />} onClick={openCreate}>
            Add Item
          </Button>
        </Box>
        <Typography color="text.secondary" sx={{ mb: 4 }}>Manage service add-ons and favors & essentials.</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          [["Service Add-ons", addons], ["Favors & Essentials", favors]].map(([title, subset]) => (
            <Box key={String(title)} sx={{ mb: 5 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>{String(title)}</Typography>
              <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "background.default" }}>
                        <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Price</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Active</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(subset as CatalogItem[]).map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell><Typography variant="body2" fontWeight={600}>{item.name}</Typography></TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }}>{item.description}</Typography></TableCell>
                          <TableCell>
                            ₹{item.price.toLocaleString("en-IN")}
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                              {item.price_type === "per_hour" ? "/hr" : item.price_type === "per_unit" ? "/unit" : ""}
                            </Typography>
                          </TableCell>
                          <TableCell><Chip label={item.price_type} size="small" /></TableCell>
                          <TableCell>
                            <Chip label={item.active ? "Active" : "Inactive"} color={item.active ? "success" : "default"} size="small" />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              <IconButton size="small" onClick={() => openEdit(item)}><Edit fontSize="small" /></IconButton>
                              <IconButton size="small" color="error" onClick={() => setDeleteConfirm(item.id)}><Delete fontSize="small" /></IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Paper>
            </Box>
          ))
        )}

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle fontWeight={700}>{editItem ? "Edit Catalog Item" : "Add Catalog Item"}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{error}</Alert>}
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField fullWidth required label="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={2} label="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Item Type</InputLabel>
                  <Select value={form.type} label="Item Type" onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as CatalogItem["type"] }))}>
                    <MenuItem value="service_addon">Service Add-on</MenuItem>
                    <MenuItem value="favor_essential">Favor / Essential</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Price Type</InputLabel>
                  <Select value={form.price_type} label="Price Type" onChange={(e) => setForm((p) => ({ ...p, price_type: e.target.value as CatalogItem["price_type"] }))}>
                    <MenuItem value="fixed">Fixed</MenuItem>
                    <MenuItem value="per_hour">Per Hour</MenuItem>
                    <MenuItem value="per_unit">Per Unit</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required label="Price (₹)" type="number" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} inputProps={{ min: 0, step: 0.01 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Unit Label (optional)" placeholder="e.g. per set, per pack" value={form.unit_label} onChange={(e) => setForm((p) => ({ ...p, unit_label: e.target.value }))} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={saving || !form.name || !form.price}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {saving ? "Saving…" : editItem ? "Save Changes" : "Add Item"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete confirmation */}
        <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs">
          <DialogTitle fontWeight={700}>Delete Item?</DialogTitle>
          <DialogContent>
            <Typography>This action cannot be undone. Are you sure you want to delete this catalog item?</Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="contained" color="error" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
