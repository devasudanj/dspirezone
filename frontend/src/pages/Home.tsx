import React, { useEffect, useState } from "react";
import {
  Box, Container, Typography, Button, Grid, Card, CardContent,
  CardMedia, Paper, Avatar, Chip, Stack, useTheme, useMediaQuery,
  Divider,
} from "@mui/material";
import {
  CelebrationOutlined, CameraAlt, AutoFixHigh, TableBar,
  MusicNote, FoodBank, PartyMode, CheckCircle, Star,
  CalendarMonth, Checklist, ConfirmationNumber, LocationOn,
  Email, Phone, AccessTime,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { motion } from "framer-motion";
import { BRAND } from "../theme";
import type { Venue, CatalogItem } from "../types";
import api from "../api/client";

// ----------------------------------------------------------------
// Gallery images
// ----------------------------------------------------------------
import g01 from "../assets/media/gallery-01-birthday.svg";
import g02 from "../assets/media/gallery-02-lights.svg";
import g03 from "../assets/media/gallery-03-food.svg";
import g04 from "../assets/media/gallery-04-magic.svg";
import g05 from "../assets/media/gallery-05-decor.svg";
import g06 from "../assets/media/gallery-06-venue.svg";
import g07 from "../assets/media/gallery-07-photography.svg";
import g08 from "../assets/media/gallery-08-favors.svg";

const GALLERY_IMAGES = [g01, g02, g03, g04, g05, g06, g07, g08];

// ----------------------------------------------------------------
// Data
// ----------------------------------------------------------------
const HOW_IT_WORKS = [
  {
    step: "01",
    icon: <CalendarMonth sx={{ fontSize: 36, color: BRAND.gold }} />,
    title: "Pick Your Date",
    desc: "Choose your perfect date and start time. Our smart calendar shows real-time availability in seconds.",
  },
  {
    step: "02",
    icon: <Checklist sx={{ fontSize: 36, color: BRAND.gold }} />,
    title: "Customise Add-ons",
    desc: "Select magic shows, photography, food court tables, decorations, and party essentials — all in one place.",
  },
  {
    step: "03",
    icon: <ConfirmationNumber sx={{ fontSize: 36, color: BRAND.gold }} />,
    title: "Confirm & Celebrate",
    desc: "Get an instant confirmation code and enjoy a seamlessly organised event at DspireZone.",
  },
];

const ADD_ON_CARDS = [
  { icon: <FoodBank />, title: "Catering Packages", desc: "Curated menus for every palate and budget." },
  { icon: <AutoFixHigh />, title: "Magic Show", desc: "60-min professional magic act — all ages guaranteed." },
  { icon: <CameraAlt />, title: "Photography", desc: "Professional photographer for your full event duration." },
  { icon: <CelebrationOutlined />, title: "Decorations", desc: "Balloon arches, floral setups, LED backdrops & more." },
  { icon: <TableBar />, title: "Food Court Tables", desc: "Reserve dedicated dining tables as a paid add-on." },
  { icon: <PartyMode />, title: "Favors & Essentials", desc: "Balloons, candles, party hats, return gifts & more." },
];

const BENEFITS = [
  { icon: "🏡", title: "Cozy Intimate Venue", desc: "Perfect for groups of 20-80 guests in a warm, welcoming space." },
  { icon: "⏰", title: "Flexible Hours", desc: "Book from 2 hours to full-day. Open 7 days a week." },
  { icon: "🎁", title: "Curated Add-ons", desc: "Premium add-on catalog handled by our trusted vendors." },
  { icon: "💎", title: "Transparent Pricing", desc: "No hidden fees. Full price breakdown before you confirm." },
];

const TESTIMONIALS = [
  { name: "Priya Ramesh", event: "Birthday Party", rating: 5, text: "Absolutely stunning venue! The decoration team was brilliant and the magic show had all the kids mesmerised. Highly recommend DspireZone!" },
  { name: "Karthik & Meena", event: "Baby Shower", rating: 5, text: "Booking was so easy. The 1 room included was perfect for our little gathering and the photography add-on captured every special moment." },
  { name: "Suresh Kumar", event: "Corporate Gathering", rating: 5, text: "Professional setup, great AV system, and the food court tables were a perfect touch. Will definitely book again for our annual event." },
  { name: "Divya Nair", event: "Birthday Party", rating: 5, text: "The fairy lights package and balloon arch were picture-perfect. Our guests couldn't stop complimenting the beautiful decor!" },
];

const MotionBox = motion(Box);

export default function Home() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [venue, setVenue] = useState<Venue | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  useEffect(() => {
    api.get<Venue>("/venue").then((r) => setVenue(r.data)).catch(() => {});
  }, []);

  return (
    <Box>
      {/* ============================================================
          HERO SECTION
      ============================================================ */}
      <Box
        sx={{
          minHeight: { xs: "90vh", md: "88vh" },
          background: `linear-gradient(135deg, ${BRAND.purpleDark} 0%, ${BRAND.purple} 50%, #7B42D1 100%)`,
          position: "relative",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        {/* Decorative blobs */}
        <Box
          sx={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse at 20% 50%, rgba(245,158,11,0.2) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(123,66,209,0.3) 0%, transparent 50%)",
          }}
        />
        {/* Floating confetti dots */}
        {[...Array(12)].map((_, i) => (
          <Box
            key={i}
            sx={{
              position: "absolute",
              width: [8, 12, 6][i % 3],
              height: [8, 12, 6][i % 3],
              borderRadius: "50%",
              bgcolor: [BRAND.gold, "rgba(255,255,255,0.6)", "#C084FC"][i % 3],
              top: `${10 + (i * 7) % 80}%`,
              left: `${5 + (i * 13) % 90}%`,
              opacity: 0.6,
            }}
          />
        ))}

        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          <Grid container alignItems="center" spacing={4}>
            <Grid item xs={12} md={7}>
              <MotionBox
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
              >
                <Chip
                  label="🎉 New Perungalathur's Premier Event Venue"
                  sx={{ bgcolor: "rgba(245,158,11,0.2)", color: BRAND.goldLight, fontWeight: 700, mb: 3, border: `1px solid ${BRAND.gold}` }}
                />
                <Typography
                  variant="h1"
                  sx={{
                    color: "white",
                    fontSize: { xs: "2.4rem", sm: "3.2rem", md: "4rem" },
                    lineHeight: 1.1,
                    mb: 3,
                  }}
                >
                  Book your perfect{" "}
                  <Box component="span" sx={{ color: BRAND.gold }}>
                    celebration
                  </Box>{" "}
                  at DspireZone
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ color: "rgba(255,255,255,0.82)", fontWeight: 400, mb: 4, lineHeight: 1.7, maxWidth: 560 }}
                >
                  Birthdays, baby showers, gatherings & more — in an elegant, curated venue with all-in-one add-ons, transparent pricing, and instant online booking.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button
                    component={RouterLink}
                    to="/book"
                    variant="contained"
                    color="secondary"
                    size="large"
                    sx={{ py: 1.5, px: 4, fontSize: 16, fontWeight: 700 }}
                  >
                    Check Availability →
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/packages"
                    variant="outlined"
                    size="large"
                    sx={{ py: 1.5, px: 4, color: "white", borderColor: "rgba(255,255,255,0.5)", fontSize: 16, "&:hover": { borderColor: "white" } }}
                  >
                    View Packages
                  </Button>
                </Stack>

                {venue && (
                  <Box sx={{ display: "flex", gap: 3, mt: 4, flexWrap: "wrap" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <CheckCircle sx={{ color: "#4ADE80", fontSize: 18 }} />
                      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                        1 room included free
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <AccessTime sx={{ color: "#4ADE80", fontSize: 18 }} />
                      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                        Min {venue.min_hours}h booking
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <CheckCircle sx={{ color: "#4ADE80", fontSize: 18 }} />
                      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                        From ₹{venue.base_hourly_rate.toLocaleString("en-IN")}/hr
                      </Typography>
                    </Box>
                  </Box>
                )}
              </MotionBox>
            </Grid>

            <Grid item xs={12} md={5} sx={{ display: { xs: "none", md: "flex" }, justifyContent: "center" }}>
              <MotionBox
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                <Box
                  sx={{
                    width: 420,
                    height: 420,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.06)",
                    border: "2px solid rgba(255,255,255,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <Box
                    component="img"
                    src={g01}
                    alt="Event venue"
                    sx={{ width: "88%", height: "88%", objectFit: "cover", borderRadius: "50%" }}
                  />
                </Box>
              </MotionBox>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ============================================================
          HOW IT WORKS
      ============================================================ */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: "background.default" }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Chip label="Simple Process" color="primary" sx={{ mb: 2, fontWeight: 700 }} />
            <Typography variant="h2" sx={{ mb: 2, fontSize: { xs: "2rem", md: "2.8rem" } }}>
              How it works
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: "auto" }}>
              3 easy steps to your perfect celebration
            </Typography>
          </Box>
          <Grid container spacing={4}>
            {HOW_IT_WORKS.map((step, i) => (
              <Grid item xs={12} md={4} key={i}>
                <MotionBox
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                >
                  <Card
                    sx={{
                      height: "100%",
                      p: 1,
                      border: `1px solid rgba(74,14,143,0.1)`,
                      position: "relative",
                      overflow: "visible",
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        top: -16,
                        left: 24,
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        bgcolor: BRAND.purple,
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: 13,
                      }}
                    >
                      {step.step}
                    </Box>
                    <CardContent sx={{ pt: 3 }}>
                      <Box sx={{ mb: 2 }}>{step.icon}</Box>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        {step.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
                        {step.desc}
                      </Typography>
                    </CardContent>
                  </Card>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ textAlign: "center", mt: 4 }}>
            <Button component={RouterLink} to="/book" variant="contained" color="primary" size="large">
              Start Booking Now
            </Button>
          </Box>
        </Container>
      </Box>

      {/* ============================================================
          DSPIRE VR ZONE TEASER BANNER
      ============================================================ */}
      <Box sx={{ py: { xs: 6, md: 8 }, px: 2 }}>
        <Container maxWidth="lg">
          <MotionBox
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <Box
              component={RouterLink}
              to="/dspire-vr-zone"
              sx={{
                display: "block",
                textDecoration: "none",
                borderRadius: 4,
                overflow: "hidden",
                position: "relative",
                background: "linear-gradient(135deg, #05001A 0%, #0D0035 50%, #1A0050 100%)",
                border: "1px solid rgba(0,245,255,0.2)",
                boxShadow: "0 0 40px rgba(191,0,255,0.15), 0 0 80px rgba(0,245,255,0.08)",
                transition: "all 0.4s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 8px 60px rgba(191,0,255,0.3), 0 0 80px rgba(0,245,255,0.15)",
                  border: "1px solid rgba(0,245,255,0.5)",
                },
              }}
            >
              {/* Grid overlay */}
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "linear-gradient(rgba(0,245,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.04) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                  pointerEvents: "none",
                }}
              />
              {/* Glow orbs */}
              <Box sx={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, #BF00FF 0%, transparent 70%)", opacity: 0.12, top: "-80px", right: "-60px", pointerEvents: "none" }} />
              <Box sx={{ position: "absolute", width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, #00F5FF 0%, transparent 70%)", opacity: 0.1, bottom: "-60px", left: "20%", pointerEvents: "none" }} />

              <Box sx={{ position: "relative", zIndex: 1, p: { xs: 4, md: 6 }, display: "flex", flexDirection: { xs: "column", md: "row" }, alignItems: "center", gap: 4 }}>
                {/* Icon */}
                <Box
                  sx={{
                    flexShrink: 0,
                    width: { xs: 80, md: 110 },
                    height: { xs: 80, md: 110 },
                    borderRadius: "50%",
                    border: "2px solid rgba(0,245,255,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 30px rgba(0,245,255,0.3)",
                  }}
                >
                  <Box sx={{ fontSize: { xs: "2.5rem", md: "3.5rem" } }}>🥽</Box>
                </Box>

                {/* Text */}
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, flexWrap: "wrap", gap: 1 }}>
                    <Chip
                      label="COMING SOON"
                      size="small"
                      sx={{ bgcolor: "#FF006E", color: "white", fontWeight: 800, fontSize: "0.7rem", letterSpacing: 1.5, boxShadow: "0 0 10px rgba(255,0,110,0.5)" }}
                    />
                    <Chip
                      label="🎮 Free-Roam VR Arena"
                      size="small"
                      sx={{ bgcolor: "rgba(0,245,255,0.12)", color: "#00F5FF", fontWeight: 700, border: "1px solid rgba(0,245,255,0.3)" }}
                    />
                  </Stack>
                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontSize: { xs: "1.8rem", md: "2.4rem" },
                      lineHeight: 1.1,
                      mb: 1,
                      background: "linear-gradient(90deg, #00F5FF 0%, #BF00FF 60%, #FF006E 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    DspireVR Zone
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: { xs: "0.9rem", md: "1rem" }, lineHeight: 1.6, maxWidth: 520 }}>
                    Step into the future of immersive entertainment — a high-energy VR arena for friends, families, and gamers of all ages. <strong style={{ color: "rgba(255,255,255,0.85)" }}>Launching soon at DspireZone.</strong>
                  </Typography>
                </Box>

                {/* CTA Arrow */}
                <Box
                  sx={{
                    flexShrink: 0,
                    px: 3,
                    py: 1.5,
                    borderRadius: 3,
                    border: "1px solid rgba(0,245,255,0.35)",
                    color: "#00F5FF",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    whiteSpace: "nowrap",
                    display: { xs: "none", sm: "block" },
                  }}
                >
                  Explore →
                </Box>
              </Box>
            </Box>
          </MotionBox>
        </Container>
      </Box>

      {/* ============================================================
          PACKAGES / ADD-ONS TEASER
      ============================================================ */}
      <Box
        sx={{
          py: { xs: 8, md: 12 },
          background: `linear-gradient(180deg, ${BRAND.purpleDark}08 0%, white 100%)`,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Chip label="Add-ons Catalog" sx={{ mb: 2, fontWeight: 700, bgcolor: `${BRAND.gold}22`, color: BRAND.goldDark }} />
            <Typography variant="h2" sx={{ mb: 2, fontSize: { xs: "2rem", md: "2.8rem" } }}>
              Packages & Add-ons
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: "auto" }}>
              Everything you need for a memorable event — all under one roof
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {ADD_ON_CARDS.map((card, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card sx={{ height: "100%", cursor: "pointer" }}>
                    <CardContent>
                      <Avatar
                        sx={{
                          bgcolor: `${BRAND.purple}18`,
                          color: BRAND.purple,
                          width: 52,
                          height: 52,
                          mb: 2,
                        }}
                      >
                        {card.icon}
                      </Avatar>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        {card.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {card.desc}
                      </Typography>
                    </CardContent>
                  </Card>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ textAlign: "center", mt: 4 }}>
            <Button component={RouterLink} to="/packages" variant="outlined" color="primary" size="large">
              View Full Catalog →
            </Button>
          </Box>
        </Container>
      </Box>

      {/* ============================================================
          WHAT'S INCLUDED
      ============================================================ */}
      <Box
        sx={{
          py: { xs: 8, md: 12 },
          background: `linear-gradient(135deg, ${BRAND.purple} 0%, ${BRAND.purpleLight} 100%)`,
          color: "white",
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Chip label="Included with every booking" sx={{ bgcolor: `${BRAND.gold}30`, color: BRAND.goldLight, fontWeight: 700, mb: 3 }} />
              <Typography variant="h2" sx={{ color: "white", mb: 3, fontSize: { xs: "2rem", md: "2.6rem" } }}>
                What's Included
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.8)", mb: 4, lineHeight: 1.8 }}>
                Every booking comes with our essential package — no hidden surprises at checkout.
              </Typography>
              <Button
                component={RouterLink}
                to="/book"
                variant="contained"
                color="secondary"
                size="large"
              >
                Book Now →
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                {[
                  { icon: "🏠", label: "1 Private Room", sub: "Complimentary, no extra charge" },
                  { icon: "🔊", label: "AV Setup", sub: "Projector, PA system & microphone" },
                  { icon: "🪑", label: "Tables & Chairs", sub: "For up to 50 guests" },
                  { icon: "❄️", label: "Air Conditioning", sub: "Climate-controlled comfort" },
                  { icon: "🚗", label: "Free Parking", sub: "On-site vehicle parking" },
                  { icon: "🧹", label: "Post-event Cleanup", sub: "Included in your booking" },
                ].map((item, i) => (
                  <Grid item xs={12} sm={6} key={i}>
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: "rgba(255,255,255,0.1)",
                        borderRadius: 2,
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(255,255,255,0.15)",
                      }}
                    >
                      <Typography sx={{ fontSize: 28, mb: 0.5 }}>{item.icon}</Typography>
                      <Typography sx={{ color: "white", fontWeight: 700, fontSize: 15 }}>
                        {item.label}
                      </Typography>
                      <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                        {item.sub}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ============================================================
          WHY DSPIREZONE
      ============================================================ */}
      <Box sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Typography variant="h2" sx={{ mb: 2, fontSize: { xs: "2rem", md: "2.8rem" } }}>
              Why DspireZone?
            </Typography>
          </Box>
          <Grid container spacing={4}>
            {BENEFITS.map((b, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <MotionBox
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Box sx={{ textAlign: "center", p: 2 }}>
                    <Typography sx={{ fontSize: 48, mb: 2 }}>{b.icon}</Typography>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      {b.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
                      {b.desc}
                    </Typography>
                  </Box>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ============================================================
          GALLERY
      ============================================================ */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: "background.default" }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Typography variant="h2" sx={{ mb: 2, fontSize: { xs: "2rem", md: "2.8rem" } }}>
              Gallery
            </Typography>
            <Typography variant="body1" color="text.secondary">
              A glimpse of the magic we create
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {GALLERY_IMAGES.map((img, i) => (
              <Grid item xs={6} sm={4} md={3} key={i}>
                <MotionBox
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Box
                    component="img"
                    src={img}
                    alt={`Gallery ${i + 1}`}
                    onClick={() => setLightboxImg(img)}
                    sx={{
                      width: "100%",
                      height: { xs: 140, sm: 180, md: 200 },
                      objectFit: "cover",
                      borderRadius: 2,
                      cursor: "pointer",
                      display: "block",
                    }}
                  />
                </MotionBox>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Button component={RouterLink} to="/gallery" variant="outlined" color="primary">
              View Full Gallery →
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Lightbox */}
      {lightboxImg && (
        <Box
          onClick={() => setLightboxImg(null)}
          sx={{
            position: "fixed",
            inset: 0,
            bgcolor: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            cursor: "pointer",
          }}
        >
          <Box
            component="img"
            src={lightboxImg}
            alt="Gallery full view"
            sx={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 2 }}
          />
        </Box>
      )}

      {/* ============================================================
          TESTIMONIALS
      ============================================================ */}
      <Box
        sx={{
          py: { xs: 8, md: 12 },
          background: `linear-gradient(180deg, white 0%, ${BRAND.purpleDark}08 100%)`,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Typography variant="h2" sx={{ mb: 2, fontSize: { xs: "2rem", md: "2.8rem" } }}>
              What Our Guests Say
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {TESTIMONIALS.map((t, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card sx={{ height: "100%", p: 0.5 }}>
                    <CardContent>
                      <Stack direction="row" spacing={0.5} sx={{ mb: 2 }}>
                        {[...Array(t.rating)].map((_, j) => (
                          <Star key={j} sx={{ color: BRAND.gold, fontSize: 18 }} />
                        ))}
                      </Stack>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontStyle: "italic", lineHeight: 1.7, mb: 2 }}
                      >
                        "{t.text}"
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: BRAND.purple, width: 36, height: 36, fontSize: 14 }}>
                          {t.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                            {t.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t.event}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ============================================================
          CONTACT & LOCATION
      ============================================================ */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: "background.default" }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={5}>
              <Typography variant="h2" sx={{ mb: 3, fontSize: { xs: "2rem", md: "2.6rem" } }}>
                Find Us
              </Typography>
              <Stack spacing={3}>
                <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                  <Avatar sx={{ bgcolor: `${BRAND.purple}18`, color: BRAND.purple }}>
                    <LocationOn />
                  </Avatar>
                  <Box>
                    <Typography fontWeight={700}>Address</Typography>
                    <Typography color="text.secondary">
                      30 Srinivasa Perumal Sannathi, Anna Salai, New Perungalathur, Chennai – 600 063, Tamil Nadu
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <Avatar sx={{ bgcolor: `${BRAND.purple}18`, color: BRAND.purple }}>
                    <Email />
                  </Avatar>
                  <Box>
                    <Typography fontWeight={700}>Email</Typography>
                    <Typography color="text.secondary">hello@dspirezone.com</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <Avatar sx={{ bgcolor: `${BRAND.purple}18`, color: BRAND.purple }}>
                    <Phone />
                  </Avatar>
                  <Box>
                    <Typography fontWeight={700}>Phone</Typography>
                    <Typography color="text.secondary">+91 98765 43210</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <Avatar sx={{ bgcolor: `${BRAND.purple}18`, color: BRAND.purple }}>
                    <AccessTime />
                  </Avatar>
                  <Box>
                    <Typography fontWeight={700}>Opening Hours</Typography>
                    <Typography color="text.secondary">Mon–Fri: 10am – 9pm</Typography>
                    <Typography color="text.secondary">Sat–Sun: 9am – 10pm</Typography>
                  </Box>
                </Box>
              </Stack>
            </Grid>
            <Grid item xs={12} md={7}>
              {/* Map placeholder */}
              <Box
                sx={{
                  height: 320,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${BRAND.purple}15 0%, ${BRAND.gold}15 100%)`,
                  border: `2px dashed ${BRAND.purple}30`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                }}
              >
                <LocationOn sx={{ fontSize: 48, color: BRAND.purple, opacity: 0.5 }} />
                <Typography color="text.secondary" textAlign="center">
                  New Perungalathur, Chennai – 600 063<br />
                  <Box component="span" sx={{ fontSize: 13, color: "text.disabled" }}>
                    (Add Google Maps embed in production)
                  </Box>
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ============================================================
          CTA BANNER
      ============================================================ */}
      <Box
        sx={{
          py: { xs: 6, md: 10 },
          background: `linear-gradient(135deg, ${BRAND.gold} 0%, #F97316 100%)`,
          textAlign: "center",
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h3" sx={{ color: "white", fontWeight: 800, mb: 2, fontSize: { xs: "1.8rem", md: "2.6rem" } }}>
            Ready to make memories?
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.9)", mb: 4, fontSize: 18 }}>
            Book DspireZone today and let us handle every detail of your celebration.
          </Typography>
          <Button
            component={RouterLink}
            to="/book"
            variant="contained"
            size="large"
            sx={{
              bgcolor: "white",
              color: BRAND.gold,
              fontWeight: 800,
              fontSize: 18,
              px: 5,
              py: 1.5,
              "&:hover": { bgcolor: "rgba(255,255,255,0.9)" },
            }}
          >
            Book Your Event Now
          </Button>
          <Box sx={{ mt: 2 }}>
            <Button
              component={RouterLink}
              to="/modify-booking"
              variant="outlined"
              size="large"
              sx={{
                color: "white",
                borderColor: "rgba(255,255,255,0.7)",
                fontWeight: 700,
                px: 4,
                py: 1.2,
                "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" },
              }}
            >
              Modify / Update My Booking
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
