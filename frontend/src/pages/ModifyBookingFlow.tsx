import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Container, Typography, Button, Grid, Card, CardContent,
  TextField, Chip, Stack, Divider, CircularProgress, Alert,
  IconButton, Paper, FormControl, InputLabel, Select, MenuItem,
  Checkbox, Accordion, AccordionSummary, AccordionDetails,
  Dialog, DialogTitle, DialogContent, DialogActions,
  useTheme, useMediaQuery,
} from "@mui/material";
import {
  Add, Remove, CheckCircle, ArrowBack, ExpandMore, Edit,
  Payment as PaymentIcon, History, Save,
} from "@mui/icons-material";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import dayjs, { Dayjs } from "dayjs";
import { DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import api from "../api/client";
import PriceBreakdown from "../components/PriceBreakdown";
import { BRAND } from "../theme";
import type {
  Venue, CatalogItem, AvailableSlot, PriceBreakdown as PriceBreakdownType,
  BookingWithPayments, BookingLineItem, Payment, BookingAuditLog, RazorpayInvoiceOut,
} from "../types";

// ─── Food menu (must exactly mirror BookingFlow.tsx) ─────────────────────────

// ─── Razorpay types & script loader ──────────────────────────────────────────
interface RazorpayOrderOut {
  razorpay_order_id: string;
  amount: number;
  currency: string;
  razorpay_key_id: string;
  booking_id: number;
  payment_id: number;
}

interface RzpOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay: new (options: RzpOptions) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.Razorpay !== "undefined") { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay Checkout"));
    document.head.appendChild(s);
  });
}

const FOOD_MENU = [
  { key: "pizza_chicken",         label: "Personal Pizza – Chicken",    note: "Personal size · not shareable",      price: 199, priceLabel: "₹199 per item",         emoji: "🍕", bg: "#fff3e0", shared: false, step: 1  },
  { key: "pizza_veg",             label: "Personal Pizza – Veg",        note: "Personal size · not shareable",      price: 179, priceLabel: "₹179 per item",         emoji: "🍕", bg: "#f1f8e9", shared: false, step: 1  },
  { key: "mutton_biryani_kids",   label: "Mutton Biryani – Kids",       note: "Kids portion · per head",            price: 249, priceLabel: "₹249 per head",         emoji: "🍚", bg: "#fce4ec", shared: false, step: 1  },
  { key: "mutton_biryani_adult",  label: "Mutton Biryani – Adult",      note: "Full adult portion · per head",      price: 349, priceLabel: "₹349 per head",         emoji: "🍛", bg: "#fce4ec", shared: false, step: 1  },
  { key: "chicken_biryani_kids",  label: "Chicken Biryani – Kids",      note: "Kids portion · per head",            price: 199, priceLabel: "₹199 per head",         emoji: "🍚", bg: "#e8f5e9", shared: false, step: 1  },
  { key: "chicken_biryani_adult", label: "Chicken Biryani – Adult",     note: "Full adult portion · per head",      price: 299, priceLabel: "₹299 per head",         emoji: "🍛", bg: "#e8f5e9", shared: false, step: 1  },
  { key: "veg_package",           label: "Veg Package",                 note: "Per head · includes rice & sides",   price: 149, priceLabel: "₹149 per head",         emoji: "🥗", bg: "#e8f5e9", shared: false, step: 1  },
  { key: "large_pizza",           label: "Large Pizza",                 note: "Serves 3 people · shareable",        price: 599, priceLabel: "₹599 each (serves 3)",   emoji: "🍕", bg: "#fff3e0", shared: true,  step: 1  },
  { key: "fish_fingers",          label: "Fish Fingers",                note: "Shareable · sold in packs of 10",    price: 299, priceLabel: "₹299 per 10 pcs",       emoji: "🐟", bg: "#e3f2fd", shared: true,  step: 10 },
  { key: "chicken_nuggets",       label: "Chicken Nuggets",             note: "Shareable · sold in packs of 10",    price: 249, priceLabel: "₹249 per 10 pcs",       emoji: "🍗", bg: "#fff8e1", shared: true,  step: 10 },
];

/** Parse food selections out of the booking notes field. */
function parseFoodSelectionsFromNotes(notes: string | null | undefined): Record<string, number> {
  if (!notes) return {};
  const result: Record<string, number> = {};
  for (const item of FOOD_MENU) {
    // Match "Label × N" pattern
    const escapedLabel = item.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = notes.match(new RegExp(`${escapedLabel}\\s*[×x]\\s*(\\d+)`, "i"));
    if (match) {
      result[item.key] = parseInt(match[1], 10);
    }
  }
  return result;
}

interface ModifyState {
  date: Dayjs | null;
  startTime: Dayjs | null;
  durationHours: number;
  addons: number[];
  foodcourtTablesCount: number;
  foodcourtTableNotes: string;
  extraRoomsCount: number;
  foodSelections: Record<string, number>;
  favors: Record<number, number>;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
}

function buildStateFromBooking(booking: BookingWithPayments, venueMinHours: number): ModifyState {
  const dateStr = booking.date;
  const startStr = booking.start_time;
  const endStr = booking.end_time;

  const start = dayjs(`${dateStr}T${startStr}`);
  const end = dayjs(`${dateStr}T${endStr}`);
  const durationHours = Math.max(venueMinHours, end.diff(start, "hour", true));

  const addonIds = booking.line_items
    .filter((li) => li.item_type === "service_addon" && li.catalog_item_id)
    .map((li) => li.catalog_item_id!);

  const favors: Record<number, number> = {};
  for (const li of booking.line_items) {
    if (li.item_type === "favor_essential" && li.catalog_item_id) {
      favors[li.catalog_item_id] = li.quantity;
    }
  }

  return {
    date: dayjs(dateStr),
    startTime: start,
    durationHours,
    addons: addonIds,
    foodcourtTablesCount: booking.foodcourt_tables_count,
    foodcourtTableNotes: booking.foodcourt_table_notes ?? "",
    extraRoomsCount: booking.extra_rooms_count,
    foodSelections: parseFoodSelectionsFromNotes(booking.notes),
    favors,
    contactName: booking.contact_name ?? "",
    contactEmail: booking.contact_email ?? "",
    contactPhone: booking.contact_phone ?? "",
    notes: booking.notes ?? "",
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ModifyBookingFlow() {
  const { code } = useParams<{ code: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [booking, setBooking] = useState<BookingWithPayments | null>(
    (location.state as { booking?: BookingWithPayments })?.booking ?? null
  );
  const [venue, setVenue] = useState<Venue | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loadingData, setLoadingData] = useState(!booking);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdownType | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  const [state, setState] = useState<ModifyState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [expanded, setExpanded] = useState<string | false>("datetime");

  // Invoice
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<RazorpayInvoiceOut | null>(null);
  const [invoiceError, setInvoiceError] = useState("");

  const patchState = (patch: Partial<ModifyState>) =>
    setState((prev) => prev ? { ...prev, ...patch } : null);

  // Load booking if not passed via state
  useEffect(() => {
    if (booking) return;
    if (!code) { navigate("/modify-booking"); return; }
    api.get<BookingWithPayments>(`/bookings/by-code/${code.toUpperCase()}`)
      .then((r) => {
        setBooking(r.data);
        if (r.data.razorpay_invoice_id && r.data.razorpay_invoice_short_url) {
          setInvoiceData({
            invoice_id: r.data.razorpay_invoice_id,
            short_url: r.data.razorpay_invoice_short_url,
            status: "generated",
            amount: r.data.total_price,
            booking_id: r.data.id,
          });
        }
      })
      .catch(() => navigate("/modify-booking"))
      .finally(() => setLoadingData(false));
  }, [code, booking, navigate]);

  // Load venue + catalog
  useEffect(() => {
    Promise.all([
      api.get<Venue>("/venue"),
      api.get<CatalogItem[]>("/catalog"),
    ]).then(([vRes, cRes]) => {
      setVenue(vRes.data);
      setCatalogItems(cRes.data);
      if (booking) {
        setState(buildStateFromBooking(booking, vRes.data.min_hours));
      }
    }).finally(() => setLoadingData(false));
  }, []);

  // When booking loads after venue
  useEffect(() => {
    if (booking && venue && !state) {
      setState(buildStateFromBooking(booking, venue.min_hours));
    }
  }, [booking, venue, state]);

  // Load available slots when date/duration changes
  const loadSlots = useCallback(async (date: Dayjs, duration: number, venueId: number) => {
    setLoadingSlots(true);
    setSlotsError("");
    try {
      const res = await api.get<{ slots: AvailableSlot[] }>(
        `/availability/slots?venue_id=${venueId}&date=${date.format("YYYY-MM-DD")}&duration_hours=${duration}`
      );
      setAvailableSlots(res.data.slots);
    } catch {
      setSlotsError("Unable to load available slots");
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (!state?.date || !venue) return;
    void loadSlots(state.date, state.durationHours, venue.id);
  }, [state?.date, state?.durationHours, venue, loadSlots]);

  // Recalculate price preview
  const refreshPrice = useCallback(async () => {
    if (!venue || !state?.date || !state?.startTime) return;
    setLoadingPrice(true);
    try {
      const lineItems = [
        ...state.addons.map((id) => ({ catalog_item_id: id, quantity: 1 })),
        ...Object.entries(state.favors)
          .filter(([, q]) => q > 0)
          .map(([id, q]) => ({ catalog_item_id: Number(id), quantity: q })),
      ];
      const res = await api.post<PriceBreakdownType>("/bookings/preview", {
        venue_id: venue.id,
        date: state.date.format("YYYY-MM-DD"),
        start_time: state.startTime.format("HH:mm"),
        duration_hours: state.durationHours,
        foodcourt_tables_count: state.foodcourtTablesCount,
        extra_rooms_count: state.extraRoomsCount,
        line_items: lineItems,
      });
      setPriceBreakdown(res.data);
    } catch {
      setPriceBreakdown(null);
    } finally {
      setLoadingPrice(false);
    }
  }, [venue, state]);

  useEffect(() => {
    if (!state?.startTime) return;
    const timer = setTimeout(() => void refreshPrice(), 600);
    return () => clearTimeout(timer);
  }, [state?.date, state?.startTime, state?.durationHours, state?.foodcourtTablesCount, state?.extraRoomsCount, state?.addons, state?.favors, refreshPrice]);

  const foodSubtotal = FOOD_MENU.reduce((sum, m) => {
    const qty = state?.foodSelections[m.key] ?? 0;
    return sum + (m.step > 1 ? (qty / m.step) * m.price : m.price * qty);
  }, 0);

  // GST: Tamil Nadu — CGST 9% + SGST 9% = 18%
  // When a fresh priceBreakdown is available apply GST to (venue + food).
  // When not (no changes made), booking.total_price already includes GST for new bookings.
  const newTotal = priceBreakdown
    ? Math.round((priceBreakdown.total + foodSubtotal) * 1.18 * 100) / 100
    : (booking?.total_price ?? 0) + Math.round(foodSubtotal * 1.18 * 100) / 100;
  const totalPaid = booking?.total_paid ?? 0;
  const remainingDue = Math.max(0, newTotal - totalPaid);
  const isOverpaid = totalPaid > newTotal;

  const handleSave = async () => {
    if (!booking || !state || !code) return;
    if (!state.date || !state.startTime) {
      setSaveError("Please select a valid date and start time.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const lineItems = [
        ...state.addons.map((id) => ({ catalog_item_id: id, quantity: 1 })),
        ...Object.entries(state.favors)
          .filter(([, q]) => q > 0)
          .map(([id, q]) => ({ catalog_item_id: Number(id), quantity: q })),
      ];

      // Rebuild notes including food items
      const foodNoteLines = FOOD_MENU
        .filter((m) => (state.foodSelections[m.key] ?? 0) > 0)
        .map((m) => {
          const qty = state.foodSelections[m.key];
          const cost = m.step > 1 ? (qty / m.step) * m.price : m.price * qty;
          return `${m.label} × ${qty} (₹${cost})`;
        });
      const notesStr = [
        ...foodNoteLines,
        state.notes && !foodNoteLines.some((n) => state.notes.includes(n)) ? state.notes : "",
      ].filter(Boolean).join(", ") || undefined;

      const res = await api.put<BookingWithPayments>(`/bookings/${booking.id}`, {
        confirmation_code: code.toUpperCase(),
        date: state.date.format("YYYY-MM-DD"),
        start_time: state.startTime.format("HH:mm"),
        duration_hours: state.durationHours,
        extra_rooms_count: state.extraRoomsCount,
        foodcourt_tables_count: state.foodcourtTablesCount,
        foodcourt_table_notes: state.foodcourtTableNotes || undefined,
        notes: notesStr,
        line_items: lineItems,
        contact_name: state.contactName || undefined,
        contact_email: state.contactEmail || undefined,
        contact_phone: state.contactPhone || undefined,
        changed_by_name: state.contactName || "Guest",
      });
      setBooking(res.data);
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!booking || !code) return;
    setInvoiceLoading(true);
    setInvoiceError("");
    try {
      const res = await api.post<RazorpayInvoiceOut>("/payments/invoice", {
        booking_id: booking.id,
        confirmation_code: code.toUpperCase(),
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

  const launchRazorpay = async (amountInr: number) => {
    if (!booking || !code) return;
    if (amountInr < 1) { setPayError("Minimum payable amount is ₹1."); return; }
    setPaying(true);
    setPayError("");
    try {
      // Step 1: Create Razorpay order
      const orderRes = await api.post<RazorpayOrderOut>("/payments/create-order", {
        booking_id: booking.id,
        confirmation_code: code.toUpperCase(),
        amount: amountInr,
      });
      const orderData = orderRes.data;

      // Step 2: Load Razorpay Checkout.js
      await loadRazorpayScript();
      setPaying(false); // release while modal is open

      // Step 3: Open Razorpay modal
      const rzpInstance = new window.Razorpay({
        key: orderData.razorpay_key_id,
        amount: Math.round(orderData.amount * 100), // INR → paise
        currency: orderData.currency,
        name: "DspireZone Events",
        description: `Booking ${booking.confirmation_code} – Payment`,
        order_id: orderData.razorpay_order_id,
        prefill: {
          name: state?.contactName || booking.contact_name || undefined,
          email: state?.contactEmail || booking.contact_email || undefined,
          contact: state?.contactPhone || booking.contact_phone || undefined,
        },
        theme: { color: BRAND.purple },
        handler: (response) => {
          void (async () => {
            setPaying(true);
            setPayError("");
            try {
              // Step 4: Verify payment signature
              await api.post("/payments/verify", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              // Step 5: Refresh booking to reflect updated payment totals
              const refreshed = await api.get<BookingWithPayments>(`/bookings/by-code/${code.toUpperCase()}`);
              setBooking(refreshed.data);
              setPayDialogOpen(false);
              setPayAmount("");
            } catch {
              setPayError(
                "Payment received but verification failed. Contact support with Payment ID: " +
                  response.razorpay_payment_id,
              );
            } finally {
              setPaying(false);
            }
          })();
        },
        modal: {
          ondismiss: () => {
            setPayError("Payment window closed. You can try again.");
          },
        },
      });

      rzpInstance.open();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Unable to initiate payment");
      setPaying(false);
    }
  };

  const handleRazorpayPayment = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) { setPayError("Enter a valid payment amount."); return; }
    await launchRazorpay(amount);
  };

  if (loadingData || !state || !venue) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  const minDuration = Math.max(2, venue.min_hours);
  const durations = Array.from({ length: Math.max(1, 12 - (minDuration - 1)) }, (_, i) => minDuration + i);

  const toggleAddon = (id: number) => {
    patchState({ addons: state.addons.includes(id) ? state.addons.filter((x) => x !== id) : [...state.addons, id] });
  };

  const accordionPanel = (id: string) => ({
    expanded: expanded === id,
    onChange: (_: React.SyntheticEvent, isExpanded: boolean) => setExpanded(isExpanded ? id : false),
  });

  return (
    <Box sx={{ py: { xs: 3, md: 6 }, minHeight: "80vh", bgcolor: "background.default" }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate("/")} sx={{ mb: 1 }}>
            Back to Home
          </Button>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Modify Booking
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label={`Order: ${booking?.confirmation_code}`} color="secondary" variant="filled" sx={{ fontWeight: 700 }} />
            <Chip label={booking?.status?.toUpperCase()} color={booking?.status === "confirmed" ? "success" : "default"} variant="outlined" />
          </Stack>
        </Box>

        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSaveSuccess(false)}>
            <strong>Changes saved successfully!</strong> Your booking has been updated.
          </Alert>
        )}
        {saveError && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setSaveError("")}>
            {saveError}
          </Alert>
        )}

        {/* ── Date & Time ────────────────────────────────────────── */}
        <Accordion {...accordionPanel("datetime")}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1 }}>
              <Typography fontWeight={700}>📅 Date & Time</Typography>
              {state.date && state.startTime && (
                <Chip
                  size="small"
                  label={`${state.date.format("DD MMM YYYY")} · ${state.startTime.format("hh:mm A")} (${state.durationHours}h)`}
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Event Date"
                    value={state.date}
                    onChange={(v) => patchState({ date: v, startTime: null })}
                    disablePast
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Duration (hours)</InputLabel>
                    <Select
                      value={state.durationHours}
                      label="Duration (hours)"
                      onChange={(e) => patchState({ durationHours: Number(e.target.value), startTime: null })}
                    >
                      {durations.map((h) => (
                        <MenuItem key={h} value={h}>{h} hours</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                {state.date && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Available Start Times for {state.date.format("DD MMM YYYY")}
                    </Typography>
                    {loadingSlots ? (
                      <Box sx={{ display: "flex", gap: 1 }}>{[...Array(4)].map((_, i) => <Chip key={i} label="..." sx={{ opacity: 0.4 }} />)}</Box>
                    ) : slotsError ? (
                      <Alert severity="error">{slotsError}</Alert>
                    ) : availableSlots.length === 0 ? (
                      <Alert severity="warning">No available slots on this date.</Alert>
                    ) : (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {/* Always show the currently selected slot even if it's not in available list (it's the booking's own slot) */}
                        {(() => {
                          const currentSlot = booking?.start_time?.slice(0, 5);
                          const allSlots = currentSlot && !availableSlots.includes(currentSlot)
                            ? [currentSlot, ...availableSlots].sort()
                            : availableSlots;
                          return allSlots.map((slot) => {
                            const isSelected = state.startTime?.format("HH:mm") === slot;
                            const isCurrentBooking = slot === currentSlot;
                            const start = dayjs(`${state.date!.format("YYYY-MM-DD")}T${slot}`);
                            const end = start.add(state.durationHours, "hour");
                            return (
                              <Chip
                                key={slot}
                                label={`${start.format("hh:mm A")} - ${end.format("hh:mm A")} IST${isCurrentBooking ? " (current)" : ""}`}
                                color={isSelected ? "secondary" : isCurrentBooking ? "primary" : "default"}
                                variant={isSelected ? "filled" : "outlined"}
                                clickable
                                onClick={() => patchState({ startTime: dayjs(`${state.date!.format("YYYY-MM-DD")}T${slot}`) })}
                              />
                            );
                          });
                        })()}
                      </Box>
                    )}
                  </Grid>
                )}
              </Grid>
            </LocalizationProvider>
          </AccordionDetails>
        </Accordion>

        {/* ── Service Add-ons ────────────────────────────────────── */}
        <Accordion {...accordionPanel("addons")}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1 }}>
              <Typography fontWeight={700}>⚙️ Service Add-ons</Typography>
              {state.addons.length > 0 && (
                <Chip size="small" label={`${state.addons.length} selected`} color="primary" variant="outlined" />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {catalogItems.filter((c) => c.type === "service_addon").map((item) => {
                const selected = state.addons.includes(item.id);
                const cost = item.price_type === "per_hour" ? item.price * state.durationHours : item.price;
                return (
                  <Grid item xs={12} sm={6} key={item.id}>
                    <Card
                      sx={{ cursor: "pointer", border: `2px solid ${selected ? BRAND.purple : "transparent"}`, bgcolor: selected ? `${BRAND.purple}08` : "background.paper", transition: "all 0.2s" }}
                      onClick={() => toggleAddon(item.id)}
                    >
                      <CardContent>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <Box flex={1}>
                            <Typography variant="subtitle1" fontWeight={700}>{item.name}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{item.description}</Typography>
                            <Typography variant="body2" color="primary" fontWeight={700} sx={{ mt: 1 }}>
                              ₹{cost.toLocaleString("en-IN")}{item.price_type === "per_hour" ? "/hr" : ""}
                            </Typography>
                          </Box>
                          <Checkbox checked={selected} color="primary" size="small" onChange={() => toggleAddon(item.id)} onClick={(e) => e.stopPropagation()} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* ── Food Court Tables ──────────────────────────────────── */}
        <Accordion {...accordionPanel("foodcourt")}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1 }}>
              <Typography fontWeight={700}>🍽️ Food Court Tables</Typography>
              {state.foodcourtTablesCount > 0 && (
                <Chip size="small" label={`${state.foodcourtTablesCount} table${state.foodcourtTablesCount > 1 ? "s" : ""}`} color="primary" variant="outlined" />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} flex={1}>Number of Tables</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <IconButton size="small" onClick={() => patchState({ foodcourtTablesCount: Math.max(0, state.foodcourtTablesCount - 1) })} disabled={state.foodcourtTablesCount === 0}>
                      <Remove />
                    </IconButton>
                    <Typography variant="h6" sx={{ minWidth: 32, textAlign: "center" }}>{state.foodcourtTablesCount}</Typography>
                    <IconButton size="small" onClick={() => patchState({ foodcourtTablesCount: state.foodcourtTablesCount + 1 })}>
                      <Add />
                    </IconButton>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Food court notes (optional)"
                  fullWidth multiline rows={2}
                  value={state.foodcourtTableNotes}
                  onChange={(e) => patchState({ foodcourtTableNotes: e.target.value })}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* ── Food Selection ─────────────────────────────────────── */}
        <Accordion {...accordionPanel("food")}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1 }}>
              <Typography fontWeight={700}>🥗 Food Selection</Typography>
              {foodSubtotal > 0 && (
                <Chip size="small" label={`₹${foodSubtotal.toLocaleString("en-IN")}`} color="secondary" variant="outlined" />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {FOOD_MENU.map((item) => {
                const qty = state.foodSelections[item.key] ?? 0;
                const cost = item.step > 1 ? (qty / item.step) * item.price : item.price * qty;
                return (
                  <Grid item xs={12} sm={6} key={item.key}>
                    <Card variant="outlined" sx={{ borderRadius: 2, border: qty > 0 ? `2px solid ${BRAND.gold}` : "1px solid", borderColor: qty > 0 ? BRAND.gold : "divider" }}>
                      <Box sx={{ bgcolor: item.bg, height: 80, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, userSelect: "none" }}>
                        {item.emoji}
                      </Box>
                      <CardContent sx={{ pt: 1.5, pb: "12px !important" }}>
                        <Typography variant="subtitle2" fontWeight={700}>{item.label}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>{item.note}</Typography>
                        <Typography variant="body2" fontWeight={700} color="secondary.dark" sx={{ mb: 1 }}>{item.priceLabel}</Typography>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <IconButton size="small" onClick={() => patchState({ foodSelections: { ...state.foodSelections, [item.key]: Math.max(0, qty - item.step) } })} disabled={qty === 0}>
                              <Remove fontSize="small" />
                            </IconButton>
                            <Typography variant="h6" sx={{ minWidth: 32, textAlign: "center", fontWeight: 700 }}>{qty}</Typography>
                            <IconButton size="small" onClick={() => patchState({ foodSelections: { ...state.foodSelections, [item.key]: qty + item.step } })}>
                              <Add fontSize="small" />
                            </IconButton>
                          </Box>
                          {qty > 0 && <Chip size="small" label={`₹${cost.toLocaleString("en-IN")}`} color="secondary" />}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* ── Favors & Essentials ────────────────────────────────── */}
        <Accordion {...accordionPanel("favors")}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1 }}>
              <Typography fontWeight={700}>🎁 Favors & Essentials</Typography>
              {Object.values(state.favors).some((q) => q > 0) && (
                <Chip size="small" label="items selected" color="primary" variant="outlined" />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {catalogItems.filter((c) => c.type === "favor_essential").map((item) => {
                const qty = state.favors[item.id] ?? 0;
                return (
                  <Grid item xs={12} sm={6} key={item.id}>
                    <Card sx={{ border: qty > 0 ? `2px solid ${BRAND.gold}` : "1px solid", borderColor: qty > 0 ? BRAND.gold : "divider" }}>
                      <CardContent>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <Box flex={1}>
                            <Typography variant="subtitle2" fontWeight={700}>{item.name}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ my: 0.5 }}>{item.description}</Typography>
                            <Typography variant="body2" color="secondary.dark" fontWeight={700}>₹{item.price.toLocaleString("en-IN")} / unit</Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <IconButton size="small" onClick={() => patchState({ favors: { ...state.favors, [item.id]: Math.max(0, qty - 1) } })} disabled={qty === 0}>
                              <Remove fontSize="small" />
                            </IconButton>
                            <Typography variant="body1" sx={{ minWidth: 24, textAlign: "center", fontWeight: 700 }}>{qty}</Typography>
                            <IconButton size="small" onClick={() => patchState({ favors: { ...state.favors, [item.id]: qty + 1 } })}>
                              <Add fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                        {qty > 0 && <Chip size="small" label={`₹${(item.price * qty).toLocaleString("en-IN")} subtotal`} color="secondary" sx={{ mt: 1 }} />}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* ── Contact Details ────────────────────────────────────── */}
        <Accordion {...accordionPanel("contact")}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography fontWeight={700}>👤 Contact Details</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Full Name" value={state.contactName} onChange={(e) => patchState({ contactName: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth type="email" label="Email Address" value={state.contactEmail} onChange={(e) => patchState({ contactEmail: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Phone Number" value={state.contactPhone} onChange={(e) => patchState({ contactPhone: e.target.value })} />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* ── Order Summary & Actions ────────────────────────────── */}
        <Paper sx={{ mt: 3, p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Order Summary
          </Typography>

          {/* Price comparison */}
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography color="text.secondary">Original Total</Typography>
              <Typography fontWeight={600}>₹{(booking?.total_price ?? 0).toLocaleString("en-IN")}</Typography>
            </Box>
            {loadingPrice ? (
              <Box sx={{ display: "flex", justifyContent: "center" }}><CircularProgress size={20} /></Box>
            ) : priceBreakdown ? (
              <>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography color="text.secondary">Updated Total (excl. food)</Typography>
                  <Typography fontWeight={600}>₹{priceBreakdown.total.toLocaleString("en-IN")}</Typography>
                </Box>
                {foodSubtotal > 0 && (
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="text.secondary">Food Subtotal</Typography>
                    <Typography fontWeight={600}>₹{foodSubtotal.toLocaleString("en-IN")}</Typography>
                  </Box>
                )}
              </>
            ) : null}
            <Divider />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography fontWeight={800} variant="subtitle1">New Total</Typography>
              <Typography fontWeight={800} variant="subtitle1" color="secondary.main">
                ₹{newTotal.toLocaleString("en-IN")}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography color="text.secondary">Amount Paid</Typography>
              <Typography fontWeight={600} color="success.main">₹{totalPaid.toLocaleString("en-IN")}</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography fontWeight={700}>
                {isOverpaid ? "Overpayment (to be refunded)" : "Remaining Due"}
              </Typography>
              <Typography fontWeight={700} color={isOverpaid ? "warning.main" : remainingDue > 0 ? "error.main" : "success.main"}>
                {isOverpaid ? `-₹${(totalPaid - newTotal).toLocaleString("en-IN")}` : `₹${remainingDue.toLocaleString("en-IN")}`}
              </Typography>
            </Box>
          </Stack>

          {isOverpaid && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              You have overpaid by ₹{(totalPaid - newTotal).toLocaleString("en-IN")}. Please contact us for a refund.
            </Alert>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
              onClick={handleSave}
              disabled={saving}
              sx={{ flex: 1, fontWeight: 700 }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            {remainingDue > 0 && !isOverpaid && (
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  startIcon={paying ? <CircularProgress size={18} color="inherit" /> : <PaymentIcon />}
                  onClick={() => void launchRazorpay(remainingDue)}
                  disabled={paying}
                  sx={{ width: "100%", fontWeight: 700 }}
                >
                  {paying ? "Processing…" : `Pay ₹${remainingDue.toLocaleString("en-IN")} via Razorpay`}
                </Button>
                <Button
                  size="small"
                  color="secondary"
                  variant="text"
                  onClick={() => { setPayAmount(""); setPayDialogOpen(true); }}
                  sx={{ fontSize: "0.75rem", textTransform: "none" }}
                >
                  Pay a different / partial amount
                </Button>
              </Box>
            )}
          </Stack>
        </Paper>

        {/* ── Audit Log ──────────────────────────────────────────── */}
        {booking && booking.audit_logs.length > 0 && (
          <Paper sx={{ mt: 3, p: 3, borderRadius: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <History color="action" />
              <Typography variant="h6" fontWeight={700}>Change History</Typography>
            </Box>
            <Stack spacing={2} divider={<Divider />}>
              {[...booking.audit_logs].reverse().map((log) => (
                <Box key={log.id}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={700}>{log.changed_by_name ?? "Unknown"}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {log.changed_at ? dayjs(log.changed_at).tz("Asia/Kolkata").format("DD MMM YYYY, hh:mm A") + " IST" : ""}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">{log.change_summary}</Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        )}

        {/* ── Invoice ────────────────────────────────────────────── */}
        {booking && (
          <Paper sx={{ mt: 3, p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Invoice</Typography>
            <Divider sx={{ mb: 2 }} />

            {/* Payment Summary */}
            <Stack direction="row" spacing={3} sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Invoice Total</Typography>
                <Typography fontWeight={700}>₹{newTotal.toLocaleString("en-IN")}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Amount Paid</Typography>
                <Typography fontWeight={700} color="success.main">₹{totalPaid.toLocaleString("en-IN")}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Balance Due</Typography>
                <Typography fontWeight={700} color={remainingDue > 0 ? "warning.dark" : "success.main"}>
                  ₹{remainingDue.toLocaleString("en-IN")}
                </Typography>
              </Box>
            </Stack>
            <Divider sx={{ mb: 2 }} />

            {invoiceData ? (
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                  <CheckCircle sx={{ color: "success.main", fontSize: 20 }} />
                  <Typography variant="body2" color="success.main" fontWeight={600}>
                    Invoice {invoiceData.invoice_id}
                  </Typography>
                </Stack>
                <Button
                  variant="contained"
                  size="small"
                  href={invoiceData.short_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ alignSelf: "flex-start", bgcolor: BRAND.purple, "&:hover": { bgcolor: "#3a0a72" } }}
                >
                  View Invoice
                </Button>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => void handleGenerateInvoice()}
                  disabled={invoiceLoading}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {invoiceLoading ? "Refreshing…" : "Refresh Invoice Status"}
                </Button>
              </Stack>
            ) : (
              <Stack spacing={1.5}>
                <Typography variant="body2" color="text.secondary">
                  Download or view a hosted invoice for this booking.
                </Typography>
                {invoiceError && (
                  <Typography variant="body2" color="error">{invoiceError}</Typography>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => void handleGenerateInvoice()}
                  disabled={invoiceLoading}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {invoiceLoading ? "Generating…" : "Generate Invoice"}
                </Button>
              </Stack>
            )}
          </Paper>
        )}
      </Container>

      {/* ── Payment Dialog ─────────────────────────────────────── */}
      <Dialog open={payDialogOpen} onClose={() => { setPayDialogOpen(false); setPayError(""); }} maxWidth="xs" fullWidth>
        <DialogTitle>Pay via Razorpay</DialogTitle>
        <DialogContent>
          {payError && <Alert severity="error" sx={{ mb: 2 }}>{payError}</Alert>}
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Enter the amount to pay now. Remaining due: <strong>₹{remainingDue.toLocaleString("en-IN")}</strong>
          </Typography>
          <TextField
            fullWidth
            label="Payment Amount (₹)"
            type="number"
            inputProps={{ min: 1, max: remainingDue, step: 1 }}
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            helperText="You can pay a partial or full amount."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setPayDialogOpen(false); setPayError(""); }} disabled={paying}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleRazorpayPayment}
            disabled={paying || !payAmount}
            startIcon={paying ? <CircularProgress size={16} color="inherit" /> : <PaymentIcon />}
            sx={{ fontWeight: 700 }}
          >
            {paying ? "Processing…" : `Pay ₹${Number(payAmount || 0).toLocaleString("en-IN")} via Razorpay`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
