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
}

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PriceBreakdown({ breakdown, venue, durationHours }: Props) {
  const dur = durationHours ?? breakdown.duration_hours ?? 0;
  const buffer = breakdown.buffer_minutes ?? venue?.buffer_minutes ?? 30;

  const rows = [
    {
      label: `Venue hire (${fmt((venue?.base_hourly_rate ?? 0))} × ${dur}h)`,
      value: breakdown.venue_subtotal,
      show: (breakdown.venue_subtotal ?? 0) > 0,
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

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          background: `linear-gradient(135deg, ${BRAND.purple} 0%, ${BRAND.purpleLight} 100%)`,
        }}
      >
        <Typography variant="subtitle1" sx={{ color: "white", fontWeight: 700 }}>
          Price Breakdown
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

            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell sx={{ py: 1, color: "text.secondary", fontSize: 14 }}>
                  {row.label}
                </TableCell>
                <TableCell align="right" sx={{ py: 1, fontWeight: 600, fontSize: 14 }}>
                  {fmt(row.value ?? 0)}
                </TableCell>
              </TableRow>
            ))}

            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} align="center" sx={{ py: 2, color: "text.secondary" }}>
                  Select add-ons to see pricing
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
          Total
        </Typography>
        <Typography variant="h6" fontWeight={800} color="primary">
          {fmt(breakdown.total ?? 0)}
        </Typography>
      </Box>
    </Paper>
  );
}
