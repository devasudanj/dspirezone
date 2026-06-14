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
import type { Venue, CatalogItem, AvailableSlot, PriceBreakdown as PriceBreakdownType, Booking, FoodMenuItem } from "../types";

// Normalize a catalog food_item from the API into a FoodMenuItem
function toFoodMenuItem(item: CatalogItem): FoodMenuItem {
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

const MotionBox = motion(Box);

// ─── Razorpay types & script loader ──────────────────────────────────────────
interface RazorpayOrderOut {
  razorpay_order_id: string;
  amount: number;       // INR (human-readable, e.g. 1500.00)
  currency: string;
  razorpay_key_id: string;
  booking_id: number;
  payment_id: number;
}

interface RzpOptions {
  key: string;
  amount: number;       // paise
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
    return `${start.format("hh:mm A")} - ${end.format("hh:mm A")} IST`;
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
              Selected time window: {state.startTime.format("hh:mm A")} - {state.startTime.add(state.durationHours, "hour").format("hh:mm A")} IST ({state.durationHours} hours)
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
    { icon: "🥽", label: "10 Min DspireVR Zone Experience", sub: "Complimentary for 1 guest — additional guests can sign up at the event space", highlight: true },
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
  venue, state, setState, estimatedGuests,
}: {
  venue: Venue | null;
  state: BookingState;
  setState: (s: Partial<BookingState>) => void;
  estimatedGuests: number | "";
}) {
  const guests = Number(estimatedGuests);
  const minTables = guests > 0 ? Math.max(0, Math.ceil((guests - 20) / 20)) : 0;

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        Food court tables are a paid add-on. Reserve dedicated dining tables for your guests.
      </Alert>
      {minTables > 0 && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Based on your estimated <strong>{guests} guests</strong>, a minimum of <strong>{minTables} table{minTables > 1 ? "s" : ""}</strong> has been automatically added. You can increase up to a maximum of 4 tables.
        </Alert>
      )}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
              Number of Tables
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <IconButton
                size="small"
                onClick={() => setState({ foodcourtTablesCount: Math.max(minTables, state.foodcourtTablesCount - 1) })}
                disabled={state.foodcourtTablesCount <= minTables}
              >
                <Remove />
              </IconButton>
              <Typography variant="h6" sx={{ minWidth: 32, textAlign: "center" }}>
                {state.foodcourtTablesCount}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setState({ foodcourtTablesCount: Math.min(4, state.foodcourtTablesCount + 1) })}
                disabled={state.foodcourtTablesCount >= 4}
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
type CategoryGroup = { category: string; moq: number; items: FoodMenuItem[] };

function buildCategoryGroups(items: FoodMenuItem[]): CategoryGroup[] {
  const map = new Map<string, CategoryGroup>();
  for (const item of items) {
    const cat = item.category;
    if (!map.has(cat)) map.set(cat, { category: cat, moq: item.moq, items: [] });
    map.get(cat)!.items.push(item);
  }
  return Array.from(map.values());
}

function FoodSelectionStep({
  state, setState, foodMenu, loadingFood,
}: {
  state: BookingState;
  setState: (s: Partial<BookingState>) => void;
  foodMenu: FoodMenuItem[];
  loadingFood: boolean;
}) {
  // MOQ-aware quantity setter:
  // First click jumps to MOQ (for solo categories); - below MOQ snaps to 0
  const setQty = (key: string, delta: number, item: FoodMenuItem, groupTotal: number) => {
    const current = state.foodSelections[key] ?? 0;
    let next = current + delta;
    // For solo categories (group has exactly 1 item): enforce MOQ on first add
    const isSoloCategory = foodMenu.filter((m) => m.category === item.category).length === 1;
    if (isSoloCategory) {
      if (delta > 0 && current === 0) next = Math.max(item.moq, item.step);
      else if (delta < 0 && next > 0 && next < item.moq) next = 0;
    }
    setState({ foodSelections: { ...state.foodSelections, [key]: Math.max(0, next) } });
  };

  const itemCost = (m: FoodMenuItem) => {
    const qty = state.foodSelections[m.key] ?? 0;
    return m.step > 1 ? (qty / m.step) * m.price : m.price * qty;
  };
  const totalItems = Object.values(state.foodSelections).reduce((a, b) => a + b, 0);
  const totalCost = foodMenu.reduce((sum, m) => sum + itemCost(m), 0);

  const personalItems = foodMenu.filter((m) => !m.shared);
  const shareableItems = foodMenu.filter((m) => m.shared);
  const personalGroups = buildCategoryGroups(personalItems);
  const shareableGroups = buildCategoryGroups(shareableItems);

  // Collect MOQ violations: categories where something is selected but total < moq
  const moqViolations: { category: string; moq: number; total: number }[] = [];
  for (const group of [...personalGroups, ...shareableGroups]) {
    const total = group.items.reduce((s, m) => s + (state.foodSelections[m.key] ?? 0), 0);
    if (total > 0 && total < group.moq) {
      moqViolations.push({ category: group.category, moq: group.moq, total });
    }
  }

  const renderCard = (item: FoodMenuItem, groupTotal: number) => {
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
            height: "100%",
          }}
        >
          <Box sx={{ display: "flex", minHeight: 160 }}>
            {/* Left: emoji + name + price + stepper */}
            <Box
              sx={{
                bgcolor: item.bg,
                p: 1.5,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                minWidth: 130,
                maxWidth: 130,
                gap: 1,
              }}
            >
              {item.shared && (
                <Chip
                  label="Shareable"
                  size="small"
                  color="success"
                  sx={{ fontWeight: 700, fontSize: "0.6rem", height: 18 }}
                />
              )}
              <Typography sx={{ fontSize: 44, userSelect: "none", lineHeight: 1 }}>
                {item.emoji}
              </Typography>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {item.label}
                </Typography>
                <Typography variant="caption" fontWeight={700} color="secondary.dark" display="block" sx={{ mt: 0.5 }}>
                  {item.priceLabel}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <IconButton size="small" onClick={() => setQty(item.key, -item.step, item, groupTotal)} disabled={qty === 0}>
                    <Remove fontSize="small" />
                  </IconButton>
                  <Typography variant="h6" sx={{ minWidth: 28, textAlign: "center", fontWeight: 700 }}>
                    {qty}
                  </Typography>
                  <IconButton size="small" onClick={() => setQty(item.key, item.step, item, groupTotal)}>
                    <Add fontSize="small" />
                  </IconButton>
                </Box>
                {qty > 0 && (
                  <Chip size="small" label={`₹${cost.toLocaleString("en-IN")}`} color="secondary" />
                )}
              </Box>
            </Box>
            {/* Right: description + image strip */}
            {item.note && (
              <Box
                sx={{
                  flex: 1,
                  p: 1.5,
                  borderLeft: "1px solid",
                  borderColor: "divider",
                  overflowY: "auto",
                  maxHeight: 200,
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7, display: "block" }}
                >
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
  };

  const renderGroup = (group: CategoryGroup) => {
    const groupTotal = group.items.reduce((s, m) => s + (state.foodSelections[m.key] ?? 0), 0);
    const isSolo = group.items.length === 1;
    const moqMet = groupTotal === 0 || groupTotal >= group.moq;

    return (
      <Box key={group.category} sx={{ mb: 3 }}>
        {!isSolo && (
          <Box
            sx={{
              display: "flex", alignItems: "center", gap: 1, mb: 1.5,
              px: 1.5, py: 0.75, borderRadius: 2,
              bgcolor: moqMet ? "background.default" : "warning.light",
              border: "1px solid",
              borderColor: moqMet ? "divider" : "warning.main",
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
              {group.category}
            </Typography>
            <Chip
              size="small"
              label={`Min. ${group.moq} heads combined`}
              color={moqMet ? "default" : "warning"}
              variant={moqMet ? "outlined" : "filled"}
            />
            {groupTotal > 0 && (
              <Chip
                size="small"
                label={`${groupTotal} selected`}
                color={moqMet ? "success" : "warning"}
              />
            )}
          </Box>
        )}
        {isSolo && group.moq > 1 && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: "block", pl: 0.5 }}>
            Min. order: {group.moq}
          </Typography>
        )}
        <Grid container spacing={2}>
          {group.items.map((item) => renderCard(item, groupTotal))}
        </Grid>
        {!isSolo && groupTotal > 0 && !moqMet && (
          <Alert severity="warning" sx={{ mt: 1, py: 0.5 }}>
            Add {group.moq - groupTotal} more head{group.moq - groupTotal !== 1 ? "s" : ""} to meet the minimum of {group.moq} for <strong>{group.category}</strong>.
          </Alert>
        )}
      </Box>
    );
  };

  if (loadingFood) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (foodMenu.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <Typography color="text.secondary">No food items available at this time.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Personal items</strong> are individual servings per head and not shareable.
        {" "}<strong>Shareable items</strong> are ordered by quantity and enjoyed by the group.
        {" "}Items grouped under the same category share a combined minimum order quantity (MOQ).
      </Alert>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>🍽️ Personal Items (per head)</Typography>
      {personalGroups.map(renderGroup)}

      {shareableGroups.length > 0 && (
        <>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, mt: 2 }}>🤝 Shareable Items</Typography>
          {shareableGroups.map(renderGroup)}
        </>
      )}

      {moqViolations.length > 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <strong>Note:</strong> The following selections are below the minimum order quantity and will <strong>not be included</strong> when you proceed:{" "}
          {moqViolations.map((v) => `${v.category} (${v.total} of ${v.moq} minimum)`).join(", ")}.
          Add more to meet the minimum, or remove them entirely.
        </Alert>
      )}

      {totalItems > 0 && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <strong>{totalItems} item{totalItems > 1 ? "s" : ""}</strong> selected · estimated food total:{" "}
          <strong>₹{totalCost.toLocaleString("en-IN")}</strong>. The team will confirm availability before your event.
        </Alert>
      )}

      <Alert severity="info" icon={false} sx={{ mt: 2, bgcolor: "background.default", border: "1px solid", borderColor: "divider" }}>
        <Typography variant="body2" fontWeight={700} gutterBottom>Special Food Requests</Typography>
        <Typography variant="body2" color="text.secondary">
          For any specific food items, please contact the Dspire Team. We will make every effort to accommodate your preferences, subject to availability through our partnered vendors.
        </Typography>
      </Alert>
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
  state, priceBreakdown, catalogItems, venue, loadingPrice, foodSubtotal, foodMenu,
}: {
  state: BookingState;
  priceBreakdown: PriceBreakdownType | null;
  catalogItems: CatalogItem[];
  venue: Venue | null;
  loadingPrice: boolean;
  foodSubtotal: number;
  foodMenu: FoodMenuItem[];
}) {
  const formatDate = () => state.date ? state.date.format("DD MMM YYYY") : "";
  const formatTime = () => state.startTime ? state.startTime.format("hh:mm A") + " IST" : "";
  const formatEndTime = () => state.startTime ? state.startTime.add(state.durationHours, "hour").format("hh:mm A") + " IST" : "";
  const selectedAddons = catalogItems.filter((c) => state.addons.includes(c.id));
  const selectedFavors = catalogItems.filter((c) => (state.favors[c.id] ?? 0) > 0);
  const selectedFood = foodMenu.filter((m) => (state.foodSelections[m.key] ?? 0) > 0);

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
        {Number(guestDetails.estimatedGuests) > 80 && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            <strong>Large party notice:</strong> The maximum party size is 100 guests. With {guestDetails.estimatedGuests} guests, some seating will be spread out into the food court area to accommodate everyone comfortably.
          </Alert>
        )}
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
  onDiscountApplied,
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
  onDiscountApplied: (code: string, pct: number) => void;
}) {
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [appliedPct, setAppliedPct] = useState(0);
  const [discountMsg, setDiscountMsg] = useState("");
  const [discountStatus, setDiscountStatus] = useState<"" | "success" | "error" | "info">("");
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [isAutoApplied, setIsAutoApplied] = useState(false);
  const [changingCode, setChangingCode] = useState(false);

  const applyCode = useCallback(async (code: string, isAuto = false) => {
    if (!code) return;
    setApplyingDiscount(true);
    try {
      const res = await api.post<{ valid: boolean; discount_pct: number; message: string }>("/discounts/validate", {
        code: code.toUpperCase(),
        booking_date: state.date?.format("YYYY-MM-DD"),
      });
      if (res.data.valid) {
        setAppliedCode(code.toUpperCase());
        setAppliedPct(res.data.discount_pct);
        onDiscountApplied(code.toUpperCase(), res.data.discount_pct);
        setIsAutoApplied(isAuto);
        setChangingCode(false);
        setDiscountStatus(isAuto ? "info" : "success");
        setDiscountMsg(
          isAuto
            ? `Off-hours discount auto-applied: ${res.data.discount_pct}% off venue cost`
            : (res.data.message || `${res.data.discount_pct}% off venue cost applied!`),
        );
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
  }, [state.date, onDiscountApplied]);

  // Auto-detect off-hours (10 AM – 3 PM) and pre-apply DZ-SPECIAL25
  useEffect(() => {
    if (!state.startTime) return;
    const hour = state.startTime.hour();
    if (hour >= 10 && hour < 15) {
      void applyCode("DZ-SPECIAL25", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.startTime]);

  const removeDiscount = () => {
    setAppliedCode("");
    setAppliedPct(0);
    setDiscountMsg("");
    setDiscountStatus("");
    setCodeInput("");
    setIsAutoApplied(false);
    setChangingCode(false);
    onDiscountApplied("", 0);
  };

  const venueSubtotal = priceBreakdown?.venue_subtotal ?? 0;
  const discountSavings = appliedPct > 0 ? Math.round(venueSubtotal * (appliedPct / 100) * 100) / 100 : 0;
  const discountedVenueSubtotal = venueSubtotal - discountSavings;

  // ── Event Invoice (18% GST): venue, add-ons, food court tables, extra rooms, favors
  const eventBase =
    discountedVenueSubtotal +
    (priceBreakdown?.addons_subtotal ?? 0) +
    (priceBreakdown?.foodcourt_subtotal ?? 0) +
    (priceBreakdown?.extra_rooms_subtotal ?? 0) +
    (priceBreakdown?.favors_subtotal ?? 0);
  const eventGst = Math.round(eventBase * 0.18 * 100) / 100;
  const eventTotal = Math.round((eventBase + eventGst) * 100) / 100;

  // ── Food Invoice (5% GST): food menu selections
  const foodCgst = Math.round(foodSubtotal * 0.025 * 100) / 100;
  const foodSgst = Math.round(foodSubtotal * 0.025 * 100) / 100;
  const foodTotal = Math.round((foodSubtotal + foodCgst + foodSgst) * 100) / 100;

  // ── Combined totals
  const total = Math.round((eventTotal + foodTotal) * 100) / 100;
  const reservationAdvance = total * 0.1;
  const payableNow = Number.isFinite(reservationAdvance) ? Math.round(reservationAdvance * 100) / 100 : 0;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={7}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Reservation Checkout
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Choose to pay a <strong>10% advance</strong> now to secure your slot, or pay the <strong>full amount</strong> upfront. Any remaining balance is due before or on the event day.
        </Alert>
        {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
        {createdBooking && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Payment received! Booking confirmed. Confirmation code: <strong>{createdBooking.confirmation_code}</strong>
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
        <Stack spacing={1.2} sx={{ mb: 2 }}>
          <Typography><strong>Event Date:</strong> {state.date?.format("DD MMM YYYY")}</Typography>
          <Typography><strong>Time Window:</strong> {state.startTime?.format("hh:mm A")} - {state.startTime?.add(state.durationHours, "hour").format("hh:mm A")} IST</Typography>
          <Typography><strong>Duration:</strong> {state.durationHours} hours</Typography>
          <Typography><strong>Booked By:</strong> {user ? user.name : guestDetails.name}</Typography>
          <Typography><strong>Email:</strong> {user ? user.email : guestDetails.email}</Typography>
          {!user && <Typography><strong>Phone:</strong> {guestDetails.phone}</Typography>}
        </Stack>

        {/* Discount Code */}
        {!appliedCode || changingCode ? (
          <Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Discount Code
            </Typography>
            {changingCode && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Enter a different code to replace <strong>{appliedCode}</strong>, or{" "}
                <Box
                  component="span"
                  sx={{ color: "primary.main", cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => { setChangingCode(false); setCodeInput(""); setDiscountMsg(""); }}
                >
                  keep current
                </Box>
                .
              </Typography>
            )}
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                placeholder="e.g. DZ-APR25"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                inputProps={{ maxLength: 20 }}
                sx={{ flex: 1 }}
                onKeyDown={(e) => { if (e.key === "Enter") void applyCode(codeInput); }}
                autoFocus={changingCode}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={() => void applyCode(codeInput)}
                disabled={applyingDiscount || !codeInput}
                sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
              >
                {applyingDiscount ? <CircularProgress size={16} /> : "Apply"}
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={1}>
              <Chip
                label={`${appliedCode} — ${appliedPct}% off venue`}
                color="success"
                onDelete={removeDiscount}
                sx={{ fontWeight: 700 }}
              />
              <Button
                size="small"
                variant="text"
                sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.75rem" }}
                onClick={() => { setChangingCode(true); setCodeInput(""); setDiscountMsg(""); setDiscountStatus(""); }}
              >
                Change Code
              </Button>
            </Stack>
          </Box>
        )}
        {discountMsg && (
          <Alert
            severity={discountStatus === "error" ? "error" : discountStatus === "info" ? "info" : "success"}
            sx={{ mt: 1 }}
            onClose={() => setDiscountMsg("")}
          >
            {discountMsg}
          </Alert>
        )}
      </Grid>

      <Grid item xs={12} md={5}>
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Payment Summary
          </Typography>
          {appliedPct > 0 && (
            <>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography color="text.secondary" variant="body2">Venue Cost (original)</Typography>
                <Typography variant="body2" sx={{ textDecoration: "line-through", color: "text.disabled" }}>
                  ₹{venueSubtotal.toLocaleString("en-IN")}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography color="text.secondary" variant="body2">Venue Cost (after {appliedPct}% off)</Typography>
                <Typography variant="body2" color="success.main" fontWeight={700}>
                  ₹{discountedVenueSubtotal.toLocaleString("en-IN")}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2" color="success.main">You save</Typography>
                <Typography variant="body2" color="success.main" fontWeight={700}>
                  −₹{discountSavings.toLocaleString("en-IN")}
                </Typography>
              </Box>
              <Divider sx={{ mb: 1 }} />
            </>
          )}
          {/* Event Invoice row */}
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography color="text.secondary" variant="body2">Event Invoice <span style={{ fontSize: "0.75em" }}>(18% GST)</span></Typography>
            <Typography variant="body2" fontWeight={600}>₹{eventTotal.toLocaleString("en-IN")}</Typography>
          </Box>
          {/* Food Invoice row — shown only if food was ordered */}
          {foodSubtotal > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography color="text.secondary" variant="body2">Food Invoice <span style={{ fontSize: "0.75em" }}>(5% GST)</span></Typography>
              <Typography variant="body2" fontWeight={600}>₹{foodTotal.toLocaleString("en-IN")}</Typography>
            </Box>
          )}
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography color="text.secondary">Order Total</Typography>
            <Typography fontWeight={700}>₹{total.toLocaleString("en-IN")}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography color="text.secondary">Min. Advance (10%)</Typography>
            <Typography fontWeight={800} color="secondary.main">₹{payableNow.toLocaleString("en-IN")}</Typography>
          </Box>
          {createdBooking ? (
            <Button fullWidth variant="contained" color="success" disabled sx={{ fontWeight: 700 }}>
              Payment Confirmed ✓
            </Button>
          ) : (
            <Button fullWidth variant="contained" color="secondary" sx={{ fontWeight: 700 }} onClick={onSubmit} disabled={submitting}>
              {submitting ? "Processing…" : "Pay via Razorpay"}
            </Button>
          )}
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
  const [foodMenu, setFoodMenu] = useState<FoodMenuItem[]>([]);
  const [loadingFood, setLoadingFood] = useState(true);
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
  // Holds a booking that was created but whose payment was abandoned — reused on retry
  const [draftBooking, setDraftBooking] = useState<Booking | null>(null);
  const [appliedDiscountCode, setAppliedDiscountCode] = useState("");
  const [appliedDiscountPct, setAppliedDiscountPct] = useState(0);

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

  const foodSubtotal = foodMenu.reduce((sum, m) => {
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

  // Load food menu from backend
  useEffect(() => {
    setLoadingFood(true);
    api.get<CatalogItem[]>("/catalog?type=food_item&active_only=true")
      .then((r) => setFoodMenu(r.data.map(toFoodMenuItem)))
      .catch(() => setFoodMenu([]))
      .finally(() => setLoadingFood(false));
  }, []);

  // Load available slots when date or duration changes
  useEffect(() => {
    if (!bookingState.date || !venue) return;
    setAvailableSlots([]);
    void loadAvailableSlots(bookingState.date, bookingState.durationHours, venue.id);
  }, [bookingState.date, bookingState.durationHours, venue, loadAvailableSlots]);

  // Auto-set minimum food court tables based on estimated guests
  // Rule: 0 tables for ≤20 guests; 1 table per extra 20 guests (or part thereof)
  useEffect(() => {
    const guests = Number(guestDetails.estimatedGuests);
    if (!guests || guests <= 0) return;
    const minTables = Math.max(0, Math.ceil((guests - 20) / 20));
    setBookingState((prev) => ({
      ...prev,
      foodcourtTablesCount: Math.max(prev.foodcourtTablesCount, minTables),
    }));
  }, [guestDetails.estimatedGuests]);

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

    // ── Split invoice totals ──────────────────────────────────────────────────
    // Event Invoice (18% GST): venue, add-ons, food court tables, extra rooms, favors
    const venueSubtotal = priceBreakdown?.venue_subtotal ?? 0;
    const discountSavings = appliedDiscountPct > 0 ? Math.round(venueSubtotal * (appliedDiscountPct / 100) * 100) / 100 : 0;
    const eventBase =
      (venueSubtotal - discountSavings) +
      (priceBreakdown?.addons_subtotal ?? 0) +
      (priceBreakdown?.foodcourt_subtotal ?? 0) +
      (priceBreakdown?.extra_rooms_subtotal ?? 0) +
      (priceBreakdown?.favors_subtotal ?? 0);
    const eventGstAmt = Math.round(eventBase * 0.18 * 100) / 100;
    const eventTotal = Math.round((eventBase + eventGstAmt) * 100) / 100;

    // Food Invoice (5% GST): food menu selections
    const foodGstAmt = Math.round(foodSubtotal * 0.05 * 100) / 100;
    const foodInvTotal = Math.round((foodSubtotal + foodGstAmt) * 100) / 100;

    const total = Math.round((eventTotal + foodInvTotal) * 100) / 100;
    const advance = Math.max(1, Math.round(total * 0.1 * 100) / 100);
    const fullAmount = Math.max(1, Math.round(total * 100) / 100);

    try {
      // ── Step 1: Create booking or reuse the draft from a previous failed attempt ──
      let booking: Booking;
      if (draftBooking) {
        booking = draftBooking;
      } else {
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
          food_amount_pretax: foodSubtotal > 0 ? foodSubtotal : undefined,
          notes: Object.entries(bookingState.foodSelections)
            .filter(([, qty]) => qty > 0)
            .map(([key, qty]) => {
              const item = foodMenu.find((m) => m.key === key);
              if (!item) return null;
              const cost = item.step > 1 ? (qty / item.step) * item.price : item.price * qty;
              return `${item.label} \u00d7 ${qty} (\u20b9${cost})`;
            })
            .filter(Boolean)
            .join(", ") || undefined,
          line_items: buildLineItems(),
          discount_code: appliedDiscountCode || undefined,
          discount_pct: appliedDiscountPct > 0 ? appliedDiscountPct : undefined,
        });
        booking = response.data;
        setDraftBooking(booking);
      }

      // ── Step 2: Create Razorpay order ──
      const orderRes = await api.post<RazorpayOrderOut>("/payments/create-order", {
        booking_id: booking.id,
        confirmation_code: booking.confirmation_code,
        amount: fullAmount,
        min_partial_amount: advance,
      });
      const orderData = orderRes.data;

      // ── Step 3: Load Razorpay Checkout.js ──
      await loadRazorpayScript();
      setSubmittingBooking(false);  // release button while modal is open

      // ── Step 4: Open Razorpay Checkout modal ──
      const rzpInstance = new window.Razorpay({
        key: orderData.razorpay_key_id,
        amount: Math.round(orderData.amount * 100),  // INR → paise
        currency: orderData.currency,
        name: "DspireZone Events",
        description: `Booking ${booking.confirmation_code} – Pay Full or 10% Advance`,
        order_id: orderData.razorpay_order_id,
        prefill: {
          name: user?.name ?? guestDetails.name,
          email: user?.email ?? guestDetails.email,
          contact: !user ? guestDetails.phone : undefined,
        },
        theme: { color: BRAND.purple },
        handler: (response) => {
          // Called by Razorpay on successful payment
          void (async () => {
            setSubmittingBooking(true);
            setSubmitError("");
            try {
              await api.post("/payments/verify", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              setCreatedBooking(booking);
              setDraftBooking(null);
              const refreshedSlots = await loadAvailableSlots(
                bookingState.date!,
                bookingState.durationHours,
                venue.id,
              );
              if (!refreshedSlots.includes(bookingState.startTime!.format("HH:mm"))) {
                patchState({ startTime: null });
              }
            } catch {
              setSubmitError(
                "Payment received but verification failed. Please contact support with your Payment ID: " +
                  response.razorpay_payment_id,
              );
            } finally {
              setSubmittingBooking(false);
            }
          })();
        },
        modal: {
          ondismiss: () => {
            // Booking exists in draft state — user can retry
            setSubmitError("Payment window closed. Click the button below to try again.");
          },
        },
      });

      rzpInstance.open();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unable to initiate payment");
      setSubmittingBooking(false);
    }
  }, [venue, bookingState, user, guestDetails, buildLineItems, loadAvailableSlots, draftBooking, priceBreakdown, foodSubtotal, appliedDiscountCode, appliedDiscountPct]);

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
        return <FoodCourtStep venue={venue} state={bookingState} setState={patchState} estimatedGuests={guestDetails.estimatedGuests} />;
      case 5:
        return <FoodSelectionStep state={bookingState} setState={patchState} foodMenu={foodMenu} loadingFood={loadingFood} />;
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
            foodMenu={foodMenu}
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
            onDiscountApplied={(code, pct) => {
              setAppliedDiscountCode(code);
              setAppliedDiscountPct(pct);
            }}
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
    // Food Selection step (5): drop any category whose combined qty < MOQ
    if (activeStep === 5) {
      const allGroups = buildCategoryGroups(foodMenu);
      const cleaned = { ...bookingState.foodSelections };
      for (const group of allGroups) {
        const total = group.items.reduce((s, m) => s + (cleaned[m.key] ?? 0), 0);
        if (total > 0 && total < group.moq) {
          for (const item of group.items) {
            delete cleaned[item.key];
          }
        }
      }
      patchState({ foodSelections: cleaned });
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
