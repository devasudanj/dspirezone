import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { Link as RouterLink, useParams } from "react-router-dom";
import api from "../../api/client";
import { BRAND } from "../../theme";
import type { Booking } from "../../types";

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  confirmed: "success",
  draft: "warning",
  cancelled: "error",
};

function getDurationHours(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  return Math.max(0, (endTotalMinutes - startTotalMinutes) / 60);
}

export default function AdminBookingDetails() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setError("Missing booking id.");
      setLoading(false);
      return;
    }

    api
      .get<Booking>(`/bookings/${bookingId}`)
      .then((response) => setBooking(response.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load booking details."))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const durationHours = useMemo(() => {
    if (!booking) return 0;
    return getDurationHours(booking.start_time, booking.end_time);
  }, [booking]);

  return (
    <Box sx={{ py: { xs: 4, md: 6 } }}>
      <Container maxWidth="lg">
        <Button component={RouterLink} to="/admin/bookings" startIcon={<ArrowBack />} sx={{ mb: 3 }}>
          Back to Bookings
        </Button>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : booking ? (
          <Stack spacing={3}>
            <Paper sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography variant="h4" fontWeight={800} gutterBottom>
                    Order Details
                  </Typography>
                  <Typography color="text.secondary">
                    Booking #{booking.id} for {booking.venue_name ?? "DspireZone Event Hall"}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
                  <Typography variant="body2" color="text.secondary">Confirmation Code</Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ color: BRAND.purple }}>
                    {booking.confirmation_code}
                  </Typography>
                  <Chip
                    label={booking.status}
                    color={STATUS_COLOR[booking.status] ?? "default"}
                    sx={{ mt: 1, textTransform: "capitalize", fontWeight: 700 }}
                  />
                </Box>
              </Stack>
            </Paper>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, borderRadius: 3, height: "100%" }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Customer Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={1.25}>
                    <Typography><strong>Name:</strong> {booking.contact_name || "-"}</Typography>
                    <Typography><strong>Email:</strong> {booking.contact_email || "-"}</Typography>
                    <Typography><strong>Phone:</strong> {booking.contact_phone || "-"}</Typography>
                    <Typography><strong>User ID:</strong> {booking.user_id}</Typography>
                  </Stack>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, borderRadius: 3, height: "100%" }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Booking Summary
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={1.25}>
                    <Typography><strong>Date:</strong> {booking.date}</Typography>
                    <Typography><strong>Time Window:</strong> {booking.start_time} - {booking.end_time}</Typography>
                    <Typography><strong>Duration:</strong> {durationHours} hours</Typography>
                    <Typography><strong>Rooms:</strong> {booking.rooms_included_count + (booking.extra_rooms_count ?? 0)}</Typography>
                    <Typography><strong>Extra Rooms:</strong> {booking.extra_rooms_count ?? 0}</Typography>
                    <Typography><strong>Food Court Tables:</strong> {booking.foodcourt_tables_count ?? 0}</Typography>
                    <Typography><strong>Total:</strong> ₹{Number(booking.total_price).toLocaleString("en-IN")}</Typography>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>

            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Add-ons and Selections
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {booking.line_items.length === 0 ? (
                <Typography color="text.secondary">No add-ons or extra selections were included for this order.</Typography>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "background.default" }}>
                      <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Quantity</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Unit Price</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Pricing</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Line Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {booking.line_items.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>{item.item_name || `Item #${item.catalog_item_id}`}</TableCell>
                        <TableCell>{item.item_type}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₹{Number(item.unit_price).toLocaleString("en-IN")}</TableCell>
                        <TableCell>{item.price_type || "fixed"}{item.unit_label ? ` / ${item.unit_label}` : ""}</TableCell>
                        <TableCell>₹{Number(item.line_total).toLocaleString("en-IN")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, borderRadius: 3, height: "100%" }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Notes
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography color={booking.notes ? "text.primary" : "text.secondary"} sx={{ whiteSpace: "pre-wrap" }}>
                    {booking.notes || "No booking notes provided."}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, borderRadius: 3, height: "100%" }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Food Court Notes
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography color={booking.foodcourt_table_notes ? "text.primary" : "text.secondary"} sx={{ whiteSpace: "pre-wrap" }}>
                    {booking.foodcourt_table_notes || "No food court notes provided."}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Stack>
        ) : (
          <Alert severity="warning">Booking not found.</Alert>
        )}
      </Container>
    </Box>
  );
}
