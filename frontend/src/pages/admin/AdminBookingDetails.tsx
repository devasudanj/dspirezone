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
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArrowBack, ContentCopy, Edit, Email, OpenInNew, Save, CheckCircle,
} from "@mui/icons-material";
import { Link as RouterLink, useParams } from "react-router-dom";
import api from "../../api/client";
import { BRAND } from "../../theme";
import type { BookingWithPayments } from "../../types";

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  confirmed: "success",
  draft: "warning",
  cancelled: "error",
};

function getDurationHours(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  return Math.max(0, (endHour * 60 + endMinute - (startHour * 60 + startMinute)) / 60);
}

export default function AdminBookingDetails() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<BookingWithPayments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Alternate contact editing
  const [altEmail, setAltEmail] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [savingAlt, setSavingAlt] = useState(false);
  const [altSaved, setAltSaved] = useState(false);
  const [altError, setAltError] = useState("");

  // Email sending
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Copy link snackbar
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!bookingId) { setError("Missing booking id."); setLoading(false); return; }
    api
      .get<BookingWithPayments>(`/admin/bookings/${bookingId}`)
      .then((res) => {
        setBooking(res.data);
        setAltEmail(res.data.alt_email ?? "");
        setAltPhone(res.data.alt_phone ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load booking details."))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const durationHours = useMemo(() => {
    if (!booking) return 0;
    return getDurationHours(booking.start_time, booking.end_time);
  }, [booking]);

  const modifyLink = booking
    ? `${window.location.origin}/modify-booking/${booking.confirmation_code}`
    : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(modifyLink).then(() => setLinkCopied(true));
  };

  const handleSaveAlt = async () => {
    if (!bookingId) return;
    setSavingAlt(true);
    setAltError("");
    try {
      const res = await api.patch<BookingWithPayments>(`/admin/bookings/${bookingId}/alt-contact`, {
        alt_email: altEmail || null,
        alt_phone: altPhone || null,
      });
      setBooking(res.data);
      setAltSaved(true);
    } catch (err) {
      setAltError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSavingAlt(false);
    }
  };

  const handleSendEmail = async () => {
    if (!bookingId) return;
    setSendingEmail(true);
    setEmailError("");
    setEmailSent(false);
    try {
      await api.post(`/admin/bookings/${bookingId}/resend-email`);
      setEmailSent(true);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Failed to send email.");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Box sx={{ py: { xs: 4, md: 6 } }}>
      <Container maxWidth="lg">
        <Button component={RouterLink} to="/admin/bookings" startIcon={<ArrowBack />} sx={{ mb: 3 }}>
          Back to Bookings
        </Button>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : booking ? (
          <Stack spacing={3}>

            {/* ── Header ── */}
            <Paper sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography variant="h4" fontWeight={800} gutterBottom>
                    Order Details
                  </Typography>
                  <Typography color="text.secondary">
                    Booking #{booking.id} for {(booking as any).venue_name ?? "DspireZone Event Hall"}
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

            {/* ── Payment Status Banner ── */}
            <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: booking.remaining_due <= 0 ? "#f0fdf4" : "#fffbeb", border: `1px solid ${booking.remaining_due <= 0 ? "#86efac" : "#fde68a"}` }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems="center">
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Payment Summary</Typography>
                  <Stack direction="row" spacing={4}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Total</Typography>
                      <Typography fontWeight={700}>₹{Number(booking.total_price).toLocaleString("en-IN")}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Paid</Typography>
                      <Typography fontWeight={700} color="success.main">₹{Number(booking.total_paid).toLocaleString("en-IN")}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Remaining</Typography>
                      <Typography fontWeight={700} color={booking.remaining_due > 0 ? "warning.dark" : "success.main"}>
                        ₹{Number(booking.remaining_due).toLocaleString("en-IN")}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
                {booking.remaining_due <= 0 && (
                  <Chip icon={<CheckCircle />} label="Fully Paid" color="success" variant="filled" sx={{ fontWeight: 700 }} />
                )}
              </Stack>
            </Paper>

            {/* ── Modify Link + Send Email ── */}
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>Customer Actions</Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                {/* Modify booking link */}
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Share this link with the customer to let them view, modify their booking, or pay the remaining balance:
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={modifyLink}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="Copy link">
                            <IconButton onClick={handleCopyLink} size="small"><ContentCopy fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="Open in new tab">
                            <IconButton component="a" href={modifyLink} target="_blank" rel="noopener noreferrer" size="small">
                              <OpenInNew fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ "& .MuiInputBase-input": { fontSize: 13, color: BRAND.purple } }}
                  />
                </Box>

                {/* Send email button */}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Send the booking details + payment link email to the customer email
                      {booking.alt_email ? ` and alternate address (${booking.alt_email})` : ""}.
                    </Typography>
                    {emailError && <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>{emailError}</Typography>}
                    {emailSent && <Typography variant="body2" color="success.main" sx={{ mt: 0.5 }}>✓ Email sent successfully</Typography>}
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<Email />}
                    onClick={handleSendEmail}
                    disabled={sendingEmail || !booking.contact_email}
                    sx={{ minWidth: 180, bgcolor: BRAND.purple, "&:hover": { bgcolor: BRAND.purpleDark ?? "#5b21b6" }, flexShrink: 0 }}
                  >
                    {sendingEmail ? "Sending…" : "Send Order Email"}
                  </Button>
                </Stack>
              </Stack>
            </Paper>

            <Grid container spacing={3}>
              {/* ── Customer Details ── */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, borderRadius: 3, height: "100%" }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>Customer Details</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={1.25}>
                    <Typography><strong>Name:</strong> {booking.contact_name || "-"}</Typography>
                    <Typography>
                      <strong>Email:</strong>{" "}
                      {booking.contact_email
                        ? <a href={`mailto:${booking.contact_email}`} style={{ color: BRAND.purple }}>{booking.contact_email}</a>
                        : "-"}
                    </Typography>
                    <Typography><strong>Phone:</strong> {booking.contact_phone || "-"}</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" color="text.secondary">Alternate Contact (Admin only)</Typography>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <TextField
                        label="Alternate Email"
                        size="small"
                        fullWidth
                        value={altEmail}
                        onChange={(e) => setAltEmail(e.target.value)}
                        type="email"
                        placeholder="alt@example.com"
                      />
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <TextField
                        label="Alternate Phone"
                        size="small"
                        fullWidth
                        value={altPhone}
                        onChange={(e) => setAltPhone(e.target.value)}
                        placeholder="+91 9000000000"
                      />
                    </Stack>
                    {altError && <Typography variant="body2" color="error">{altError}</Typography>}
                    {altSaved && <Typography variant="body2" color="success.main">✓ Saved</Typography>}
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Save />}
                      onClick={handleSaveAlt}
                      disabled={savingAlt}
                      sx={{ alignSelf: "flex-start" }}
                    >
                      {savingAlt ? "Saving…" : "Save Alternate Contact"}
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      The alternate email will also receive reminder / order emails when you click "Send Order Email" above.
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>

              {/* ── Booking Summary ── */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, borderRadius: 3, height: "100%" }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>Booking Summary</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={1.25}>
                    <Typography><strong>Date:</strong> {booking.date}</Typography>
                    <Typography><strong>Time Window:</strong> {booking.start_time} – {booking.end_time}</Typography>
                    <Typography><strong>Duration:</strong> {durationHours} hours</Typography>
                    <Typography><strong>Rooms:</strong> {booking.rooms_included_count + (booking.extra_rooms_count ?? 0)}</Typography>
                    <Typography><strong>Extra Rooms:</strong> {booking.extra_rooms_count ?? 0}</Typography>
                    <Typography><strong>Food Court Tables:</strong> {booking.foodcourt_tables_count ?? 0}</Typography>
                    <Divider sx={{ my: 0.5 }} />
                    <Typography><strong>Total:</strong> ₹{Number(booking.total_price).toLocaleString("en-IN")}</Typography>
                    <Typography color="success.main"><strong>Paid:</strong> ₹{Number(booking.total_paid).toLocaleString("en-IN")}</Typography>
                    <Typography color={booking.remaining_due > 0 ? "warning.dark" : "success.main"}>
                      <strong>Remaining:</strong> ₹{Number(booking.remaining_due).toLocaleString("en-IN")}
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>

            {/* ── Add-ons ── */}
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>Add-ons and Selections</Typography>
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
                  <Typography variant="h6" fontWeight={700} gutterBottom>Notes</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography color={booking.notes ? "text.primary" : "text.secondary"} sx={{ whiteSpace: "pre-wrap" }}>
                    {booking.notes || "No booking notes provided."}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, borderRadius: 3, height: "100%" }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>Food Court Notes</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography color={booking.foodcourt_table_notes ? "text.primary" : "text.secondary"} sx={{ whiteSpace: "pre-wrap" }}>
                    {booking.foodcourt_table_notes || "No food court notes provided."}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* ── Payment History ── */}
            {booking.audit_logs.length > 0 && (
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>Change History</Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={1}>
                  {[...booking.audit_logs].reverse().map((log) => (
                    <Box key={log.id} sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                      <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.change_summary}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {log.changed_by_name ? `${log.changed_by_name} · ` : ""}
                          {log.changed_at ? new Date(log.changed_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) + " IST" : ""}
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            )}

          </Stack>
        ) : (
          <Alert severity="warning">Booking not found.</Alert>
        )}

        <Snackbar
          open={linkCopied}
          autoHideDuration={2500}
          onClose={() => setLinkCopied(false)}
          message="Link copied to clipboard"
        />
      </Container>
    </Box>
  );
}
