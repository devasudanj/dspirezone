import React, { useEffect, useState } from "react";
import {
  Box, Container, Typography, Paper, Table, TableBody,
  TableCell, TableHead, TableRow, Chip, Select, MenuItem,
  FormControl, InputLabel, CircularProgress, Alert, Stack, TextField,
  InputAdornment,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import api from "../../api/client";
import { BRAND } from "../../theme";
import type { Booking } from "../../types";

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  confirmed: "success",
  draft: "warning",
  cancelled: "error",
};

const STATUS_OPTIONS = ["all", "confirmed", "draft", "cancelled"];

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);

  const fetchBookings = () => {
    setLoading(true);
    api
      .get<Booking[]>(`/admin/bookings${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`)
      .then((r) => setBookings(r.data))
      .catch(() => setError("Failed to load bookings."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [statusFilter]);

  const handleStatusChange = async (bookingId: number, newStatus: string) => {
    setUpdating(bookingId);
    try {
      await api.patch(`/admin/bookings/${bookingId}`, { status: newStatus });
      setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: newStatus as Booking["status"] } : b));
    } catch {
      setError("Failed to update booking status.");
    } finally {
      setUpdating(null);
    }
  };

  const filtered = bookings.filter((b) => {
    const q = search.toLowerCase();
    return (
      !q ||
      b.confirmation_code?.toLowerCase().includes(q) ||
      b.date.includes(q)
    );
  });

  return (
    <Box sx={{ py: { xs: 4, md: 6 } }}>
      <Container maxWidth="xl">
        <Typography variant="h4" fontWeight={800} gutterBottom>Manage Bookings</Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>View and update all venue bookings.</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Filters */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
          <TextField
            placeholder="Search by confirmation code or date…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ minWidth: 280 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ color: "text.secondary" }} /></InputAdornment>,
            }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "background.default" }}>
                    <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Confirmation</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Start</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Rooms</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>FC Tables</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((b) => (
                    <TableRow key={b.id} hover>
                      <TableCell>{b.id}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} sx={{ color: BRAND.purple, letterSpacing: 0.5 }}>
                          {b.confirmation_code}
                        </Typography>
                      </TableCell>
                      <TableCell>{b.date}</TableCell>
                      <TableCell>{b.start_time}</TableCell>
                      <TableCell>{b.duration_hours}h</TableCell>
                      <TableCell>{b.rooms_included_count + (b.extra_rooms_count ?? 0)}</TableCell>
                      <TableCell>{b.foodcourt_tables_count ?? 0}</TableCell>
                      <TableCell>₹{Number(b.total_price).toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          value={b.status}
                          disabled={updating === b.id}
                          onChange={(e) => handleStatusChange(b.id, e.target.value)}
                          sx={{ fontSize: 13, minWidth: 120 }}
                        >
                          {["draft", "confirmed", "cancelled"].map((s) => (
                            <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                        No bookings found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
