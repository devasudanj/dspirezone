import React, { useState } from "react";
import {
  Box, Container, Typography, Grid, TextField, Button,
  Stack, Avatar, Paper, Divider, Alert, CircularProgress,
} from "@mui/material";
import { LocationOn, Email, Phone, AccessTime, Send } from "@mui/icons-material";
import { motion } from "framer-motion";
import { BRAND } from "../theme";
import api from "../api/client";

const MotionBox = motion(Box);

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/contact", form);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Hero */}
      <Box
        sx={{
          py: { xs: 6, md: 10 },
          background: `linear-gradient(135deg, ${BRAND.purpleDark} 0%, ${BRAND.purple} 100%)`,
          color: "white",
          textAlign: "center",
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" fontWeight={800} sx={{ mb: 2, fontSize: { xs: "2rem", md: "3rem" } }}>
            Contact Us
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: 18 }}>
            We'd love to hear from you. Get in touch and we'll respond quickly.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Grid container spacing={6}>
          {/* Contact Info */}
          <Grid item xs={12} md={4}>
            <Typography variant="h5" fontWeight={700} gutterBottom>Get In Touch</Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              Have questions about availability, pricing, or our add-ons? Reach out any time.
            </Typography>
            <Stack spacing={3}>
              {[
                { icon: <LocationOn />, label: "Address", text: "30 Srinivasa Perumal Sannathi, Anna Salai\nNew Perungalathur, Chennai – 600 063\nTamil Nadu" },
                { icon: <Email />, label: "Email", text: "hello@dspirezone.com" },
                { icon: <Phone />, label: "Phone", text: "+91 98765 43210" },
                { icon: <AccessTime />, label: "Hours", text: "Mon–Fri: 10am–9pm\nSat–Sun: 9am–10pm" },
              ].map((item, i) => (
                <Box key={i} sx={{ display: "flex", gap: 2 }}>
                  <Avatar sx={{ bgcolor: `${BRAND.purple}18`, color: BRAND.purple }}>{item.icon}</Avatar>
                  <Box>
                    <Typography fontWeight={700}>{item.label}</Typography>
                    <Typography color="text.secondary" sx={{ whiteSpace: "pre-line" }}>{item.text}</Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Grid>

          {/* Contact Form */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
              {submitted ? (
                <MotionBox initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} sx={{ textAlign: "center", py: 4 }}>
                  <Typography sx={{ fontSize: 60 }}>✅</Typography>
                  <Typography variant="h5" fontWeight={700} sx={{ mt: 2 }}>Message Sent!</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    Thank you for reaching out. We'll get back to you within 24 hours.
                  </Typography>
                  <Button sx={{ mt: 3 }} variant="outlined" onClick={() => { setSubmitted(false); setError(""); setForm({ name: "", email: "", phone: "", message: "" }); }}>
                    Send Another Message
                  </Button>
                </MotionBox>
              ) : (
                <Box component="form" onSubmit={handleSubmit}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>Send a Message</Typography>
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={12} sm={6}>
                      <TextField required fullWidth label="Your Name" name="name" value={form.name} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField required fullWidth label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Phone (optional)" name="phone" value={form.phone} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        required fullWidth multiline rows={5}
                        label="Your Message"
                        name="message"
                        value={form.message}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        size="large"
                        endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Send />}
                        disabled={loading}
                      >
                        {loading ? "Sending…" : "Send Message"}
                      </Button>
                    </Grid>
                    {error && (
                      <Grid item xs={12}>
                        <Alert severity="error">{error}</Alert>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
