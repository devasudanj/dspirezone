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
  ArrowBack, ContentCopy, Delete, Edit, Email, OpenInNew, Save, CheckCircle, NoteAdd,
} from "@mui/icons-material";
import { Link as RouterLink, useParams } from "react-router-dom";
import api from "../../api/client";
import { BRAND } from "../../theme";
import type { BookingWithPayments, SplitInvoiceOut, AdminNote } from "../../types";

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

  // Admin notes
  const [adminNotes, setAdminNotes] = useState<AdminNote[]>([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [noteAuthor, setNoteAuthor] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);

  // Copy link snackbar
  const [linkCopied, setLinkCopied] = useState(false);

  // Invoice
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<SplitInvoiceOut | null>(null);
  const [invoiceError, setInvoiceError] = useState("");

  useEffect(() => {
    if (!bookingId) { setError("Missing booking id."); setLoading(false); return; }
    api
      .get<BookingWithPayments>(`/admin/bookings/${bookingId}`)
      .then((res) => {
        setBooking(res.data);
        setAltEmail(res.data.alt_email ?? "");
        setAltPhone(res.data.alt_phone ?? "");
        setAdminNotes(res.data.admin_notes ?? []);
        // Pre-fill invoices if already generated
        if (res.data.razorpay_invoice_id && res.data.razorpay_invoice_short_url) {
          const bookingId = res.data.id;
          const seq = String(bookingId).padStart(5, "0");
          setInvoiceData({
            booking_id: bookingId,
            event_invoice_id: res.data.razorpay_invoice_id,
            event_invoice_ref: `DZ/E/-${seq}`,
            event_invoice_short_url: res.data.razorpay_invoice_short_url,
            event_invoice_status: "generated",
            event_invoice_amount: res.data.total_price,
            food_invoice_id: res.data.razorpay_food_invoice_id || undefined,
            food_invoice_ref: res.data.razorpay_food_invoice_id ? `DZ/G/-${seq}` : undefined,
            food_invoice_short_url: res.data.razorpay_food_invoice_short_url || undefined,
            food_invoice_status: res.data.razorpay_food_invoice_id ? "generated" : undefined,
            food_invoice_amount: res.data.food_amount_pretax
              ? Math.round(res.data.food_amount_pretax * 1.05 * 100) / 100
              : undefined,
          });
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load booking details."))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const durationHours = useMemo(() => {
    if (!booking) return 0;
    return getDurationHours(booking.start_time, booking.end_time);
  }, [booking]);

  const handleSaveNote = async () => {
    if (!bookingId || !newNoteText.trim()) return;
    setSavingNote(true);
    setNoteError("");
    try {
      const res = await api.post<AdminNote>(`/admin/bookings/${bookingId}/notes`, {
        note_text: newNoteText.trim(),
        created_by_name: noteAuthor.trim() || "Admin",
      });
      setAdminNotes((prev) => [res.data, ...prev]);
      setNewNoteText("");
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : "Failed to save note.");
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!bookingId) return;
    setDeletingNoteId(noteId);
    try {
      await api.delete(`/admin/bookings/${bookingId}/notes/${noteId}`);
      setAdminNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch {
      // silently ignore
    } finally {
      setDeletingNoteId(null);
    }
  };

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

  const handleGenerateInvoice = async (forceRegenerate = false) => {
    if (!booking) return;
    setInvoiceLoading(true);
    setInvoiceError("");
    try {
      const res = await api.post<SplitInvoiceOut>("/payments/invoice", {
        booking_id: booking.id,
        force_regenerate: forceRegenerate,
      });
      setInvoiceData(res.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err instanceof Error ? err.message : "Failed to generate invoice.");
      setInvoiceError(msg);
    } finally {
      setInvoiceLoading(false);
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
                    {booking.discount_code && (
                      <Typography>
                        <strong>Discount Code:</strong>{" "}
                        <span style={{ fontFamily: "monospace", background: "#f3eeff", padding: "2px 6px", borderRadius: 4 }}>
                          {booking.discount_code}
                        </span>
                        {booking.discount_pct ? ` — ${booking.discount_pct}% off venue` : ""}
                      </Typography>
                    )}
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

            {/* ── Change History ── */}
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

            {/* ── Admin Notes ── */}
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <NoteAdd sx={{ color: BRAND.purple }} />
                <Typography variant="h6" fontWeight={700}>Admin Notes</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Internal notes visible only to admins. Use this to track follow-ups, calls, or status updates.
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {/* Add new note form */}
              <Stack spacing={1.5} sx={{ mb: 3 }}>
                <TextField
                  label="Author name"
                  size="small"
                  value={noteAuthor}
                  onChange={(e) => setNoteAuthor(e.target.value)}
                  placeholder="Your name"
                  sx={{ maxWidth: 300 }}
                />
                <TextField
                  label="New note"
                  multiline
                  minRows={3}
                  fullWidth
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Enter follow-up details, status update, customer call notes…"
                />
                {noteError && <Typography variant="body2" color="error">{noteError}</Typography>}
                <Button
                  variant="contained"
                  startIcon={<NoteAdd />}
                  onClick={handleSaveNote}
                  disabled={savingNote || !newNoteText.trim()}
                  sx={{ alignSelf: "flex-start", bgcolor: BRAND.purple, "&:hover": { bgcolor: "#5b21b6" } }}
                >
                  {savingNote ? "Saving…" : "Add Note"}
                </Button>
              </Stack>

              {/* Notes history */}
              {adminNotes.length === 0 ? (
                <Typography color="text.secondary" variant="body2">No admin notes yet.</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {adminNotes.map((note) => (
                    <Box
                      key={note.id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: "#f9f7ff",
                        border: "1px solid #e0d0ff",
                        position: "relative",
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mb: 0.75 }}>
                            {note.note_text}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            <strong>{note.created_by_name}</strong>
                            {note.created_at
                              ? ` · ${new Date(note.created_at).toLocaleString("en-IN", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                  timeZone: "Asia/Kolkata",
                                })} IST`
                              : ""}
                          </Typography>
                        </Box>
                        <Tooltip title="Delete note">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteNote(note.id)}
                            disabled={deletingNoteId === note.id}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>

            {/* ── Invoice ── */}
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>Invoices</Typography>
              <Divider sx={{ mb: 2 }} />

              {/* Payment Summary */}
              <Stack direction="row" spacing={3} sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total (incl. GST)</Typography>
                  <Typography fontWeight={700}>₹{Number(booking.total_price).toLocaleString("en-IN")}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Amount Paid</Typography>
                  <Typography fontWeight={700} color="success.main">₹{Number(booking.total_paid).toLocaleString("en-IN")}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Balance Due</Typography>
                  <Typography fontWeight={700} color={booking.remaining_due > 0 ? "warning.dark" : "success.main"}>
                    ₹{Number(booking.remaining_due).toLocaleString("en-IN")}
                  </Typography>
                </Box>
              </Stack>
              <Divider sx={{ mb: 2 }} />

              {invoiceData ? (
                <Stack spacing={2}>
                  {/* ── Event Invoice Card ── */}
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: BRAND.purple + "66" }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <CheckCircle sx={{ color: "success.main", fontSize: 18 }} />
                      <Typography variant="body2" fontWeight={700} color="primary">
                        Event Invoice
                      </Typography>
                      <Chip label="18% GST" size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, fontSize: 11 }} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {invoiceData.event_invoice_ref} &nbsp;·&nbsp; {invoiceData.event_invoice_id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                      Status: <strong>{invoiceData.event_invoice_status}</strong>
                      {invoiceData.event_invoice_amount ? ` · ₹${invoiceData.event_invoice_amount.toLocaleString("en-IN")}` : ""}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {invoiceData.event_invoice_short_url && (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<OpenInNew />}
                          href={invoiceData.event_invoice_short_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ bgcolor: BRAND.purple, "&:hover": { bgcolor: "#3a0a72" } }}
                        >
                          View Event Invoice
                        </Button>
                      )}
                    </Stack>
                  </Paper>

                  {/* ── Food Invoice Card (shown when food was ordered) ── */}
                  {invoiceData.food_invoice_id ? (
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: "#2e7d3266" }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <CheckCircle sx={{ color: "success.main", fontSize: 18 }} />
                        <Typography variant="body2" fontWeight={700} color="success.dark">
                          Food & Beverages Invoice
                        </Typography>
                        <Chip label="5% GST" size="small" color="success" variant="outlined" sx={{ fontWeight: 700, fontSize: 11 }} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {invoiceData.food_invoice_ref} &nbsp;·&nbsp; {invoiceData.food_invoice_id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                        Status: <strong>{invoiceData.food_invoice_status}</strong>
                        {invoiceData.food_invoice_amount ? ` · ₹${invoiceData.food_invoice_amount.toLocaleString("en-IN")}` : ""}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {invoiceData.food_invoice_short_url && (
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<OpenInNew />}
                            href={invoiceData.food_invoice_short_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ bgcolor: "#2e7d32", "&:hover": { bgcolor: "#1b5e20" } }}
                          >
                            View Food Invoice
                          </Button>
                        )}
                      </Stack>
                    </Paper>
                  ) : booking.food_amount_pretax && Number(booking.food_amount_pretax) > 0 ? (
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: "warning.main" }}>
                      <Typography variant="body2" color="warning.dark" fontWeight={600} gutterBottom>
                        Food invoice not yet generated
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Food items were ordered (₹{Number(booking.food_amount_pretax).toLocaleString("en-IN")} pre-tax). Click below to generate both invoices.
                      </Typography>
                    </Paper>
                  ) : null}

                  <Button
                    variant="text"
                    size="small"
                    onClick={() => handleGenerateInvoice(false)}
                    disabled={invoiceLoading}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    {invoiceLoading ? "Refreshing…" : "Refresh Invoice Status"}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="warning"
                    onClick={() => handleGenerateInvoice(true)}
                    disabled={invoiceLoading}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    Regenerate Invoices (after modifications)
                  </Button>
                </Stack>
              ) : (
                <Stack spacing={1.5}>
                  <Typography variant="body2" color="text.secondary">
                    Generate Razorpay-hosted invoices for this booking. Event costs and food orders are billed on separate invoices with correct GST rates.
                  </Typography>
                  {invoiceError && (
                    <Typography variant="body2" color="error">{invoiceError}</Typography>
                  )}
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleGenerateInvoice(false)}
                    disabled={invoiceLoading}
                    sx={{ alignSelf: "flex-start", bgcolor: BRAND.purple, "&:hover": { bgcolor: "#3a0a72" } }}
                  >
                    {invoiceLoading ? "Generating…" : "Generate Invoices"}
                  </Button>
                </Stack>
              )}
            </Paper>

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
