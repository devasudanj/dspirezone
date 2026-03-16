import React, { useEffect, useState } from "react";
import {
  Box, Container, Typography, Card, CardContent, Chip,
  CircularProgress, Alert, Grid, Avatar, Button, Divider,
  Stack,
} from "@mui/material";
import { CalendarMonth, ConfirmationNumber, AccessTime } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { format } from "date-fns";
import api from "../api/client";
import { BRAND } from "../theme";
import type { Booking } from "../types";

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  confirmed: "success",
  draft: "warning",
  cancelled: "error",
};

function BookingCard({ booking }: { booking: Booking }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>{booking.venue_name ?? "DspireZone Event Hall"}</Typography>
            <Typography variant="body2" color="text.secondary">
              {format(new Date(booking.date), "EEEE, dd MMMM yyyy")}
            </Typography>
          </Box>
          <Chip
            label={booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            color={STATUS_COLOR[booking.status] ?? "default"}
            size="small"
            sx={{ fontWeight: 700 }}
          />
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Stack direction="row" spacing={1} alignItems="center">
              <AccessTime sx={{ color: "text.secondary", fontSize: 18 }} />
              <Box>
                <Typography variant="caption" color="text.secondary">Time</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {booking.start_time} · {booking.duration_hours}h
                </Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Stack direction="row" spacing={1} alignItems="center">
              <ConfirmationNumber sx={{ color: "text.secondary", fontSize: 18 }} />
              <Box>
                <Typography variant="caption" color="text.secondary">Confirmation</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color: BRAND.purple, letterSpacing: 1 }}>
                  {booking.confirmation_code}
                </Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Stack direction="row" spacing={1} alignItems="center">
              <CalendarMonth sx={{ color: "text.secondary", fontSize: 18 }} />
              <Box>
                <Typography variant="caption" color="text.secondary">Total Paid</Typography>
                <Typography variant="body2" fontWeight={700}>
                  ₹{Number(booking.total_price).toLocaleString("en-IN")}
                </Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>

        {booking.line_items && booking.line_items.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: "block" }}>
              Add-ons included:
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {booking.line_items.map((li) => (
                <Chip key={li.id} label={li.item_name ?? `Item #${li.catalog_item_id}`} size="small" variant="outlined" />
              ))}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Booking[]>("/bookings/my")
      .then((r) => setBookings(r.data))
      .catch(() => setError("Could not load your bookings. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ py: { xs: 4, md: 8 }, minHeight: "80vh" }}>
      <Container maxWidth="md">
        <Typography variant="h4" fontWeight={800} gutterBottom>My Bookings</Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          All your DspireZone event bookings in one place.
        </Typography>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && bookings.length === 0 && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography sx={{ fontSize: 64 }}>🎉</Typography>
            <Typography variant="h6" fontWeight={700} sx={{ mt: 2 }}>No bookings yet</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Ready to celebrate? Make your first booking today.
            </Typography>
            <Button component={RouterLink} to="/book" variant="contained" color="primary" size="large">
              Book an Event
            </Button>
          </Box>
        )}

        {!loading && bookings.length > 0 && (
          <Stack spacing={3}>
            {bookings.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
