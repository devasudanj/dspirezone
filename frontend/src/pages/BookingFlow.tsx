import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Container, Typography, Button, Grid, Card, CardContent,
  Stepper, Step, StepLabel, TextField, MenuItem, Chip, Stack,
  Divider, CircularProgress, Alert, Avatar, IconButton, Paper,
  FormControl, InputLabel, Select, Checkbox, FormControlLabel,
  useTheme, useMediaQuery, MobileStepper,
} from "@mui/material";
import {
  Add, Remove, CheckCircle, CelebrationOutlined, ArrowBack, ArrowForward,
} from "@mui/icons-material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import dayjs, { Dayjs } from "dayjs";
import { DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import PriceBreakdown from "../components/PriceBreakdown";
import { BRAND } from "../theme";
import type { Venue, CatalogItem, AvailableSlot, PriceBreakdown as PriceBreakdownType, Booking } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LineItemInput {
  catalog_item_id: number;
  quantity: number;
}

interface BookingState {
  date: Dayjs | null;
  startTime: Dayjs | null;
  durationHours: number;
  addons: number[];                // catalog item ids (services, toggled)
  foodcourtTablesCount: number;
  foodcourtTableNotes: string;
  extraRoomsCount: number;
  foodSelections: Record<string, number>;  // food item key → quantity
  favors: Record<number, number>;  // item_id → quantity
}

interface GuestDetails {
  name: string;
  email: string;
  phone: string;
  estimatedGuests: number | "";
}

const STEPS = [
  "Date & Time",
  "Guest Details",
  "Included Items",
  "Service Add-ons",
  "Food Court Tables",
  "Food Selection",
  "Favors & Essentials",
  "Order Review",
  "Payment",
];

const FOOD_MENU = [
  // ── Personal (per head, not shareable) ──
  { key: "pizza_chicken",         label: "Personal Pizza – Chicken",    note: "Personal size · not shareable",      price: 199, priceLabel: "₹199 per item",         emoji: "🍕", bg: "#fff3e0", shared: false, step: 1  },
  { key: "pizza_veg",             label: "Personal Pizza – Veg",        note: "Personal size · not shareable",      price: 179, priceLabel: "₹179 per item",         emoji: "🍕", bg: "#f1f8e9", shared: false, step: 1  },
  { key: "mutton_biryani_kids",   label: "Mutton Biryani – Kids",       note: "Kids portion · per head",            price: 249, priceLabel: "₹249 per head",         emoji: "🍚", bg: "#fce4ec", shared: false, step: 1  },
  { key: "mutton_biryani_adult",  label: "Mutton Biryani – Adult",      note: "Full adult portion · per head",      price: 349, priceLabel: "₹349 per head",         emoji: "🍛", bg: "#fce4ec", shared: false, step: 1  },
  { key: "chicken_biryani_kids",  label: "Chicken Biryani – Kids",      note: "Kids portion · per head",            price: 199, priceLabel: "₹199 per head",         emoji: "🍚", bg: "#e8f5e9", shared: false, step: 1  },
  { key: "chicken_biryani_adult", label: "Chicken Biryani – Adult",     note: "Full adult portion · per head",      price: 299, priceLabel: "₹299 per head",         emoji: "🍛", bg: "#e8f5e9", shared: false, step: 1  },
  { key: "veg_package",           label: "Veg Package",                 note: "Per head · includes rice & sides",   price: 149, priceLabel: "₹149 per head",         emoji: "🥗", bg: "#e8f5e9", shared: false, step: 1  },
  // ── Shareable ──
  { key: "large_pizza",           label: "Large Pizza",                 note: "Serves 3 people · shareable",        price: 599, priceLabel: "₹599 each (serves 3)",   emoji: "🍕", bg: "#fff3e0", shared: true,  step: 1  },
  { key: "fish_fingers",          label: "Fish Fingers",                note: "Shareable · sold in packs of 10",    price: 299, priceLabel: "₹299 per 10 pcs",       emoji: "🐟", bg: "#e3f2fd", shared: true,  step: 10 },
  { key: "chicken_nuggets",       label: "Chicken Nuggets",             note: "Shareable · sold in packs of 10",    price: 249, priceLabel: "₹249 per 10 pcs",       emoji: "🍗", bg: "#fff8e1", shared: true,  step: 10 },
];

const MotionBox = motion(Box);

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function StepSkeleton() {
  return (
    <Box sx={{ textAlign: "center", py: 8 }}>
      <CircularProgress />
    </Box>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────
function DateTimeStep({
  state, setState, venue, availableSlots, loadingSlots, slotsError,
}: {
  state: BookingState;
  setState: (s: Partial<BookingState>) => void;
  venue: Venue | null;
  availableSlots: AvailableSlot[];
  loadingSlots: boolean;
  slotsError: string;
}) {
  const minDuration = Math.max(2, venue?.min_hours ?? 2);
  const durationCount = Math.max(1, Math.min(10, 12 - (minDuration - 1)));
  const durations = Array.from({ length: durationCount }, (_, i) => minDuration + i);

  const formatWindow = (slot: string) => {
    if (!state.date) return slot;
    const start = dayjs(`${state.date.format("YYYY-MM-DD")}T${slot}`);
    const end = start.add(state.durationHours, "hour");
    return `${start.format("hh:mm A")} - ${end.format("hh:mm A")}`;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <DatePicker
            label="Event Date"
            value={state.date}
            onChange={(v) => setState({ date: v, startTime: null })}
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
              onChange={(e) => setState({ durationHours: Math.max(2, Number(e.target.value)), startTime: null })}
            >
              {durations.map((h) => (
                <MenuItem key={h} value={h}>{h} {h === 1 ? "hour" : "hours"}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {state.date && (
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
              Available Start Times for {state.date.format("DD MMM YYYY")}
            </Typography>
            {loadingSlots ? (
              <Box sx={{ display: "flex", gap: 1 }}>
                {[...Array(4)].map((_, i) => (
                  <Chip key={i} label="Loading..." sx={{ opacity: 0.4 }} />
                ))}
              </Box>
            ) : slotsError ? (
              <Alert severity="error">{slotsError}</Alert>
            ) : availableSlots.length === 0 ? (
              <Alert severity="warning">No available slots on this date. Please try another date.</Alert>
            ) : (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {availableSlots.map((slot) => {
                  const isSelected = state.startTime?.format("HH:mm") === slot;
                  return (
                    <Chip
                      key={slot}
                      label={formatWindow(slot)}
                      color={isSelected ? "secondary" : "default"}
                      variant={isSelected ? "filled" : "outlined"}
                      clickable
                      onClick={() => setState({ startTime: dayjs(`${state.date!.format("YYYY-MM-DD")}T${slot}`) })}
                    />
                  );
                })}
              </Box>
            )}
          </Grid>
        )}

        {state.date && state.startTime && (
          <Grid item xs={12}>
            <Alert severity="success">
              Selected time window: {state.startTime.format("hh:mm A")} - {state.startTime.add(state.durationHours, "hour").format("hh:mm A")} ({state.durationHours} hours)
            </Alert>
          </Grid>
        )}
      </Grid>
    </LocalizationProvider>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────
function IncludedItemsStep({ venue }: { venue: Venue | null }) {
  const items = [
    { icon: "🏠", label: `${venue?.included_rooms_count ?? 1} Private Room${(venue?.included_rooms_count ?? 1) > 1 ? "s" : ""}`, sub: "Complimentary with your booking", highlight: true },
    { icon: "🔊", label: "AV System", sub: "Projector, PA system & microphone" },
    { icon: "🪑", label: "Tables & Chairs", sub: "Setup for your guest count" },
    { icon: "❄️", label: "Air Conditioning", sub: "Climate-controlled hall" },
    { icon: "🚗", label: "Free Self Street Parking", sub: "Self parking is available at site" },
    { icon: "🧹", label: "Post-event Cleanup", sub: "Full cleanup after your event" },
  ];

  return (
    <Box>
      <Alert severity="success" sx={{ mb: 3 }}>
        <strong>1 room is included FREE</strong> with every booking — enjoy your celebration without extra cost.
      </Alert>
      <Grid container spacing={2}>
        {items.map((item, i) => (
          <Grid item xs={12} sm={6} key={i}>
            <Paper
              sx={{
                p: 2,
                border: item.highlight ? `2px solid ${BRAND.gold}` : "1px solid",
                borderColor: item.highlight ? BRAND.gold : "divider",
                borderRadius: 2,
                bgcolor: item.highlight ? `${BRAND.gold}08` : "background.paper",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography sx={{ fontSize: 32 }}>{item.icon}</Typography>
                <Box flex={1}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body1" fontWeight={700}>{item.label}</Typography>
                    {item.highlight && <Chip label="FREE" color="secondary" size="small" sx={{ fontWeight: 800 }} />}
                  </Box>
                  <Typography variant="body2" color="text.secondary">{item.sub}</Typography>
                </Box>
                <CheckCircle sx={{ color: "#4ADE80" }} />
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────
function ServiceAddonsStep({
  catalogItems, state, setState, durationHours,
}: {
  catalogItems: CatalogItem[];
  state: BookingState;
  setState: (s: Partial<BookingState>) => void;
  durationHours: number;
}) {
  const toggle = (id: number) => {
    const current = state.addons;
    setState({ addons: current.includes(id) ? current.filter((x) => x !== id) : [...current, id] });
  };

  return (
    <>
      <Alert severity="info" sx={{ mb: 2 }}>
        Valet parking add-on available: up to 15 cars can be parked for Rs. 1500/hr for your event duration. Free self street parking is also available at site.
      </Alert>
      <Grid container spacing={2}>
        {catalogItems
        .filter((c) => c.type === "service_addon")
        .map((item) => {
          const selected = state.addons.includes(item.id);
          const cost =
            item.price_type === "fixed"
              ? item.price
              : item.price_type === "per_hour"
              ? item.price * durationHours
              : item.price;

          return (
            <Grid item xs={12} sm={6} key={item.id}>
              <Card
                sx={{
                  cursor: "pointer",
                  border: `2px solid ${selected ? BRAND.purple : "transparent"}`,
                  bgcolor: selected ? `${BRAND.purple}08` : "background.paper",
                  transition: "all 0.2s",
                }}
                onClick={() => toggle(item.id)}
              >
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Box flex={1}>
                      <Typography variant="subtitle1" fontWeight={700}>{item.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {item.description}
                      </Typography>
                      <Typography variant="body2" color="primary" fontWeight={700} sx={{ mt: 1 }}>
                        ₹{cost.toLocaleString("en-IN")}
                        {item.price_type === "per_hour" ? "/hr" : ""}
                        {item.price_type === "per_unit" ? "/unit" : ""}
                      </Typography>
                    </Box>
                    <Checkbox
                      checked={selected}
                      color="primary"
                      size="small"
                      onChange={() => toggle(item.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </>
  );
}

// ─── Step 4 ───────────────────────────────────────────────────────────────────
function FoodCourtStep({
  venue, state, setState,
}: {
  venue: Venue | null;
  state: BookingState;
  setState: (s: Partial<BookingState>) => void;
}) {
  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        Food court tables are a paid add-on. Reserve dedicated dining tables for your guests.
      </Alert>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
              Number of Tables
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <IconButton
                size="small"
                onClick={() => setState({ foodcourtTablesCount: Math.max(0, state.foodcourtTablesCount - 1) })}
                disabled={state.foodcourtTablesCount === 0}
              >
                <Remove />
              </IconButton>
              <Typography variant="h6" sx={{ minWidth: 32, textAlign: "center" }}>
                {state.foodcourtTablesCount}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setState({ foodcourtTablesCount: state.foodcourtTablesCount + 1 })}
              >
                <Add />
              </IconButton>
            </Box>
          </Box>
          {venue && state.foodcourtTablesCount > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              ₹{(venue.foodcourt_table_rate * state.foodcourtTablesCount).toLocaleString("en-IN")} total
              {venue.foodcourt_table_rate_type === "per_hour" ? " (estimate)" : ""}
            </Typography>
          )}
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Special notes for food court (optional)"
            placeholder="e.g. dietary requirements, seating preferences…"
            fullWidth
            multiline
            rows={3}
            value={state.foodcourtTableNotes}
            onChange={(e) => setState({ foodcourtTableNotes: e.target.value })}
          />
        </Grid>
      </Grid>
    </Box>
  );
}

// ─── Step 5 ───────────────────────────────────────────────────────────────────
function FoodSelectionStep({
  state, setState,
}: {
  state: BookingState;
  setState: (s: Partial<BookingState>) => void;
}) {
  const setQty = (key: string, delta: number, step: number) => {
    const current = state.foodSelections[key] ?? 0;
    setState({ foodSelections: { ...state.foodSelections, [key]: Math.max(0, current + delta) } });
  };

  const itemCost = (m: (typeof FOOD_MENU)[number]) => {
    const qty = state.foodSelections[m.key] ?? 0;
    return m.step > 1 ? (qty / m.step) * m.price : m.price * qty;
  };
  const totalItems = Object.values(state.foodSelections).reduce((a, b) => a + b, 0);
  const totalCost = FOOD_MENU.reduce((sum, m) => sum + itemCost(m), 0);

  const personalItems = FOOD_MENU.filter((m) => !m.shared);
  const shareableItems = FOOD_MENU.filter((m) => m.shared);

  const renderCard = (item: (typeof FOOD_MENU)[number]) => {
    const qty = state.foodSelections[item.key] ?? 0;
    const cost = itemCost(item);
    return (
      <Grid item xs={12} sm={6} key={item.key}>
        <Card
          variant="outlined"
          sx={{
            borderRadius: 2,
            border: qty > 0 ? `2px solid ${BRAND.gold}` : "1px solid",
            borderColor: qty > 0 ? BRAND.gold : "divider",
            overflow: "hidden",
            transition: "box-shadow 0.2s",
            boxShadow: qty > 0 ? 3 : 0,
          }}
        >
          <Box
            sx={{
              bgcolor: item.bg,
              height: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 52,
              userSelect: "none",
              position: "relative",
            }}
          >
            {item.emoji}
            {item.shared && (
              <Chip
                label="Shareable"
                size="small"
                color="success"
                sx={{ position: "absolute", top: 8, right: 8, fontWeight: 700, fontSize: "0.65rem" }}
              />
            )}
          </Box>
          <CardContent sx={{ pt: 1.5, pb: "12px !important" }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              {item.label}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              {item.note}
            </Typography>
            <Typography variant="body2" fontWeight={700} color="secondary.dark" sx={{ mb: 1.5 }}>
              {item.priceLabel}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <IconButton size="small" onClick={() => setQty(item.key, -item.step, item.step)} disabled={qty === 0}>
                  <Remove fontSize="small" />
                </IconButton>
                <Typography variant="h6" sx={{ minWidth: 32, textAlign: "center", fontWeight: 700 }}>
                  {qty}
                </Typography>
                <IconButton size="small" onClick={() => setQty(item.key, item.step, item.step)}>
                  <Add fontSize="small" />
                </IconButton>
              </Box>
              {qty > 0 && (
                <Chip size="small" label={`₹${cost.toLocaleString("en-IN")}`} color="secondary" />
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Personal items</strong> are individual servings per head and not shareable.
        {" "}<strong>Shareable items</strong> are ordered by quantity and enjoyed by the group.
      </Alert>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>🍽️ Personal Items (per head)</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {personalItems.map(renderCard)}
      </Grid>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>🤝 Shareable Items</Typography>
      <Grid container spacing={2}>
        {shareableItems.map(renderCard)}
      </Grid>

      {totalItems > 0 && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <strong>{totalItems} item{totalItems > 1 ? "s" : ""}</strong> selected · estimated food total:{" "}
          <strong>₹{totalCost.toLocaleString("en-IN")}</strong>. The team will confirm availability before your event.
        </Alert>
      )}
    </Box>
  );
}

// ─── Step 6 ───────────────────────────────────────────────────────────────────
function FavorsStep({
  catalogItems, state, setState,
}: {
  catalogItems: CatalogItem[];
  state: BookingState;
  setState: (s: Partial<BookingState>) => void;
}) {
  const setQty = (id: number, qty: number) => {
    setState({ favors: { ...state.favors, [id]: Math.max(0, qty) } });
  };

  return (
    <Grid container spacing={2}>
      {catalogItems
        .filter((c) => c.type === "favor_essential")
        .map((item) => {
          const qty = state.favors[item.id] ?? 0;
          return (
            <Grid item xs={12} sm={6} key={item.id}>
              <Card sx={{ border: qty > 0 ? `2px solid ${BRAND.gold}` : "1px solid", borderColor: qty > 0 ? BRAND.gold : "divider" }}>
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Box flex={1}>
                      <Typography variant="subtitle2" fontWeight={700}>{item.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ my: 0.5 }}>
                        {item.description}
                      </Typography>
                      <Typography variant="body2" color="secondary.dark" fontWeight={700}>
                        ₹{item.price.toLocaleString("en-IN")} per unit
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <IconButton size="small" onClick={() => setQty(item.id, qty - 1)} disabled={qty === 0}>
                        <Remove fontSize="small" />
                      </IconButton>
                      <Typography variant="body1" sx={{ minWidth: 24, textAlign: "center", fontWeight: 700 }}>
                        {qty}
                      </Typography>
                      <IconButton size="small" onClick={() => setQty(item.id, qty + 1)}>
                        <Add fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  {qty > 0 && (
                    <Chip
                      size="small"
                      label={`₹${(item.price * qty).toLocaleString("en-IN")} subtotal`}
                      color="secondary"
                      sx={{ mt: 1 }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
    </Grid>
  );
}

// ─── Step 7 ───────────────────────────────────────────────────────────────────
function OrderReviewStep({
  state, priceBreakdown, catalogItems, venue, loadingPrice, foodSubtotal,
}: {
  state: BookingState;
  priceBreakdown: PriceBreakdownType | null;
  catalogItems: CatalogItem[];
  venue: Venue | null;
  loadingPrice: boolean;
  foodSubtotal: number;
}) {
  const formatDate = () => state.date ? state.date.format("DD MMM YYYY") : "";
  const formatTime = () => state.startTime ? state.startTime.format("hh:mm A") : "";
  const formatEndTime = () => state.startTime ? state.startTime.add(state.durationHours, "hour").format("hh:mm A") : "";
  const selectedAddons = catalogItems.filter((c) => state.addons.includes(c.id));
  const selectedFavors = catalogItems.filter((c) => (state.favors[c.id] ?? 0) > 0);
  const selectedFood = FOOD_MENU.filter((m) => (state.foodSelections[m.key] ?? 0) > 0);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Typography variant="h6" fontWeight={700} gutterBottom>Booking Summary</Typography>
        <Stack spacing={1.5}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography color="text.secondary">Date</Typography>
            <Typography fontWeight={600}>{formatDate()}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography color="text.secondary">Start Time</Typography>
            <Typography fontWeight={600}>{formatTime()}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography color="text.secondary">End Time</Typography>
            <Typography fontWeight={600}>{formatEndTime()}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography color="text.secondary">Duration</Typography>
            <Typography fontWeight={600}>{state.durationHours} hours</Typography>
          </Box>
          <Divider />
          {selectedAddons.length > 0 && (
            <Box>
              <Typography color="text.secondary" variant="body2" gutterBottom>Add-ons selected:</Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {selectedAddons.map((a) => <Chip key={a.id} label={a.name} size="small" color="primary" variant="outlined" />)}
              </Stack>
            </Box>
          )}
          {state.foodcourtTablesCount > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography color="text.secondary">Food Court Tables</Typography>
              <Typography fontWeight={600}>{state.foodcourtTablesCount}</Typography>
            </Box>
          )}
          {Object.entries(state.foodSelections).filter(([, q]) => q > 0).length > 0 && (
            <Box>
              <Typography color="text.secondary" variant="body2" gutterBottom>Food Selection:</Typography>
              <Stack spacing={0.5}>
                {selectedFood.map((m) => {
                  const qty = state.foodSelections[m.key];
                  const lineCost = m.step > 1 ? (qty / m.step) * m.price : m.price * qty;
                  return (
                    <Box key={m.key} sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2">
                        {m.emoji} {m.label}{m.step > 1 ? ` (×${qty} pcs)` : ` ×${qty}`}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        ₹{lineCost.toLocaleString("en-IN")}
                      </Typography>
                    </Box>
                  );
                })}
                <Box sx={{ display: "flex", justifyContent: "space-between", pt: 0.5, borderTop: "1px dashed", borderColor: "divider" }}>
                  <Typography variant="body2" fontWeight={700} color="text.secondary">Food subtotal</Typography>
                  <Typography variant="body2" fontWeight={700}>₹{foodSubtotal.toLocaleString("en-IN")}</Typography>
                </Box>
              </Stack>
            </Box>
          )}
          {selectedFavors.length > 0 && (
            <Box>
              <Typography color="text.secondary" variant="body2" gutterBottom>Favors & Essentials:</Typography>
              <Stack spacing={0.5}>
                {selectedFavors.map((f) => (
                  <Box key={f.id} sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2">{f.name} × {state.favors[f.id]}</Typography>
                    <Typography variant="body2" fontWeight={600}>₹{(f.price * state.favors[f.id]).toLocaleString("en-IN")}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </Grid>

      <Grid item xs={12} md={6}>
        <Alert severity="info" sx={{ mb: 2 }}>
          To reserve this slot, a <strong>10% advance payment</strong> is required. The remaining amount can be paid later.
        </Alert>

        {loadingPrice ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : priceBreakdown ? (
          <PriceBreakdown breakdown={priceBreakdown} venue={venue} foodSubtotal={foodSubtotal} />
        ) : null}
      </Grid>
    </Grid>
  );
}

function GuestDetailsStep({
  guestDetails,
  setGuestDetails,
}: {
  guestDetails: GuestDetails;
  setGuestDetails: (s: GuestDetails) => void;
}) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Alert severity="info">
          Continue as guest by providing your contact details. No sign-in required — if you've booked with us before, just use the same email and we'll link it to your history.
        </Alert>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Full Name"
          value={guestDetails.name}
          onChange={(e) => setGuestDetails({ ...guestDetails, name: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          type="email"
          label="Email Address"
          value={guestDetails.email}
          onChange={(e) => setGuestDetails({ ...guestDetails, email: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Phone Number"
          value={guestDetails.phone}
          onChange={(e) => setGuestDetails({ ...guestDetails, phone: e.target.value })}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Estimated Number of Guests"
          type="number"
          inputProps={{ min: 1, max: 100 }}
          value={guestDetails.estimatedGuests}
          onChange={(e) => {
            const val = e.target.value === "" ? "" : Math.min(100, Math.max(1, Number(e.target.value)));
            setGuestDetails({ ...guestDetails, estimatedGuests: val });
          }}
          helperText="Maximum 100 guests (60 in party hall + 40 in viewing/food area)"
        />
      </Grid>
      <Grid item xs={12}>
        <Alert severity="info" icon={false}>
          Don't worry, you can change this later. For now, plan for the maximum number of guests.
        </Alert>
      </Grid>
    </Grid>
  );
}

function PaymentStep({
  state,
  priceBreakdown,
  user,
  guestDetails,
  submitting,
  submitError,
  createdBooking,
  onSubmit,
  foodSubtotal,
}: {
  state: BookingState;
  priceBreakdown: PriceBreakdownType | null;
  user: { name?: string; email?: string } | null;
  guestDetails: GuestDetails;
  submitting: boolean;
  submitError: string;
  createdBooking: Booking | null;
  onSubmit: () => void;
  foodSubtotal: number;
}) {
  const total = (priceBreakdown?.total ?? 0) + foodSubtotal;
  const reservationAdvance = total * 0.1;
  const payableNow = Number.isFinite(reservationAdvance) ? reservationAdvance : 0;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={7}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Reservation Checkout
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          This confirms the booking immediately using the demo payment flow. The reserved time will be blocked from future bookings.
        </Alert>
        {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
        {createdBooking && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Booking confirmed. Confirmation code: <strong>{createdBooking.confirmation_code}</strong>
            <Box sx={{ mt: 1 }}>
              <Button
                component={RouterLink}
                to={`/modify-booking/${createdBooking.confirmation_code}`}
                size="small"
                variant="outlined"
                color="success"
                sx={{ fontWeight: 700 }}
              >
                View / Modify This Booking
              </Button>
            </Box>
          </Alert>
        )}
        <Stack spacing={1.2}>
          <Typography><strong>Event Date:</strong> {state.date?.format("DD MMM YYYY")}</Typography>
          <Typography><strong>Time Window:</strong> {state.startTime?.format("hh:mm A")} - {state.startTime?.add(state.durationHours, "hour").format("hh:mm A")}</Typography>
          <Typography><strong>Duration:</strong> {state.durationHours} hours</Typography>
          <Typography><strong>Booked By:</strong> {user ? user.name : guestDetails.name}</Typography>
          <Typography><strong>Email:</strong> {user ? user.email : guestDetails.email}</Typography>
          {!user && <Typography><strong>Phone:</strong> {guestDetails.phone}</Typography>}
        </Stack>
      </Grid>
      <Grid item xs={12} md={5}>
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Payment Summary
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography color="text.secondary">Order Total</Typography>
            <Typography fontWeight={700}>₹{total.toLocaleString("en-IN")}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography color="text.secondary">Pay 10% to Reserve</Typography>
            <Typography fontWeight={800} color="secondary.main">₹{payableNow.toLocaleString("en-IN")}</Typography>
          </Box>
          <Button fullWidth variant="contained" color="secondary" sx={{ fontWeight: 700 }} onClick={onSubmit} disabled={submitting || !!createdBooking}>
            {createdBooking ? "Booking Confirmed" : submitting ? "Confirming Booking..." : "Proceed (Dummy Payment)"}
          </Button>
        </Paper>
      </Grid>
    </Grid>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BookingFlow() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeStep, setActiveStep] = useState(0);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdownType | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [guestDetails, setGuestDetails] = useState<GuestDetails>({ name: "", email: "", phone: "", estimatedGuests: "" });
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  const [bookingState, setBookingState] = useState<BookingState>({
    date: null,
    startTime: null,
    durationHours: 3,
    addons: [],
    foodcourtTablesCount: 0,
    foodcourtTableNotes: "",
    extraRoomsCount: 0,
    foodSelections: {},
    favors: {},
  });

  const patchState = (patch: Partial<BookingState>) =>
    setBookingState((prev) => ({ ...prev, ...patch }));

  const foodSubtotal = FOOD_MENU.reduce((sum, m) => {
    const qty = bookingState.foodSelections[m.key] ?? 0;
    return sum + (m.step > 1 ? (qty / m.step) * m.price : m.price * qty);
  }, 0);

  const buildLineItems = useCallback((): LineItemInput[] => {
    return [
      ...bookingState.addons.map((id) => ({ catalog_item_id: id, quantity: 1 })),
      ...Object.entries(bookingState.favors)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ catalog_item_id: Number(id), quantity: qty })),
    ];
  }, [bookingState.addons, bookingState.favors]);

  const loadAvailableSlots = useCallback(async (dateValue: Dayjs, durationHours: number, venueId: number) => {
    setLoadingSlots(true);
    setSlotsError("");
    try {
      const response = await api.get<{ date: string; slots: AvailableSlot[] }>(
        `/availability/slots?venue_id=${venueId}&date=${dateValue.format("YYYY-MM-DD")}&duration_hours=${durationHours}`
      );
      setAvailableSlots(response.data.slots);
      return response.data.slots;
    } catch (err) {
      setAvailableSlots([]);
      setSlotsError(err instanceof Error ? err.message : "Unable to load available slots");
      return [];
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  // Load venue + catalog
  useEffect(() => {
    Promise.all([
      api.get<Venue>("/venue"),
      api.get<CatalogItem[]>("/catalog"),
    ]).then(([vRes, cRes]) => {
      setVenue(vRes.data);
      setCatalogItems(cRes.data);
      setBookingState((prev) => ({ ...prev, durationHours: Math.max(prev.durationHours, vRes.data.min_hours) }));
    }).finally(() => setLoadingData(false));
  }, []);

  // Load available slots when date or duration changes
  useEffect(() => {
    if (!bookingState.date || !venue) return;
    setAvailableSlots([]);
    void loadAvailableSlots(bookingState.date, bookingState.durationHours, venue.id);
  }, [bookingState.date, bookingState.durationHours, venue, loadAvailableSlots]);

  // Build price breakdown when entering step 7 (Order Review)
  useEffect(() => {
    if (activeStep !== 7) return;
    if (!venue || !bookingState.startTime) return;
    setLoadingPrice(true);

    api
      .post<PriceBreakdownType>("/bookings/preview", {
        venue_id: venue.id,
        date: bookingState.date!.format("YYYY-MM-DD"),
        start_time: bookingState.startTime.format("HH:mm"),
        duration_hours: bookingState.durationHours,
        foodcourt_tables_count: bookingState.foodcourtTablesCount,
        extra_rooms_count: bookingState.extraRoomsCount,
        line_items: buildLineItems(),
      })
      .then((r) => setPriceBreakdown(r.data))
      .catch(() => setPriceBreakdown(null))
      .finally(() => setLoadingPrice(false));
  }, [activeStep, venue, bookingState.date, bookingState.startTime, bookingState.durationHours, bookingState.foodcourtTablesCount, bookingState.extraRoomsCount, buildLineItems]);

  const handleBookingSubmit = useCallback(async () => {
    if (!venue || !bookingState.date || !bookingState.startTime) {
      setSubmitError("Select a valid date and time before confirming the booking.");
      return;
    }

    setSubmittingBooking(true);
    setSubmitError("");

    try {
      const response = await api.post<Booking>("/bookings", {
        venue_id: venue.id,
        date: bookingState.date.format("YYYY-MM-DD"),
        start_time: bookingState.startTime.format("HH:mm"),
        duration_hours: bookingState.durationHours,
        guest_name: user ? undefined : guestDetails.name.trim(),
        guest_email: user ? undefined : guestDetails.email.trim(),
        guest_phone: user ? undefined : guestDetails.phone.trim(),
        extra_rooms_count: bookingState.extraRoomsCount,
        foodcourt_tables_count: bookingState.foodcourtTablesCount,
        foodcourt_table_notes: bookingState.foodcourtTableNotes || undefined,
        booking_notes: Object.entries(bookingState.foodSelections)
          .filter(([, qty]) => qty > 0)
          .map(([key, qty]) => {
            const item = FOOD_MENU.find((m) => m.key === key);
            if (!item) return null;
            const cost = item.step > 1 ? (qty / item.step) * item.price : item.price * qty;
            return `${item.label} × ${qty} (₹${cost})`;
          })
          .filter(Boolean)
          .join(", ") || undefined,
        line_items: buildLineItems(),
      });

      setCreatedBooking(response.data);
      const refreshedSlots = await loadAvailableSlots(bookingState.date, bookingState.durationHours, venue.id);
      if (!refreshedSlots.includes(bookingState.startTime.format("HH:mm"))) {
        patchState({ startTime: null });
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unable to complete booking");
    } finally {
      setSubmittingBooking(false);
    }
  }, [venue, bookingState, user, guestDetails, buildLineItems, loadAvailableSlots]);

  const canProceed = useCallback((): boolean => {
    if (activeStep === 0) return !!(bookingState.date && bookingState.startTime);
    if (activeStep === 1 && !user) {
      const emailOk = /^\S+@\S+\.\S+$/.test(guestDetails.email.trim());
      const phoneOk = guestDetails.phone.trim().length >= 8;
      return guestDetails.name.trim().length > 1 && emailOk && phoneOk;
    }
    return true;
  }, [activeStep, bookingState.date, bookingState.startTime, user, guestDetails]);

  if (loadingData) return <StepSkeleton />;

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <DateTimeStep
            state={bookingState}
            setState={patchState}
            venue={venue}
            availableSlots={availableSlots}
            loadingSlots={loadingSlots}
            slotsError={slotsError}
          />
        );
      case 1:
        return (
          <GuestDetailsStep
            guestDetails={guestDetails}
            setGuestDetails={setGuestDetails}
          />
        );
      case 2:
        return <IncludedItemsStep venue={venue} />;
      case 3:
        return (
          <ServiceAddonsStep
            catalogItems={catalogItems}
            state={bookingState}
            setState={patchState}
            durationHours={bookingState.durationHours}
          />
        );
      case 4:
        return <FoodCourtStep venue={venue} state={bookingState} setState={patchState} />;
      case 5:
        return <FoodSelectionStep state={bookingState} setState={patchState} />;
      case 6:
        return <FavorsStep catalogItems={catalogItems} state={bookingState} setState={patchState} />;
      case 7:
        return (
          <OrderReviewStep
            state={bookingState}
            priceBreakdown={priceBreakdown}
            catalogItems={catalogItems}
            venue={venue}
            loadingPrice={loadingPrice}
            foodSubtotal={foodSubtotal}
          />
        );
      case 8:
        return (
          <PaymentStep
            state={bookingState}
            priceBreakdown={priceBreakdown}
            user={user}
            guestDetails={guestDetails}
            submitting={submittingBooking}
            submitError={submitError}
            createdBooking={createdBooking}
            onSubmit={handleBookingSubmit}
            foodSubtotal={foodSubtotal}
          />
        );
      default:
        return null;
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && user) {
      setActiveStep(2);
      return;
    }
    setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    if (activeStep === 2 && user) {
      setActiveStep(0);
      return;
    }
    setActiveStep((s) => Math.max(0, s - 1));
  };

  return (
    <Box sx={{ py: { xs: 4, md: 8 }, minHeight: "80vh", bgcolor: "background.default" }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Book Your Event
          </Typography>
          <Typography color="text.secondary">
            Complete each step to reserve your celebration at DspireZone
          </Typography>
        </Box>

        {/* Stepper */}
        {isMobile ? (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" textAlign="center" gutterBottom>
              Step {activeStep + 1} of {STEPS.length}: <strong>{STEPS[activeStep]}</strong>
            </Typography>
            <MobileStepper
              variant="progress"
              steps={STEPS.length}
              position="static"
              activeStep={activeStep}
              sx={{ bgcolor: "transparent", flexGrow: 1 }}
              nextButton={null}
              backButton={null}
            />
          </Box>
        ) : (
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel sx={{ "& .MuiStepLabel-label": { fontSize: 12 } }}>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        {/* Step Content */}
        <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
            {STEPS[activeStep]}
          </Typography>
          <AnimatePresence mode="wait">
            <MotionBox
              key={activeStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {renderStep()}
            </MotionBox>
          </AnimatePresence>
        </Paper>

        {/* Navigation */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={handleBack}
            disabled={activeStep === 0}
          >
            Back
          </Button>
          {activeStep < STEPS.length - 1 && (
            <Button
              endIcon={<ArrowForward />}
              variant="contained"
              color="primary"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              {activeStep === 0 ? "Continue" : "Next"}
            </Button>
          )}
        </Box>
      </Container>
    </Box>
  );
}
