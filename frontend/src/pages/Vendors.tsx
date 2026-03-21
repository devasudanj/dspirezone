import React, { useMemo, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  TextField,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Chip,
  Alert,
  Stack,
  CircularProgress,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { Storefront, Restaurant, SportsEsports, LocalDining, CheckCircle } from "@mui/icons-material";
import { BRAND } from "../theme";
import api from "../api/client";
import cart1Orange from "../assets/media/cart-1-orange.jpeg";
import cart2Blue from "../assets/media/cart-2-blue.jpeg";
import cart3Yellow from "../assets/media/cart-3-yellow.jpeg";

type VendorOption = "Food Court Room" | "Gaming Room" | "Food Cart";

interface VendorForm {
  name: string;
  contactNumber: string;
  email: string;
  businessType: string;
  optedOptions: VendorOption[];
  previousExperience: string;
  healthyConcept: string;
}

const BUSINESS_TYPES = [
  "Cafe / Beverages",
  "Healthy Snacks",
  "Regional Food",
  "Street Food",
  "Desserts / Bakery",
  "Gaming / Entertainment",
  "Other",
];

const OPTION_CARDS: Array<{ option: VendorOption; icon: React.ReactNode; note: string; images?: string[] }> = [
  {
    option: "Food Court Room",
    icon: <Restaurant />,
    note: "Dedicated room space inside food court zone with family footfall.",
  },
  {
    option: "Gaming Room",
    icon: <SportsEsports />,
    note: "Gaming-focused room option ideal for interactive and youth-centric concepts.",
  },
  {
    option: "Food Cart",
    icon: <LocalDining />,
    note: "Compact cart setup for quick-serve menus and impulse purchases.",
    images: [
      cart1Orange,
      cart2Blue,
      cart3Yellow,
    ],
  },
];

const FACILITIES = [
  "Common area with 50+ seating capacity and large TVs for entertainment",
  "AC Room (middle) available as common area when not booked for parties",
  "Generator provisioned for lighting, refrigeration, and elevator operations",
  "On-site supervisor to assist vendors and ensure guidelines compliance",
  "Additional revenue from small party orders originating from 3rd floor events",
  "Social media promotion to attract health-focused food option customers",
  "Minimal investment requirements for new vendors fostering innovation",
  "Online onboarding and stall booking for convenience and efficiency",
  "Arcade gaming section planned for future to increase footfall",
  "Modern ambience with profile lights and false ceiling design",
  "Valet parking service during events and parties",
  "Safe, family-friendly environment with professional management",
];

export default function Vendors() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");
  const [form, setForm] = useState<VendorForm>({
    name: "",
    contactNumber: "",
    email: "",
    businessType: "",
    optedOptions: [],
    previousExperience: "",
    healthyConcept: "",
  });

  const canSubmit = useMemo(() => {
    const emailOk = /^\S+@\S+\.\S+$/.test(form.email.trim());
    return (
      form.name.trim().length > 1 &&
      form.contactNumber.trim().length >= 8 &&
      emailOk &&
      form.businessType.trim().length > 0 &&
      form.optedOptions.length > 0
    );
  }, [form]);

  const toggleOption = (opt: VendorOption) => {
    setForm((prev) => ({
      ...prev,
      optedOptions: prev.optedOptions.includes(opt)
        ? prev.optedOptions.filter((o) => o !== opt)
        : [...prev.optedOptions, opt],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setSubmitError("");
    try {
      await api.post("/vendors/inquiries", {
        name: form.name,
        contact_number: form.contactNumber,
        email: form.email,
        business_type: form.businessType,
        opted_options: form.optedOptions,
        previous_experience: form.previousExperience || null,
        healthy_concept: form.healthyConcept || null,
      });
      setLoading(false);
      setSubmitted(true);
    } catch (err) {
      setLoading(false);
      setSubmitError(err instanceof Error ? err.message : "Unable to submit vendor inquiry");
    }
  };

  return (
    <Box>
      <Box
        sx={{
          py: { xs: 6, md: 9 },
          background: `linear-gradient(135deg, ${BRAND.purpleDark} 0%, ${BRAND.purple} 100%)`,
          color: "white",
        }}
      >
        <Container maxWidth="lg">
          <Chip label="Vendor Partnerships" sx={{ bgcolor: "rgba(255,255,255,0.14)", color: "white", mb: 2 }} />
          <Typography variant="h3" fontWeight={800} sx={{ mb: 1.5, fontSize: { xs: "2rem", md: "2.6rem" } }}>
            Partner With DspireZone
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.86)", maxWidth: 760 }}>
            Vendors can register interest for Food Court Room, Gaming Room, and Food Cart opportunities at DspireZone.
            Share your concept and we will reach out with fitment and availability.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3 }}>
            <Button
              component={RouterLink}
              to="/vendor-guidelines"
              variant="outlined"
              sx={{ color: "white", borderColor: "rgba(255,255,255,0.55)" }}
            >
              View Vendor Guidelines
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Space Options
              </Typography>
              <Stack spacing={1.5}>
                {OPTION_CARDS.map((card) => (
                  <Box key={card.option} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    {card.images && card.images.length > 0 && (
                      <Box sx={{ mb: 1.5 }}>
                        <Grid container spacing={1}>
                          {card.images.map((img, idx) => (
                            <Grid item xs={6} sm={4} key={idx}>
                              <Box sx={{ borderRadius: 1.5, overflow: "hidden", height: 120 }}>
                                <img
                                  src={img}
                                  alt={`${card.option} ${idx + 1}`}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    )}
                    <Stack direction="row" spacing={1.2} alignItems="center">
                      <Box sx={{ color: "primary.main", display: "flex", alignItems: "center" }}>{card.icon}</Box>
                      <Box>
                        <Typography fontWeight={700}>{card.option}</Typography>
                        <Typography variant="body2" color="text.secondary">{card.note}</Typography>
                      </Box>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Facilities at Site
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                We provide the following provisions to support vendor operations and customer experience:
              </Typography>
              <Stack spacing={1}>
                {FACILITIES.map((item) => (
                  <Stack key={item} direction="row" spacing={1} alignItems="flex-start">
                    <CheckCircle sx={{ color: "success.main", fontSize: 18, mt: "2px" }} />
                    <Typography variant="body2">{item}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={7}>
            <Paper sx={{ p: { xs: 2.2, md: 3 }, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Vendor Interest Form
              </Typography>
              {!submitted ? (
                <Box component="form" onSubmit={handleSubmit}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        label="Name"
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        label="Contact Number"
                        value={form.contactNumber}
                        onChange={(e) => setForm((p) => ({ ...p, contactNumber: e.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        type="email"
                        label="Email"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth required>
                        <InputLabel>Business Type</InputLabel>
                        <Select
                          value={form.businessType}
                          label="Business Type"
                          onChange={(e) => setForm((p) => ({ ...p, businessType: e.target.value }))}
                        >
                          {BUSINESS_TYPES.map((item) => (
                            <MenuItem key={item} value={item}>{item}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Opted Room / Food Cart Option
                      </Typography>
                      <FormGroup row>
                        {OPTION_CARDS.map((item) => (
                          <FormControlLabel
                            key={item.option}
                            control={<Checkbox checked={form.optedOptions.includes(item.option)} onChange={() => toggleOption(item.option)} />}
                            label={item.option}
                          />
                        ))}
                      </FormGroup>
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Any previous experience or stall owned"
                        value={form.previousExperience}
                        onChange={(e) => setForm((p) => ({ ...p, previousExperience: e.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Any healthy concept that aligns with DspireZone goals"
                        value={form.healthyConcept}
                        onChange={(e) => setForm((p) => ({ ...p, healthyConcept: e.target.value }))}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      {submitError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          {submitError}
                        </Alert>
                      )}
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Please review our vendor guidelines before submitting.
                        <Button component={RouterLink} to="/vendor-guidelines" size="small" sx={{ ml: 1 }}>
                          Open Guidelines
                        </Button>
                      </Alert>

                      <Button type="submit" variant="contained" color="primary" disabled={!canSubmit || loading} startIcon={loading ? <CircularProgress size={16} /> : <Storefront />}>
                        {loading ? "Submitting..." : "Submit Vendor Interest"}
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <Alert severity="success">
                  Thank you for your interest. Our team will contact you soon after reviewing your vendor proposal.
                </Alert>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
