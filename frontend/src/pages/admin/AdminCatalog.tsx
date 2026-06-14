import React, { useEffect, useRef, useState } from "react";
import {
  Box, Container, Typography, Paper, Table, TableBody,
  TableCell, TableHead, TableRow, Chip, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, Grid, Alert,
  CircularProgress, IconButton, Stack, Switch, FormControlLabel,
  Divider, Tooltip, Avatar,
} from "@mui/material";
import { Add, Edit, Delete, Restaurant, FileUpload } from "@mui/icons-material";
import api from "../../api/client";
import { BRAND } from "../../theme";
import type { CatalogItem } from "../../types";

interface FoodForm {
  name: string;
  description: string;
  price: string;
  unit_label: string;
  emoji: string;
  shared: boolean;
  step: string;
  bg_color: string;
  price_label: string;
  active: boolean;
  sort_order: string;
  category: string;
  min_order_qty: string;
}

const emptyFoodForm = (): FoodForm => ({
  name: "",
  description: "",
  price: "",
  unit_label: "item",
  emoji: "🍽️",
  shared: false,
  step: "1",
  bg_color: "#f5f5f5",
  price_label: "",
  active: true,
  sort_order: "0",
  category: "",
  min_order_qty: "10",
});

export default function AdminCatalog() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ── Catalog (addon / favor) dialog ──
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
  // ── Food menu dialog ──
  const [foodDialogOpen, setFoodDialogOpen] = useState(false);
  const [editFood, setEditFood] = useState<CatalogItem | null>(null);
  const [foodForm, setFoodForm] = useState<FoodForm>(emptyFoodForm());
  const [foodSaving, setFoodSaving] = useState(false);
  const [foodError, setFoodError] = useState<string | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [uploadTargetSlot, setUploadTargetSlot] = useState<1 | 2 | 3 | null>(null);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<{ 1: string | null; 2: string | null; 3: string | null }>({
    1: null,
    2: null,
    3: null,
  });
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = () => {
    setLoading(true);
    api.get<CatalogItem[]>("/admin/catalog?active_only=false")
      .then((r) => setItems(r.data))
      .catch(() => setError("Failed to load catalog items."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchItems(); }, []);

  // ─── Catalog CRUD ────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditItem(null);
    setForm({ name: "", description: "", type: "service_addon", price: "", price_type: "fixed", unit_label: "" });
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
        await api.patch(`/admin/catalog/${editItem.id}`, payload);
      } else {
        await api.post("/admin/catalog", payload);
      }
      setDialogOpen(false);
      fetchItems();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save item.");
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

  // ─── Food CRUD ────────────────────────────────────────────────────────────
  const openFoodCreate = () => {
    setEditFood(null);
    setFoodForm(emptyFoodForm());
    setFoodError(null);
    setUploadedImageUrls({ 1: null, 2: null, 3: null });
    setFoodDialogOpen(true);
  };

  const openFoodEdit = (item: CatalogItem) => {
    setEditFood(item);
    setFoodForm({
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      unit_label: item.unit_label ?? "item",
      emoji: item.emoji ?? "🍽️",
      shared: item.shared ?? false,
      step: String(item.step ?? 1),
      bg_color: item.bg_color ?? "#f5f5f5",
      price_label: item.price_label ?? "",
      active: item.active,
      sort_order: String(item.sort_order),
      category: item.category ?? "",
      min_order_qty: String(item.min_order_qty ?? 10),
    });
    setUploadedImageUrls({
      1: item.thumbnail_url ?? null,
      2: item.image_url_2 ?? null,
      3: item.image_url_3 ?? null,
    });
    setFoodError(null);
    setFoodDialogOpen(true);
  };

  const handleFoodSave = async () => {
    setFoodSaving(true);
    setFoodError(null);
    const payload = {
      name: foodForm.name,
      description: foodForm.description || undefined,
      type: "food_item" as CatalogItem["type"],
      price_type: "fixed" as CatalogItem["price_type"],
      unit_label: foodForm.unit_label || "item",
      price: parseFloat(foodForm.price),
      active: foodForm.active,
      sort_order: parseInt(foodForm.sort_order, 10) || 0,
      emoji: foodForm.emoji || undefined,
      shared: foodForm.shared,
      step: parseInt(foodForm.step, 10) || 1,
      bg_color: foodForm.bg_color || undefined,
      price_label: foodForm.price_label || undefined,
      thumbnail_url: uploadedImageUrls[1] ?? "",
      image_url_2: uploadedImageUrls[2] ?? "",
      image_url_3: uploadedImageUrls[3] ?? "",
      category: foodForm.category || null,
      min_order_qty: parseInt(foodForm.min_order_qty, 10) || 10,
    };
    try {
      if (editFood) {
        await api.patch(`/admin/catalog/${editFood.id}`, payload);
      } else {
        await api.post("/admin/catalog", payload);
      }
      setFoodDialogOpen(false);
      fetchItems();
    } catch (err: unknown) {
      setFoodError(err instanceof Error ? err.message : "Failed to save food item.");
    } finally {
      setFoodSaving(false);
    }
  };

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editFood || !uploadTargetSlot) return;
    setUploadingSlot(uploadTargetSlot);
    setFoodError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post<CatalogItem>(`/admin/catalog/${editFood.id}/upload-image/${uploadTargetSlot}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadedImageUrls({
        1: res.data.thumbnail_url ?? null,
        2: res.data.image_url_2 ?? null,
        3: res.data.image_url_3 ?? null,
      });
      fetchItems();
    } catch (err: unknown) {
      setFoodError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingSlot(null);
      setUploadTargetSlot(null);
      if (thumbInputRef.current) thumbInputRef.current.value = "";
    }
  };

  const addons = items.filter((i) => i.type === "service_addon");
  const favors = items.filter((i) => i.type === "favor_essential");
  const foodItems = items.filter((i) => i.type === "food_item");

  return (
    <Box sx={{ py: { xs: 4, md: 6 } }}>
      <Container maxWidth="xl">
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h4" fontWeight={800}>Catalog Management</Typography>
          <Button variant="contained" color="primary" startIcon={<Add />} onClick={openCreate}>
            Add Item
          </Button>
        </Box>
        <Typography color="text.secondary" sx={{ mb: 4 }}>Manage service add-ons, favors & essentials, and food menu items.</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* ── Service Add-ons & Favors ── */}
            {[["Service Add-ons", addons], ["Favors & Essentials", favors]].map(([title, subset]) => (
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
                        {(subset as CatalogItem[]).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                              No items yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          (subset as CatalogItem[]).map((item) => (
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
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Box>
                </Paper>
              </Box>
            ))}

            {/* ── Food Menu ── */}
            <Box sx={{ mb: 5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Restaurant sx={{ color: BRAND.gold }} />
                  <Typography variant="h6" fontWeight={700}>Food Menu</Typography>
                  <Chip label={`${foodItems.filter(f => f.active).length} active`} size="small" color="success" />
                </Stack>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={openFoodCreate}
                  sx={{ bgcolor: BRAND.gold, "&:hover": { bgcolor: "#c8a800" } }}
                >
                  Add Food Item
                </Button>
              </Stack>
              <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "background.default" }}>
                        <TableCell sx={{ fontWeight: 700 }}>Icon</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Note</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Price</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Price Label</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Step</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Category / MOQ</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Active</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Order</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {foodItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} align="center" sx={{ py: 5, color: "text.secondary" }}>
                            No food items yet. Click "Add Food Item" to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        foodItems.map((item) => (
                          <TableRow key={item.id} hover>
                            <TableCell>
                              <Box sx={{
                                width: 36, height: 36, borderRadius: 1,
                                bgcolor: item.bg_color ?? "#f5f5f5",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 20,
                              }}>
                                {item.emoji ?? "🍽️"}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>{item.name}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200 }}>
                                {item.description}
                              </Typography>
                              <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }}>
                                {[item.thumbnail_url, item.image_url_2, item.image_url_3]
                                  .filter((u): u is string => !!u)
                                  .map((url, idx) => (
                                    <Box
                                      key={`${item.id}-${idx}`}
                                      component="img"
                                      src={url}
                                      alt={`${item.name} ${idx + 1}`}
                                      sx={{ width: 44, height: 32, objectFit: "cover", borderRadius: 1, border: "1px solid", borderColor: "divider" }}
                                    />
                                  ))}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>₹{item.price.toLocaleString("en-IN")}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {item.price_label ?? `₹${item.price} per ${item.unit_label}`}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={item.shared ? "Shareable" : "Personal"}
                                size="small"
                                color={item.shared ? "success" : "default"}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip label={`×${item.step ?? 1}`} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              {item.category ? (
                                <Stack spacing={0.5}>
                                  <Chip label={item.category} size="small" color="warning" variant="outlined" />
                                  <Typography variant="caption" color="text.secondary">MOQ {item.min_order_qty ?? 10}</Typography>
                                </Stack>
                              ) : (
                                <Typography variant="caption" color="text.secondary">Solo · MOQ {item.min_order_qty ?? 10}</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={item.active ? "Active" : "Hidden"}
                                color={item.active ? "success" : "default"}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{item.sort_order}</TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5}>
                                <Tooltip title="Edit food item">
                                  <IconButton size="small" onClick={() => openFoodEdit(item)}>
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete food item">
                                  <IconButton size="small" color="error" onClick={() => setDeleteConfirm(item.id)}>
                                    <Delete fontSize="small" />
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
            </Box>
          </>
        )}

        {/* ── Catalog (addon/favor) Create/Edit Dialog ── */}
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

        {/* ── Food Menu Create/Edit Dialog ── */}
        <Dialog open={foodDialogOpen} onClose={() => !foodSaving && setFoodDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle fontWeight={700}>
            {editFood ? `Edit — ${editFood.name}` : "Add Food Menu Item"}
          </DialogTitle>
          <DialogContent dividers>
            {foodError && <Alert severity="error" sx={{ mb: 2 }}>{foodError}</Alert>}
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth required label="Item Name"
                  placeholder="e.g. Chicken Biryani – Adult"
                  value={foodForm.name}
                  onChange={(e) => setFoodForm((p) => ({ ...p, name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth label="Emoji"
                  placeholder="🍕"
                  value={foodForm.emoji}
                  onChange={(e) => setFoodForm((p) => ({ ...p, emoji: e.target.value }))}
                  inputProps={{ maxLength: 8 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth label="Description / Note"
                  placeholder={`e.g. Bento Box:\n1. Mutton Biryani\n2. Chicken 65\n3. Raitha`}
                  multiline
                  rows={6}
                  value={foodForm.description}
                  onChange={(e) => setFoodForm((p) => ({ ...p, description: e.target.value }))}
                  helperText="Each line will be shown as a separate line on the booking page"
                />
              </Grid>

              <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Pricing</Typography></Divider></Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth required label="Price (₹)" type="number"
                  value={foodForm.price}
                  onChange={(e) => setFoodForm((p) => ({ ...p, price: e.target.value }))}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth label="Unit Label"
                  placeholder="item / head / pack"
                  value={foodForm.unit_label}
                  onChange={(e) => setFoodForm((p) => ({ ...p, unit_label: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth label="Quantity Step"
                  type="number"
                  helperText="1 = single; 10 = packs of 10"
                  value={foodForm.step}
                  onChange={(e) => setFoodForm((p) => ({ ...p, step: e.target.value }))}
                  inputProps={{ min: 1, step: 1 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth label="Price Label (optional)"
                  placeholder="e.g. ₹299 per 10 pcs — leave blank to auto-generate"
                  value={foodForm.price_label}
                  onChange={(e) => setFoodForm((p) => ({ ...p, price_label: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Display</Typography></Divider></Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth label="Card Background Colour"
                  placeholder="#fff3e0"
                  value={foodForm.bg_color}
                  onChange={(e) => setFoodForm((p) => ({ ...p, bg_color: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <Box
                        component="span"
                        sx={{
                          width: 20, height: 20, borderRadius: "4px", mr: 1,
                          bgcolor: foodForm.bg_color || "#f5f5f5",
                          border: "1px solid",
                          borderColor: "divider",
                          flexShrink: 0,
                        }}
                      />
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth label="Sort Order" type="number"
                  value={foodForm.sort_order}
                  onChange={(e) => setFoodForm((p) => ({ ...p, sort_order: e.target.value }))}
                  inputProps={{ min: 0, step: 10 }}
                />
              </Grid>
              <Grid item xs={12} sm={3} sx={{ display: "flex", alignItems: "center" }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={foodForm.shared}
                      onChange={(e) => setFoodForm((p) => ({ ...p, shared: e.target.checked }))}
                      color="success"
                    />
                  }
                  label="Shareable"
                />
              </Grid>
              <Grid item xs={12} sm={6} sx={{ display: "flex", alignItems: "center" }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={foodForm.active}
                      onChange={(e) => setFoodForm((p) => ({ ...p, active: e.target.checked }))}
                      color="primary"
                    />
                  }
                  label="Show on booking portal"
                />
              </Grid>

              <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Ordering Rules (MOQ)</Typography></Divider></Grid>

              <Grid item xs={12} sm={7}>
                <TextField
                  fullWidth label="Category"
                  placeholder="e.g. Mutton Biryani — leave blank for standalone"
                  helperText="Items sharing the same category name have a combined minimum order quantity"
                  value={foodForm.category}
                  onChange={(e) => setFoodForm((p) => ({ ...p, category: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth label="Min. Order Qty (MOQ)" type="number"
                  helperText="Minimum heads/units per order for this category"
                  value={foodForm.min_order_qty}
                  onChange={(e) => setFoodForm((p) => ({ ...p, min_order_qty: e.target.value }))}
                  inputProps={{ min: 1, step: 1 }}
                />
              </Grid>

              <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Food Images (up to 3)</Typography></Divider></Grid>
              <Grid item xs={12}>
                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: "none" }}
                  onChange={handleThumbUpload}
                />
                <Grid container spacing={1.5}>
                  {([1, 2, 3] as const).map((slot) => {
                    const slotUrl = uploadedImageUrls[slot];
                    const uploadingThisSlot = uploadingSlot === slot;
                    return (
                      <Grid item xs={12} sm={4} key={slot}>
                        <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                            {slot === 1 ? "Image 1 (Primary)" : `Image ${slot}`}
                          </Typography>
                          {slotUrl ? (
                            <Box
                              component="img"
                              src={slotUrl}
                              alt={`food slot ${slot}`}
                              sx={{ width: "100%", height: 96, objectFit: "cover", borderRadius: 1, border: "1px solid", borderColor: "divider" }}
                            />
                          ) : (
                            <Avatar
                              variant="rounded"
                              sx={{ width: "100%", height: 96, bgcolor: foodForm.bg_color || "#f5f5f5", fontSize: 28 }}
                            >
                              {foodForm.emoji || "🍽️"}
                            </Avatar>
                          )}
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={uploadingThisSlot ? <CircularProgress size={14} /> : <FileUpload />}
                              onClick={() => {
                                setUploadTargetSlot(slot);
                                thumbInputRef.current?.click();
                              }}
                              disabled={!!uploadingSlot || !editFood}
                              fullWidth
                            >
                              {uploadingThisSlot ? "Uploading…" : "Upload"}
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              disabled={!slotUrl}
                              onClick={() => setUploadedImageUrls((prev) => ({ ...prev, [slot]: null }))}
                            >
                              Remove
                            </Button>
                          </Stack>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
                {!editFood && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Save the item first, then upload images.
                  </Typography>
                )}
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setFoodDialogOpen(false)} disabled={foodSaving}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleFoodSave}
              disabled={foodSaving || !foodForm.name || !foodForm.price}
              sx={{ bgcolor: BRAND.gold, "&:hover": { bgcolor: "#c8a800" } }}
              startIcon={foodSaving ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {foodSaving ? "Saving…" : editFood ? "Save Changes" : "Add Food Item"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete confirmation */}
        <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs">
          <DialogTitle fontWeight={700}>Delete Item?</DialogTitle>
          <DialogContent>
            <Typography>This action cannot be undone. Are you sure you want to delete this item?</Typography>
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
