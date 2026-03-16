import React, { useEffect, useState } from "react";
import {
  Box, Container, Grid, Typography, Card, CardContent,
  CircularProgress, Table, TableBody, TableCell, TableHead,
  TableRow, Chip, Paper, Avatar, Stack,
} from "@mui/material";
import {
  ConfirmationNumber, People, EventAvailable, AttachMoney,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import api from "../../api/client";
import { BRAND } from "../../theme";
import type { Booking } from "../../types";

const STATUS_COLOR: Record<string, "success" | "warning" | "error"> = {
  confirmed: "success",
  draft: "warning",
  cancelled: "error",
};

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Booking[]>("/admin/bookings").then((r) => {
      setBookings(r.data);
    }).finally(() => setLoading(false));
  }, []);

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    draft: bookings.filter((b) => b.status === "draft").length,
    revenue: bookings.filter((b) => b.status === "confirmed").reduce((sum, b) => sum + Number(b.total_price), 0),
  };

  const recent = [...bookings].sort((a, b) => b.id - a.id).slice(0, 8);

  const STAT_CARDS = [
    { label: "Total Bookings", value: stats.total, icon: <ConfirmationNumber />, color: BRAND.purple },
    { label: "Confirmed", value: stats.confirmed, icon: <EventAvailable />, color: "#16A34A" },
    { label: "Pending (Draft)", value: stats.draft, icon: <People />, color: BRAND.gold },
    { label: "Total Revenue", value: `₹${stats.revenue.toLocaleString("en-IN")}`, icon: <AttachMoney />, color: "#0891B2" },
  ];

  return (
    <Box sx={{ py: { xs: 4, md: 6 } }}>
      <Container maxWidth="xl">
        <Typography variant="h4" fontWeight={800} gutterBottom>Admin Dashboard</Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>Overview of DspireZone bookings and revenue.</Typography>

        {/* Stats */}
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {STAT_CARDS.map((stat) => (
            <Grid item xs={12} sm={6} md={3} key={stat.label}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>{stat.label}</Typography>
                      <Typography variant="h4" fontWeight={800}>{loading ? "—" : stat.value}</Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: `${stat.color}22`, color: stat.color }}>{stat.icon}</Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Recent Bookings */}
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Box sx={{ p: 2.5, borderBottom: "1px solid", borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" fontWeight={700}>Recent Bookings</Typography>
            <RouterLink to="/admin/bookings" style={{ color: BRAND.purple, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
              View All →
            </RouterLink>
          </Box>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "background.default" }}>
                    <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recent.map((b) => (
                    <TableRow key={b.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} sx={{ color: BRAND.purple, letterSpacing: 0.5 }}>
                          {b.confirmation_code}
                        </Typography>
                      </TableCell>
                      <TableCell>{b.date}</TableCell>
                      <TableCell>{b.start_time}</TableCell>
                      <TableCell>{b.duration_hours}h</TableCell>
                      <TableCell>
                        <Chip
                          label={b.status}
                          color={STATUS_COLOR[b.status] ?? "default"}
                          size="small"
                          sx={{ fontWeight: 700, textTransform: "capitalize" }}
                        />
                      </TableCell>
                      <TableCell>₹{Number(b.total_price).toLocaleString("en-IN")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
