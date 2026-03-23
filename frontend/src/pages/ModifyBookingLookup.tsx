import React, { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import { Edit } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import type { BookingWithPayments } from "../types";

export default function ModifyBookingLookup() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLookup = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("Please enter your confirmation code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.get<BookingWithPayments>(`/bookings/by-code/${trimmed}`);
      if (res.data.status === "cancelled") {
        setError("This booking has been cancelled and cannot be modified.");
        return;
      }
      navigate(`/modify-booking/${trimmed}`, { state: { booking: res.data } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking not found. Please check your confirmation code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        bgcolor: "background.default",
        py: 8,
      }}
    >
      <Container maxWidth="sm">
        <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 3, textAlign: "center" }}>
          <Edit sx={{ fontSize: 56, color: "secondary.main", mb: 2 }} />
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Modify Your Booking
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Enter your order confirmation code to view and update your booking details.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, textAlign: "left" }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Confirmation Code"
            placeholder="e.g. DZ-ABCD1234"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            inputProps={{ style: { textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 } }}
            sx={{ mb: 3 }}
          />

          <Button
            fullWidth
            variant="contained"
            color="secondary"
            size="large"
            onClick={handleLookup}
            disabled={loading}
            sx={{ fontWeight: 700, py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Look Up My Order"}
          </Button>

          <Button
            sx={{ mt: 2 }}
            color="inherit"
            onClick={() => navigate("/")}
          >
            Back to Home
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
