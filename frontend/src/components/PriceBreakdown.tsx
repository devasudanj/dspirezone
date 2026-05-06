import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
  Divider,
  Box,
  Chip,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import type { PriceBreakdown as PriceBreakdownType, Venue } from "../types";
import { BRAND } from "../theme";

interface Props {
  breakdown: Partial<PriceBreakdownType>;
  venue?: Venue | null;
  durationHours?: number;
  foodSubtotal?: number;
  discountSavings?: number;
}

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PriceBreakdown({ breakdown, venue, durationHours, foodSubtotal = 0, discountSavings = 0 }: Props) {
  const dur = durationHours ?? breakdown.duration_hours ?? 0;
  const buffer = breakdown.buffer_minutes ?? venue?.buffer_minutes ?? 30;

  // ─── Event Invoice items (18% GST) ──────────────────────────────────────────
  const eventRows = [
    {
      label: `Venue hire (${fmt((venue?.base_hourly_rate ?? 0))} × ${dur}h)`,
      value: breakdown.venue_subtotal,
      show: (breakdown.venue_subtotal ?? 0) > 0,
    },
    {
      label: `Venue discount`,
      value: discountSavings > 0 ? -discountSavings : undefined,
      show: discountSavings > 0,
      isDiscount: true,
    },
    {
      label: "Service add-ons",
      value: breakdown.addons_subtotal,
      show: (breakdown.addons_subtotal ?? 0) > 0,
    },
    {
      label: "Food court tables",
      value: breakdown.foodcourt_subtotal,
      show: (breakdown.foodcourt_subtotal ?? 0) > 0,
    },
    {
      label: "Extra rooms",
      value: breakdown.extra_rooms_subtotal,
      show: (breakdown.extra_rooms_subtotal ?? 0) > 0,
    },
    {
      label: "Favors & essentials",
      value: breakdown.favors_subtotal,
      show: (breakdown.favors_subtotal ?? 0) > 0,
    },
  ].filter((r) => r.show);

  const eventBase = Math.max(
    0,
    ((breakdown.venue_subtotal ?? 0) - discountSavings) +
    (breakdown.addons_subtotal ?? 0) +
    (breakdown.foodcourt_subtotal ?? 0) +
    (breakdown.extra_rooms_subtotal ?? 0) +
    (breakdown.favors_subtotal ?? 0),
  );
  const eventCgst = Math.round(eventBase * 0.09 * 100) / 100;
  const eventSgst = Math.round(eventBase * 0.09 * 100) / 100;
  const eventTotal = Math.round((eventBase + eventCgst + eventSgst) * 100) / 100;

  // ─── Food Invoice items (5% GST) ─────────────────────────────────────────────
  const foodCgst = Math.round(foodSubtotal * 0.025 * 100) / 100;
  const foodSgst = Math.round(foodSubtotal * 0.025 * 100) / 100;
  const foodTotal = Math.round((foodSubtotal + foodCgst + foodSgst) * 100) / 100;

  const grandTotal = Math.round((eventTotal + foodTotal) * 100) / 100;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
      {/* ── Event Invoice Section ── */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          background: `linear-gradient(135deg, ${BRAND.purple} 0%, ${BRAND.purpleLight} 100%)`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="subtitle1" sx={{ color: "white", fontWeight: 700 }}>
          Event Invoice
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
          18% GST (CGST 9% + SGST 9%)
        </Typography>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell colSpan={2} sx={{ py: 1.5, bgcolor: "action.hover" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Chip
                    label="1 Room Included FREE"
                    size="small"
                    color="success"
                    sx={{ fontWeight: 700 }}
                  />
                  <Chip
                    label={`${buffer}min buffer policy`}
                    size="small"
                    variant="outlined"
                    icon={<InfoOutlined sx={{ fontSize: 14 }} />}
                  />
                </Box>
              </TableCell>
            </TableRow>

            {eventRows.map((row) => (
              <TableRow key={row.label}>
                <TableCell sx={{ py: 1, color: row.isDiscount ? "success.dark" : "text.secondary", fontSize: 14 }}>
                  {row.isDiscount ? `✓ ${row.label}` : row.label}
                </TableCell>
                <TableCell align="right" sx={{ py: 1, fontWeight: 600, fontSize: 14, color: row.isDiscount ? "success.main" : "inherit" }}>
                  {row.isDiscount ? `−${fmt(discountSavings)}` : fmt(row.value ?? 0)}
                </TableCell>
              </TableRow>
            ))}

            {eventBase > 0 && (
              <>
                <TableRow>
                  <TableCell colSpan={2} sx={{ py: 0.5, px: 0 }}><Divider /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ py: 0.75, color: "text.secondary", fontSize: 13 }}>Subtotal (excl. GST)</TableCell>
                  <TableCell align="right" sx={{ py: 0.75, fontSize: 13 }}>{fmt(eventBase)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ py: 0.75, color: "text.secondary", fontSize: 13 }}>CGST @ 9%</TableCell>
                  <TableCell align="right" sx={{ py: 0.75, fontSize: 13 }}>{fmt(eventCgst)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ py: 0.75, color: "text.secondary", fontSize: 13 }}>SGST @ 9%</TableCell>
                  <TableCell align="right" sx={{ py: 0.75, fontSize: 13 }}>{fmt(eventSgst)}</TableCell>
                </TableRow>
              </>
            )}

            {eventRows.length === 0 && eventBase === 0 && (
              <TableRow>
                <TableCell colSpan={2} align="center" sx={{ py: 2, color: "text.secondary" }}>
                  Select add-ons to see pricing
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ px: 2, py: 1.2, display: "flex", justifyContent: "space-between", bgcolor: `${BRAND.purple}14` }}>
        <Typography variant="body2" fontWeight={700}>Event Invoice Total</Typography>
        <Typography variant="body2" fontWeight={800} color="primary">{fmt(eventTotal)}</Typography>
      </Box>

      {/* ── Food Invoice Section (only shown if food selected) ── */}
      {foodSubtotal > 0 && (
        <>
          <Divider />
          <Box
            sx={{
              px: 2,
              py: 1.5,
              background: "linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="subtitle1" sx={{ color: "white", fontWeight: 700 }}>
              Food & Beverages Invoice
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
              5% GST (CGST 2.5% + SGST 2.5%)
            </Typography>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ py: 1, color: "text.secondary", fontSize: 14 }}>Food & Beverages</TableCell>
                  <TableCell align="right" sx={{ py: 1, fontWeight: 600, fontSize: 14 }}>{fmt(foodSubtotal)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={2} sx={{ py: 0.5, px: 0 }}><Divider /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ py: 0.75, color: "text.secondary", fontSize: 13 }}>Subtotal (excl. GST)</TableCell>
                  <TableCell align="right" sx={{ py: 0.75, fontSize: 13 }}>{fmt(foodSubtotal)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ py: 0.75, color: "text.secondary", fontSize: 13 }}>CGST @ 2.5%</TableCell>
                  <TableCell align="right" sx={{ py: 0.75, fontSize: 13 }}>{fmt(foodCgst)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ py: 0.75, color: "text.secondary", fontSize: 13 }}>SGST @ 2.5%</TableCell>
                  <TableCell align="right" sx={{ py: 0.75, fontSize: 13 }}>{fmt(foodSgst)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ px: 2, py: 1.2, display: "flex", justifyContent: "space-between", bgcolor: "#e8f5e914" }}>
            <Typography variant="body2" fontWeight={700}>Food Invoice Total</Typography>
            <Typography variant="body2" fontWeight={800} color="success.main">{fmt(foodTotal)}</Typography>
          </Box>
        </>
      )}

      {/* ── Grand Total ── */}
      <Divider />
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "action.hover",
        }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Grand Total (incl. GST)
        </Typography>
        <Typography variant="h6" fontWeight={800} color="primary">
          {fmt(grandTotal)}
        </Typography>
      </Box>
    </Paper>
  );
}

