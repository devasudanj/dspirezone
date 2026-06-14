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
  BookingWithPayments, BookingLineItem, Payment, BookingAuditLog, SplitInvoiceOut,
} from "../types";
import type { FoodMenuItem } from "../types";

// ─── Normalize catalog food_item to FoodMenuItem ─────────────────────────────────
function toFoodMenuItem(item: import("../types").CatalogItem): FoodMenuItem {
  return {
    key: String(item.id),
    id: item.id,
    label: item.name,
    note: item.description ?? "",
    price: item.price,
    priceLabel: item.price_label ?? `\u20b9${item.price} per ${item.unit_label ?? "item"}`,
    emoji: item.emoji ?? "\u{1f37d}\ufe0f",
    bg: item.bg_color ?? "#f5f5f5",
    shared: item.shared ?? false,
    step: item.step ?? 1,
    active: item.active,
    sort_order: item.sort_order,
    images: [item.thumbnail_url, item.image_url_2, item.image_url_3].filter((u): u is string => !!u),
    category: item.category ?? item.name,
    moq: item.min_order_qty ?? 10,
  };
}

/** Parse food selections from booking notes, matched against the live food menu. */
function parseFoodSelectionsFromNotes(
  notes: string | null | undefined,
  menu: FoodMenuItem[]
): Record<string, number> {
  if (!notes || menu.length === 0) return {};
  const result: Record<string, number> = {};
  for (const item of menu) {
    const escapedLabel = item.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = notes.match(new RegExp(`${escapedLabel}\\s*[\u00d7x]\\s*(\\d+)`, "i"));
    if (match) {
      result[item.key] = parseInt(match[1], 10);
    }
  }
  return result;
}────

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
  discountCode: string;
  discountPct: number;
}

function buildStateFromBooking(booking: BookingWithPayments, venueMinHours: number, menu: FoodMenuItem[] = []): ModifyState {
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
    foodSelections: parseFoodSelectionsFromNotes(booking.notes, menu),
    favors,
    contactName: booking.contact_name ?? "",
    contactEmail: booking.contact_email ?? "",
    contactPhone: booking.contact_phone ?? "",
    notes: booking.notes ?? "",
    discountCode: booking.discount_code ?? "",
    discountPct: booking.discount_pct ?? 0,
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
  const [foodMenu, setFoodMenu] = useState<FoodMenuItem[]>([]);
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
  const [invoiceData, setInvoiceData] = useState<SplitInvoiceOut | null>(null);
  const [invoiceError, setInvoiceError] = useState("");

  // Discount code
  const [discountInput, setDiscountInput] = useState("");
  const [discountMsg, setDiscountMsg] = useState("");
  const [discountStatus, setDiscountStatus] = useState<"" | "success" | "error">("" );
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [changingDiscount, setChangingDiscount] = useState(false);

  const patchState = (patch: Partial<ModifyState>) =>
    setState((prev) => prev ? { ...prev, ...patch } : null);

  // Load booking if not passed via state
  useEffect(() => {
    if (booking) return;
    if (!code) { navigate("/modify-booking"); return; }
    api.get<BookingWithPayments>(`/bookings/by-code/${code.toUpperCase()}`)
      .then((r) => {
        setBooking(r.data);
        if (r.data.razorpay_invoice_id) {
          setInvoiceData({
            booking_id: r.data.id,
            event_invoice_id: r.data.razorpay_invoice_id,
            event_invoice_ref: `DZ/E/-${String(r.data.id).padStart(5, "0")}`,
            event_invoice_short_url: r.data.razorpay_invoice_short_url || "",
            event_invoice_status: "issued",
            event_invoice_amount: r.data.total_price,
            food_invoice_id: r.data.razorpay_food_invoice_id || undefined,
            food_invoice_ref: r.data.razorpay_food_invoice_id
              ? `DZ/G/-${String(r.data.id).padStart(5, "0")}`
              : undefined,
            food_invoice_short_url: r.data.razorpay_food_invoice_short_url || undefined,
            food_invoice_status: r.data.razorpay_food_invoice_id ? "issued" : undefined,
            food_invoice_amount: r.data.food_amount_pretax
              ? Math.round(r.data.food_amount_pretax * 1.05 * 100) / 100
              : undefined,
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

  // Load food menu from backend
  useEffect(() => {
    api.get<CatalogItem[]>("/catalog?type=food_item&active_only=true")
      .then((r) => setFoodMenu(r.data.map(toFoodMenuItem)))
      .catch(() => setFoodMenu([]));
  }, []);

  // Load food menu from backend
  useEffect(() => {
    api.get<CatalogItem[]>("/catalog?type=food_item&active_only=true")
      .then((r) => setFoodMenu(r.data.map(toFoodMenuItem)))
      .catch(() => setFoodMenu([]));
  }, []);

  // When booking loads after venue
  useEffect(() => {
    if (booking && venue && !state) {
      setState(buildStateFromBooking(booking, venue.min_hours, foodMenu));
    }
  }, [booking, venue, state, foodMenu]);

  // Re-parse food selections once the food menu has loaded (initial parse used empty menu)
  useEffect(() => {
    if (booking && foodMenu.length > 0) {
      const parsed = parseFoodSelectionsFromNotes(booking.notes, foodMenu);
      if (Object.keys(parsed).length > 0) {
        setState((prev) => prev ? { ...prev, foodSelections: parsed } : prev);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foodMenu]);

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

  const foodSubtotal = foodMenu.reduce((sum, m) => {
    const qty = state?.foodSelections[m.key] ?? 0;
    return sum + (m.step > 1 ? (qty / m.step) * m.price : m.price * qty);
  }, 0);

  // GST: event services @ 18%, food @ 5%.
  // `booking.total_price` already includes event+GST and food+GST as committed to DB.
  // `foodSubtotal` is the current (possibly edited) food selection.
  // When venue/duration/addons changed, `priceBreakdown` holds the fresh event base price.
  // When only food changed (no priceBreakdown), compute delta against the saved food amount.
  const savedFoodPretax = booking?.food_amount_pretax ?? 0;
  // Discount applies to venue subtotal only (same logic as BookingFlow)
  const venueSubtotalForDiscount = priceBreakdown?.venue_subtotal ?? 0;
  const discountSaving = (state?.discountPct ?? 0) > 0 && priceBreakdown
    ? Math.round(venueSubtotalForDiscount * ((state?.discountPct ?? 0) / 100) * 100) / 100
    : 0;
  const newTotal = priceBreakdown
    ? Math.round(((priceBreakdown.total - discountSaving) * 1.18 + foodSubtotal * 1.05) * 100) / 100
    : Math.round(((booking?.total_price ?? 0) + (foodSubtotal - savedFoodPretax) * 1.05) * 100) / 100;
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
      const foodNoteLines = foodMenu
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
        food_amount_pretax: foodSubtotal > 0 ? foodSubtotal : 0,
        contact_name: state.contactName || undefined,
        contact_email: state.contactEmail || undefined,
        contact_phone: state.contactPhone || undefined,
        changed_by_name: state.contactName || "Guest",
        discount_code: state.discountCode || "",  // empty string removes discount
      });
      const savedBooking = res.data;
      setBooking(savedBooking);
      setSaveSuccess(true);

      // Refresh invoice display state — backend has already regenerated the Razorpay invoice
      // as part of the save, so just fetch the current state (no force_regenerate needed).
      if (savedBooking.razorpay_invoice_id) {
        setInvoiceLoading(true);
        setInvoiceError("");
        try {
          const invRes = await api.post<SplitInvoiceOut>("/payments/invoice", {
            booking_id: savedBooking.id,
            confirmation_code: code.toUpperCase(),
            force_regenerate: false,
          });
          setInvoiceData(invRes.data);
        } catch {
          // Non-fatal: invoice display may be slightly stale; user can refresh manually
        } finally {
          setInvoiceLoading(false);
        }
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateInvoice = async (forceRegenerate = false) => {
    if (!booking || !code) return;
    setInvoiceLoading(true);
    setInvoiceError("");
    try {
      const res = await api.post<SplitInvoiceOut>("/payments/invoice", {
        booking_id: booking.id,
        confirmation_code: code.toUpperCase(),
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

  const applyDiscountCode = async (code: string) => {
    if (!code.trim()) return;
    setApplyingDiscount(true);
    setDiscountMsg("");
    setDiscountStatus("");
    try {
      const res = await api.post<{ valid: boolean; discount_pct: number; message: string }>(
        "/discounts/validate",
        { code: code.trim().toUpperCase(), booking_date: state?.date?.format("YYYY-MM-DD") },
      );
      if (res.data.valid) {
        patchState({ discountCode: code.trim().toUpperCase(), discountPct: res.data.discount_pct });
        setDiscountInput("");
        setChangingDiscount(false);
        setDiscountStatus("success");
        setDiscountMsg(res.data.message || `${res.data.discount_pct}% off venue cost applied!`);
      } else {
        setDiscountStatus("error");
        setDiscountMsg(res.data.message || "Invalid or expired discount code.");
      }
    } catch {
      setDiscountStatus("error");
      setDiscountMsg("Could not validate discount code. Please try again.");
    } finally {
      setApplyingDiscount(false);
    }
  };

  const removeDiscount = () => {
    patchState({ discountCode: "", discountPct: 0 });
    setDiscountInput("");
    setDiscountMsg("");
    setDiscountStatus("");
    setChangingDiscount(false);
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
            {booking?.razorpay_invoice_id && " A confirmation email with your updated invoice link has been sent."}
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
              {foodMenu.map((item) => {
                const qty = state.foodSelections[item.key] ?? 0;
                const cost = item.step > 1 ? (qty / item.step) * item.price : item.price * qty;
                const primaryImage = item.images[0];
                return (
                  <Grid item xs={12} sm={6} key={item.key}>
                    <Card variant="outlined" sx={{ borderRadius: 2, border: qty > 0 ? `2px solid ${BRAND.gold}` : "1px solid", borderColor: qty > 0 ? BRAND.gold : "divider", overflow: "hidden", height: "100%" }}>
                      <Box sx={{ display: "flex", minHeight: 150 }}>
                        {/* Left: thumbnail/emoji + name + price + stepper */}
                        <Box sx={{ bgcolor: item.bg, p: 1.5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", minWidth: 120, maxWidth: 120, gap: 1, position: "relative", overflow: "hidden" }}>
                          {primaryImage && (
                            <Box component="img" src={primaryImage} alt={item.label} sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
                          )}
                          {primaryImage && (
                            <Box sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.32)" }} />
                          )}
                          <Typography sx={{ fontSize: 38, userSelect: "none", lineHeight: 1, position: "relative", zIndex: 1, filter: primaryImage ? "drop-shadow(0 1px 2px rgba(0,0,0,0.7))" : "none" }}>{item.emoji}</Typography>
                          <Box sx={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2, color: primaryImage ? "white" : "inherit", textShadow: primaryImage ? "0 1px 3px rgba(0,0,0,0.8)" : "none" }}>{item.label}</Typography>
                            <Typography variant="caption" fontWeight={700} color={primaryImage ? "rgba(255,255,255,0.9)" : "secondary.dark"} display="block" sx={{ mt: 0.5 }}>{item.priceLabel}</Typography>
                          </Box>
                          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, position: "relative", zIndex: 1 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <IconButton size="small" onClick={() => patchState({ foodSelections: { ...state.foodSelections, [item.key]: Math.max(0, qty - item.step) } })} disabled={qty === 0} sx={{ bgcolor: primaryImage ? "rgba(255,255,255,0.2)" : undefined }}>
                                <Remove fontSize="small" />
                              </IconButton>
                              <Typography variant="h6" sx={{ minWidth: 28, textAlign: "center", fontWeight: 700, color: primaryImage ? "white" : "inherit" }}>{qty}</Typography>
                              <IconButton size="small" onClick={() => patchState({ foodSelections: { ...state.foodSelections, [item.key]: qty + item.step } })} sx={{ bgcolor: primaryImage ? "rgba(255,255,255,0.2)" : undefined }}>
                                <Add fontSize="small" />
                              </IconButton>
                            </Box>
                            {qty > 0 && <Chip size="small" label={`₹${cost.toLocaleString("en-IN")}`} color="secondary" />}
                          </Box>
                        </Box>
                        {/* Right: multiline description */}
                        {item.note && (
                          <Box sx={{ flex: 1, p: 1.5, borderLeft: "1px solid", borderColor: "divider", overflowY: "auto", maxHeight: 200 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7, display: "block" }}>
                              {item.note}
                            </Typography>
                            {item.images.length > 0 && (
                              <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
                                {item.images.slice(0, 3).map((img, idx) => (
                                  <Box
                                    key={`${item.key}-img-${idx}`}
                                    component="img"
                                    src={img}
                                    alt={`${item.label} ${idx + 1}`}
                                    sx={{ width: 56, height: 42, objectFit: "cover", borderRadius: 1, border: "1px solid", borderColor: "divider" }}
                                  />
                                ))}
                              </Stack>
                            )}
                          </Box>
                        )}
                      </Box>
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

        {/* ── Discount Code ─────────────────────────────────────── */}
        <Accordion {...accordionPanel("discount")}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1 }}>
              <Typography fontWeight={700}>🏷️ Discount Code</Typography>
              {state.discountCode && (
                <Chip
                  size="small"
                  label={`${state.discountCode} – ${state.discountPct}% off`}
                  color="success"
                  variant="outlined"
                />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {state.discountCode && !changingDiscount ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Alert severity="success" icon={false}>
                  <strong>Discount applied:</strong> {state.discountCode} – {state.discountPct}% off venue cost
                </Alert>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button size="small" variant="outlined" onClick={() => { setChangingDiscount(true); setDiscountInput(state.discountCode); }}>
                    Change Code
                  </Button>
                  <Button size="small" variant="outlined" color="error" onClick={removeDiscount}>
                    Remove Discount
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {!state.discountCode && (
                  <Typography variant="body2" color="text.secondary">
                    Have a discount code? Enter it below to apply a discount to your venue cost.
                  </Typography>
                )}
                <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                  <TextField
                    label="Discount Code"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                    size="small"
                    sx={{ flex: 1 }}
                    inputProps={{ style: { textTransform: "uppercase" } }}
                    onKeyDown={(e) => { if (e.key === "Enter") void applyDiscountCode(discountInput); }}
                  />
                  <Button
                    variant="contained"
                    size="medium"
                    onClick={() => void applyDiscountCode(discountInput)}
                    disabled={applyingDiscount || !discountInput.trim()}
                    sx={{ height: 40, whiteSpace: "nowrap" }}
                  >
                    {applyingDiscount ? <CircularProgress size={16} color="inherit" /> : "Apply"}
                  </Button>
                  {changingDiscount && (
                    <Button size="medium" variant="text" sx={{ height: 40 }} onClick={() => { setChangingDiscount(false); setDiscountInput(""); setDiscountMsg(""); setDiscountStatus(""); }}>
                      Cancel
                    </Button>
                  )}
                </Box>
                {discountMsg && (
                  <Alert severity={discountStatus === "success" ? "success" : discountStatus === "error" ? "error" : "info"} sx={{ py: 0.5 }}>
                    {discountMsg}
                  </Alert>
                )}
              </Box>
            )}
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
                {discountSaving > 0 && (
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="success.main">🏷️ Discount ({state.discountCode} – {state.discountPct}% off venue)</Typography>
                    <Typography color="success.main" fontWeight={600}>-₹{Math.round(discountSaving * 1.18).toLocaleString("en-IN")}</Typography>
                  </Box>
                )}
                {foodSubtotal > 0 && (
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="text.secondary">Food Subtotal</Typography>
                    <Typography fontWeight={600}>₹{foodSubtotal.toLocaleString("en-IN")}</Typography>
                  </Box>
                )}
              </>
            ) : state.discountCode && booking?.discount_code ? (
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography color="success.main">🏷️ {booking.discount_code} ({booking.discount_pct ?? 0}% off)</Typography>
                <Typography color="success.main" fontWeight={600}>applied</Typography>
              </Box>
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
              <Stack spacing={2}>
                {/* Event Invoice */}
                <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1} flexWrap="wrap">
                    <CheckCircle sx={{ color: "success.main", fontSize: 18 }} />
                    <Typography variant="body2" fontWeight={600}>
                      {invoiceData.event_invoice_ref}
                    </Typography>
                    <Chip label="Event · 18% GST" size="small" sx={{ bgcolor: "#ede7f6", color: "#4a148c", fontSize: "0.68rem" }} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    ₹{invoiceData.event_invoice_amount.toLocaleString("en-IN")} · Status: {invoiceData.event_invoice_status}
                  </Typography>
                  {invoiceData.event_invoice_short_url ? (
                    <Button
                      component="a"
                      href={invoiceData.event_invoice_short_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="contained"
                      size="small"
                      sx={{ bgcolor: BRAND.purple, "&:hover": { bgcolor: "#3a0a72" } }}
                    >
                      View Event Invoice
                    </Button>
                  ) : (
                    <Typography variant="caption" color="warning.main">Link not available yet (draft)</Typography>
                  )}
                </Box>

                {/* Food Invoice */}
                {invoiceData.food_invoice_id && (
                  <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1} flexWrap="wrap">
                      <CheckCircle sx={{ color: "success.main", fontSize: 18 }} />
                      <Typography variant="body2" fontWeight={600}>
                        {invoiceData.food_invoice_ref}
                      </Typography>
                      <Chip label="Food · 5% GST" size="small" sx={{ bgcolor: "#e8f5e9", color: "#1b5e20", fontSize: "0.68rem" }} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                      ₹{(invoiceData.food_invoice_amount ?? 0).toLocaleString("en-IN")} · Status: {invoiceData.food_invoice_status}
                    </Typography>
                    {invoiceData.food_invoice_short_url ? (
                      <Button
                        component="a"
                        href={invoiceData.food_invoice_short_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="contained"
                        size="small"
                        sx={{ bgcolor: "#2e7d32", "&:hover": { bgcolor: "#1b5e20" } }}
                      >
                        View Food Invoice
                      </Button>
                    ) : (
                      <Typography variant="caption" color="warning.main">Link not available yet (draft)</Typography>
                    )}
                  </Box>
                )}

                <Button
                  variant="text"
                  size="small"
                  onClick={() => void handleGenerateInvoice(false)}
                  disabled={invoiceLoading}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {invoiceLoading ? "Refreshing…" : "Refresh Invoice Status"}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="warning"
                  onClick={() => void handleGenerateInvoice(true)}
                  disabled={invoiceLoading}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Regenerate Invoices (after modifications)
                </Button>
              </Stack>
            ) : (
              <Stack spacing={1.5}>
                <Typography variant="body2" color="text.secondary">
                  Download or view hosted invoices for this booking.
                </Typography>
                {invoiceError && (
                  <Typography variant="body2" color="error">{invoiceError}</Typography>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => void handleGenerateInvoice(false)}
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
