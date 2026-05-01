import React, { useEffect, useState, useCallback } from "react";
import {
  Box, Container, Typography, Button, Grid, Card, CardContent,
  CardMedia, Paper, Avatar, Chip, Stack, useTheme, useMediaQuery,
  Divider, Accordion, AccordionSummary, AccordionDetails, Collapse,
  IconButton,
} from "@mui/material";
import {
  CelebrationOutlined, CameraAlt, AutoFixHigh, TableBar,
  MusicNote, FoodBank, PartyMode, CheckCircle, Star,
  CalendarMonth, Checklist, ConfirmationNumber, LocationOn,
  Email, Phone, AccessTime, ExpandMore as ExpandMoreIcon,
  ChevronLeft, ChevronRight,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BRAND } from "../theme";
import type { Venue, CatalogItem } from "../types";
import api from "../api/client";

// ----------------------------------------------------------------
// Media assets
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

// Hero slides — each has an image + overlay headline
const HERO_SLIDES = [
  { img: g01, tag: "🎂 Birthday Parties", headline: "Where Every Birthday Becomes Unforgettable", sub: "Curated décor, magic shows & more — all in one stunning venue." },
  { img: g06, tag: "🏢 Corporate Events", headline: "Corporate Events That Actually Feel Special", sub: "Professional AV, dedicated spaces, catering and photography packages." },
  { img: g02, tag: "✨ Magical Ambiances", headline: "Immerse Guests in a World of Light & Wonder", sub: "LED installations, fairy lights and custom setups for every occasion." },
  { img: g04, tag: "🎩 Live Magic Shows", headline: "Surprise Your Guests with World-Class Entertainment", sub: "Professional 60-minute magic acts guaranteed to delight every age." },
];

// Occasion tiles
const OCCASIONS = [
  { img: g01, label: "Birthday Parties", emoji: "🎂", desc: "Make every birthday legendary with décor, magic & photography." },
  { img: g03, label: "Family Gatherings", emoji: "👨‍👩‍👧‍👦", desc: "Warm, intimate settings for family celebrations of any size." },
  { img: g06, label: "Corporate Events", emoji: "🏢", desc: "Impress clients and teams with a polished, seamless experience." },
  { img: g07, label: "Baby Showers", emoji: "🍼", desc: "Soft, elegant setups perfect for welcoming new arrivals." },
  { img: g05, label: "Festive Décor", emoji: "🎊", desc: "Custom balloon arches, floral walls, and LED backdrops." },
  { img: g08, label: "Party Favours", emoji: "🎁", desc: "Return gifts, candles, hats and all your party essentials." },
];

// ----------------------------------------------------------------
// Data
// ----------------------------------------------------------------
const HOW_IT_WORKS = [
  {
    step: "01",
    icon: "📅",
    title: "Pick Your Date",
    desc: "Choose your perfect date and start time. Our smart calendar shows real-time availability in seconds.",
  },
  {
    step: "02",
    icon: "✨",
    title: "Customise Add-ons",
    desc: "Select magic shows, photography, food court tables, decorations, and party essentials — all in one place.",
  },
  {
    step: "03",
    icon: "🎉",
    title: "Confirm & Celebrate",
    desc: "Get an instant confirmation code and enjoy a seamlessly organised event at DspireZone.",
  },
];

const ADD_ON_CARDS = [
  { emoji: "🍽️", img: g03, title: "Catering Packages", desc: "Curated menus for every palate and budget." },
  { emoji: "🎩", img: g04, title: "Magic Show", desc: "60-min professional magic act — all ages guaranteed." },
  { emoji: "📸", img: g07, title: "Photography", desc: "Professional photographer for your full event duration." },
  { emoji: "🎊", img: g05, title: "Decorations", desc: "Balloon arches, floral setups, LED backdrops & more." },
  { emoji: "🍴", img: g06, title: "Food Court Tables", desc: "Reserve dedicated dining tables as a paid add-on." },
  { emoji: "🎁", img: g08, title: "Favors & Essentials", desc: "Balloons, candles, party hats, return gifts & more." },
];

const TESTIMONIALS = [
  { name: "Priya Ramesh", event: "Birthday Party", rating: 5, text: "Absolutely stunning venue! The decoration team was brilliant and the magic show had all the kids mesmerised. Highly recommend DspireZone!" },
  { name: "Karthik & Meena", event: "Baby Shower", rating: 5, text: "Booking was so easy. The 1 room included was perfect for our little gathering and the photography add-on captured every special moment." },
  { name: "Suresh Kumar", event: "Corporate Gathering", rating: 5, text: "Professional setup, great AV system, and the food court tables were a perfect touch. Will definitely book again for our annual event." },
  { name: "Divya Nair", event: "Birthday Party", rating: 5, text: "The fairy lights package and balloon arch were picture-perfect. Our guests couldn't stop complimenting the beautiful decor!" },
];

const MotionBox = motion(Box);
const MotionCard = motion(Card);

// ----------------------------------------------------------------
// Decorative shape helper
// ----------------------------------------------------------------
function FloatingShape({ size, color, top, left, right, bottom, blur = 80, opacity = 0.18, rotate = 0 }: {
  size: number; color: string; top?: string | number; left?: string | number;
  right?: string | number; bottom?: string | number; blur?: number; opacity?: number; rotate?: number;
}) {
  return (
    <Box sx={{
      position: "absolute", width: size, height: size,
      borderRadius: rotate ? 3 : "50%",
      background: color, filter: `blur(${blur}px)`,
      opacity, top, left, right, bottom,
      transform: rotate ? `rotate(${rotate}deg)` : undefined,
      pointerEvents: "none", zIndex: 0,
    }} />
  );
}

// ----------------------------------------------------------------
// Collapsible section for mobile
// ----------------------------------------------------------------
function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  if (!isMobile) return <>{children}</>;
  return (
    <Box sx={{ px: 2, mb: 1.5 }}>
      <Accordion disableGutters elevation={0} sx={{
        border: `1px solid rgba(74,14,143,0.15)`, borderRadius: "12px !important",
        "&:before": { display: "none" }, overflow: "hidden",
      }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: BRAND.purple }} />}
          sx={{ bgcolor: `${BRAND.purple}08`, minHeight: 52, "& .MuiAccordionSummary-content": { my: 0 } }}>
          <Typography fontWeight={700} sx={{ color: BRAND.purple, fontSize: "0.95rem" }}>{title}</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>{children}</AccordionDetails>
      </Accordion>
    </Box>
  );
}

// ================================================================
// HOME PAGE
// ================================================================
export default function Home() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [venue, setVenue] = useState<Venue | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [heroSlide, setHeroSlide] = useState(0);

  useEffect(() => {
    api.get<Venue>("/venue").then((r) => setVenue(r.data)).catch(() => {});
  }, []);

  // Auto-advance hero carousel
  useEffect(() => {
    const t = setInterval(() => setHeroSlide((s) => (s + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const prevSlide = useCallback(() => setHeroSlide((s) => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length), []);
  const nextSlide = useCallback(() => setHeroSlide((s) => (s + 1) % HERO_SLIDES.length), []);

  return (
    <Box sx={{ overflowX: "hidden" }}>

      {/* ============================================================
          HERO — Full-viewport image carousel
      ============================================================ */}
      <Box sx={{ position: "relative", minHeight: { xs: "90vh", md: "95vh" }, overflow: "hidden", bgcolor: "#0a0015" }}>
        {/* Slide images */}
        <AnimatePresence mode="wait">
          <MotionBox
            key={heroSlide}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
            sx={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${HERO_SLIDES[heroSlide].img})`,
              backgroundSize: "cover", backgroundPosition: "center",
              filter: "brightness(0.45)",
            }}
          />
        </AnimatePresence>

        {/* Gradient vignette */}
        <Box sx={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(10,0,21,0.3) 0%, rgba(10,0,21,0.0) 40%, rgba(10,0,21,0.85) 100%)",
          zIndex: 1,
        }} />

        {/* Decorative neon orbs */}
        <FloatingShape size={400} color={`radial-gradient(circle, ${BRAND.purpleLight} 0%, transparent 70%)`} top="-10%" right="-8%" opacity={0.25} blur={0} />
        <FloatingShape size={280} color={`radial-gradient(circle, ${BRAND.gold} 0%, transparent 70%)`} bottom="10%" left="-5%" opacity={0.15} blur={0} />

        {/* Slide content */}
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 2, height: "100%", display: "flex", alignItems: "flex-end", pb: { xs: 8, md: 12 } }}>
          <AnimatePresence mode="wait">
            <MotionBox
              key={`text-${heroSlide}`}
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              sx={{ maxWidth: 720 }}
            >
              <Chip label={HERO_SLIDES[heroSlide].tag} sx={{
                bgcolor: "rgba(245,158,11,0.22)", color: BRAND.goldLight, fontWeight: 700,
                border: `1px solid ${BRAND.gold}55`, mb: 2.5, fontSize: "0.85rem",
              }} />
              <Typography variant="h1" sx={{
                color: "white", fontSize: { xs: "2.2rem", sm: "3rem", md: "4rem" },
                lineHeight: 1.1, mb: 2.5, textShadow: "0 2px 24px rgba(0,0,0,0.5)",
              }}>
                {HERO_SLIDES[heroSlide].headline}
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: { xs: "1rem", md: "1.2rem" }, mb: 4, lineHeight: 1.7 }}>
                {HERO_SLIDES[heroSlide].sub}
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Button
                  component={RouterLink} to="/book"
                  variant="contained" color="secondary" size="large"
                  sx={{ py: 1.75, px: 5, fontSize: 17, fontWeight: 800, borderRadius: 3, boxShadow: `0 8px 32px ${BRAND.gold}55` }}
                >
                  Book Your Event →
                </Button>
                <Button
                  component={RouterLink} to="/dspire-vr-zone"
                  variant="outlined" size="large"
                  sx={{ py: 1.75, px: 4, fontSize: 15, fontWeight: 700, color: "white", borderColor: "rgba(255,255,255,0.55)", borderRadius: 3, borderWidth: 2, "&:hover": { borderWidth: 2, borderColor: "white", bgcolor: "rgba(255,255,255,0.08)" } }}
                >
                  🥽 Explore VR Zone
                </Button>
              </Stack>
              {venue && (
                <Stack direction="row" spacing={3} sx={{ mt: 4, flexWrap: "wrap", gap: 1.5 }}>
                  {[
                    { icon: "✅", text: "1 room included free" },
                    { icon: "⏱", text: `Min ${venue.min_hours}h booking` },
                    { icon: "💰", text: `From ₹${venue.base_hourly_rate.toLocaleString("en-IN")}/hr` },
                  ].map(({ icon, text }) => (
                    <Box key={text} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography sx={{ fontSize: 15 }}>{icon}</Typography>
                      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>{text}</Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </MotionBox>
          </AnimatePresence>
        </Container>

        {/* Carousel controls */}
        <Box sx={{ position: "absolute", bottom: { xs: 24, md: 32 }, right: { xs: 16, md: 40 }, zIndex: 3, display: "flex", gap: 1, alignItems: "center" }}>
          {HERO_SLIDES.map((_, i) => (
            <Box key={i} onClick={() => setHeroSlide(i)} sx={{
              width: i === heroSlide ? 28 : 8, height: 8, borderRadius: 4,
              bgcolor: i === heroSlide ? BRAND.gold : "rgba(255,255,255,0.4)",
              cursor: "pointer", transition: "all 0.3s ease",
            }} />
          ))}
        </Box>
        <IconButton onClick={prevSlide} sx={{ position: "absolute", left: { xs: 8, md: 24 }, top: "50%", transform: "translateY(-50%)", zIndex: 3, color: "white", bgcolor: "rgba(0,0,0,0.35)", "&:hover": { bgcolor: "rgba(0,0,0,0.6)" } }}>
          <ChevronLeft />
        </IconButton>
        <IconButton onClick={nextSlide} sx={{ position: "absolute", right: { xs: 8, md: 24 }, top: "50%", transform: "translateY(-50%)", zIndex: 3, color: "white", bgcolor: "rgba(0,0,0,0.35)", "&:hover": { bgcolor: "rgba(0,0,0,0.6)" } }}>
          <ChevronRight />
        </IconButton>
      </Box>

      {/* ============================================================
          OCCASIONS — Image tiles with dark caption boxes
      ============================================================ */}
      <Box sx={{ py: { xs: 5, md: 12 }, bgcolor: "#fff", position: "relative", overflow: "hidden" }}>
        {/* Decorative bg shapes */}
        <FloatingShape size={320} color={`${BRAND.purple}18`} top="-60px" right="-80px" blur={80} opacity={1} rotate={20} />
        <FloatingShape size={220} color={`${BRAND.gold}14`} bottom="-40px" left="-60px" blur={60} opacity={1} rotate={-15} />
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          <Box sx={{ textAlign: "center", mb: { xs: 4, md: 7 } }}>
            <Chip label="Every Occasion" sx={{ bgcolor: `${BRAND.gold}22`, color: BRAND.goldDark, fontWeight: 700, mb: 2 }} />
            <Typography variant="h2" sx={{ fontSize: { xs: "2rem", md: "3rem" }, color: BRAND.charcoal }}>
              Perfect for <Box component="span" sx={{ color: BRAND.purple }}>Every Occasion</Box>
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 520, mx: "auto" }}>
              From intimate baby showers to lively birthday bashes — DspireZone sets the scene.
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {OCCASIONS.map((occ, i) => (
              <Grid item xs={6} sm={4} md={4} key={i}>
                <MotionBox
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  whileHover={{ y: -6, transition: { duration: 0.25 } }}
                >
                  <Box sx={{ borderRadius: 3, overflow: "hidden", boxShadow: "0 4px 28px rgba(74,14,143,0.12)", cursor: "default" }}>
                    {/* Image */}
                    <Box sx={{ position: "relative", height: { xs: 140, sm: 180, md: 210 }, overflow: "hidden" }}>
                      <Box component="img" src={occ.img} alt={occ.label} sx={{
                        width: "100%", height: "100%", objectFit: "cover",
                        transition: "transform 0.45s ease", "&:hover": { transform: "scale(1.06)" },
                      }} />
                      <Box sx={{
                        position: "absolute", top: 10, left: 10,
                        bgcolor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
                        borderRadius: 6, px: 1.2, py: 0.4,
                        border: "1px solid rgba(255,255,255,0.2)",
                      }}>
                        <Typography sx={{ fontSize: { xs: "0.7rem", md: "0.8rem" }, color: "white", fontWeight: 700 }}>
                          {occ.emoji} {occ.label}
                        </Typography>
                      </Box>
                    </Box>
                    {/* Dark content box */}
                    <Box sx={{
                      bgcolor: BRAND.charcoal, px: { xs: 1.5, md: 2.5 }, py: { xs: 1.5, md: 2 },
                      borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
                    }}>
                      <Typography sx={{ color: "rgba(255,255,255,0.85)", fontSize: { xs: "0.78rem", md: "0.9rem" }, lineHeight: 1.5 }}>
                        {occ.desc}
                      </Typography>
                    </Box>
                  </Box>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ============================================================
          EXPERIENCES — Alternating image + dark text panels
      ============================================================ */}
      <Box sx={{ py: { xs: 5, md: 14 }, bgcolor: BRAND.charcoal, position: "relative", overflow: "hidden" }}>
        <FloatingShape size={500} color={`radial-gradient(circle, ${BRAND.purple}60, transparent 70%)`} top="-100px" right="-150px" blur={0} opacity={0.2} />
        <FloatingShape size={350} color={`radial-gradient(circle, ${BRAND.gold}50, transparent 70%)`} bottom="-80px" left="-100px" blur={0} opacity={0.15} />
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          {/* Section title — white bg pill */}
          <Box sx={{ display: "flex", justifyContent: "center", mb: { xs: 5, md: 9 } }}>
            <Box sx={{ bgcolor: "#fff", borderRadius: 40, px: 4, py: 1.2, boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>
              <Typography variant="h4" sx={{ color: BRAND.charcoal, fontWeight: 800, fontSize: { xs: "1.3rem", md: "1.8rem" } }}>
                🎯 Experiences at DspireZone
              </Typography>
            </Box>
          </Box>
          {/* Row 1: image left, text right */}
          <Grid container spacing={{ xs: 3, md: 6 }} alignItems="center" sx={{ mb: { xs: 5, md: 10 } }}>
            <Grid item xs={12} md={6}>
              <MotionBox initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.65 }}>
                <Box sx={{ borderRadius: 4, overflow: "hidden", boxShadow: "0 12px 60px rgba(0,0,0,0.45)", position: "relative" }}>
                  <Box component="img" src={g01} alt="Birthday party" sx={{ width: "100%", height: { xs: 220, md: 340 }, objectFit: "cover", display: "block" }} />
                  <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(10,0,21,0.6) 100%)" }} />
                </Box>
              </MotionBox>
            </Grid>
            <Grid item xs={12} md={6}>
              <MotionBox initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.65, delay: 0.15 }}>
                <Box sx={{ bgcolor: "#1e1040", borderRadius: 4, p: { xs: 3, md: 5 }, border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 8px 40px rgba(0,0,0,0.3)" }}>
                  <Chip label="🎂 Birthdays & Parties" sx={{ bgcolor: `${BRAND.gold}28`, color: BRAND.goldLight, fontWeight: 700, mb: 2.5, border: `1px solid ${BRAND.gold}44` }} />
                  <Typography variant="h4" sx={{ color: "white", fontWeight: 800, mb: 2, fontSize: { xs: "1.5rem", md: "2rem" } }}>
                    Make Every Birthday Legendary
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.8, mb: 3 }}>
                    Transform any birthday into a memory that lasts a lifetime. We handle décor, entertainment, photography and food — so you can focus on celebrating. Perfect for kids, teens, and milestone adult parties alike.
                  </Typography>
                  <Stack spacing={1.2}>
                    {["Custom balloon arches & LED backdrops", "Professional 60-min magic shows", "Photography & videography packages", "Private dining rooms with catering"].map((item) => (
                      <Box key={item} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <CheckCircle sx={{ color: BRAND.gold, fontSize: 18 }} />
                        <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem" }}>{item}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </MotionBox>
            </Grid>
          </Grid>
          {/* Row 2: text left, image right */}
          <Grid container spacing={{ xs: 3, md: 6 }} alignItems="center" direction={{ xs: "column-reverse", md: "row" }}>
            <Grid item xs={12} md={6}>
              <MotionBox initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.65, delay: 0.15 }}>
                <Box sx={{ bgcolor: "#1e1040", borderRadius: 4, p: { xs: 3, md: 5 }, border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 8px 40px rgba(0,0,0,0.3)" }}>
                  <Chip label="🏢 Corporate & Groups" sx={{ bgcolor: "rgba(123,66,209,0.28)", color: "#C084FC", fontWeight: 700, mb: 2.5, border: "1px solid rgba(192,132,252,0.35)" }} />
                  <Typography variant="h4" sx={{ color: "white", fontWeight: 800, mb: 2, fontSize: { xs: "1.5rem", md: "2rem" } }}>
                    Corporate Events That Inspire
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.8, mb: 3 }}>
                    Impress your team, clients, and stakeholders with a venue that seamlessly transitions from professional to fun. AV-ready spaces, premium catering and a dedicated coordinator at your service.
                  </Typography>
                  <Stack spacing={1.2}>
                    {["Full AV system — projector, PA & mic", "Breakout room for up to 50 guests", "Fully air-conditioned with free parking", "Custom branding & seating arrangements"].map((item) => (
                      <Box key={item} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <CheckCircle sx={{ color: "#C084FC", fontSize: 18 }} />
                        <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem" }}>{item}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </MotionBox>
            </Grid>
            <Grid item xs={12} md={6}>
              <MotionBox initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.65 }}>
                <Box sx={{ borderRadius: 4, overflow: "hidden", boxShadow: "0 12px 60px rgba(0,0,0,0.45)", position: "relative" }}>
                  <Box component="img" src={g06} alt="Corporate event" sx={{ width: "100%", height: { xs: 220, md: 340 }, objectFit: "cover", display: "block" }} />
                  <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(10,0,21,0.6) 100%)" }} />
                </Box>
              </MotionBox>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ============================================================
          VR ZONE TEASER — High-energy neon dark section
      ============================================================ */}
      <Box sx={{
        position: "relative", overflow: "hidden",
        background: "linear-gradient(135deg, #05001A 0%, #0D0035 50%, #1A0050 100%)",
        py: { xs: 6, md: 14 },
      }}>
        {/* Animated grid background */}
        <Box sx={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: "linear-gradient(rgba(0,245,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
        {/* Neon glow orbs */}
        <Box sx={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, #BF00FF 0%, transparent 70%)", opacity: 0.18, top: "-80px", right: "-80px", filter: "blur(40px)" }} />
        <Box sx={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, #00F5FF 0%, transparent 70%)", opacity: 0.15, bottom: "-60px", left: "15%", filter: "blur(40px)" }} />
        <Box sx={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, #FF006E 0%, transparent 70%)", opacity: 0.12, top: "30%", left: "-60px", filter: "blur(30px)" }} />

        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          {/* White-bg section title */}
          <Box sx={{ display: "flex", justifyContent: "center", mb: { xs: 5, md: 8 } }}>
            <Box sx={{ bgcolor: "#fff", borderRadius: 40, px: 4, py: 1.2, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
              <Typography variant="h4" sx={{ color: BRAND.charcoal, fontWeight: 800, fontSize: { xs: "1.2rem", md: "1.7rem" } }}>
                🥽 DspireVR Zone
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={{ xs: 3, md: 8 }} alignItems="center">
            <Grid item xs={12} md={6}>
              <MotionBox initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
                {/* VR visual mockup */}
                <Box sx={{
                  position: "relative", borderRadius: 4, overflow: "hidden",
                  border: "1px solid rgba(0,245,255,0.25)",
                  boxShadow: "0 0 60px rgba(191,0,255,0.2), 0 0 120px rgba(0,245,255,0.1)",
                  bgcolor: "#0a0020",
                }}>
                  <Box component="img" src={g02} alt="VR Zone" sx={{
                    width: "100%", height: { xs: 240, md: 380 }, objectFit: "cover", display: "block",
                    filter: "hue-rotate(200deg) saturate(1.4) brightness(0.6)",
                  }} />
                  <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(191,0,255,0.3) 0%, rgba(0,245,255,0.15) 50%, transparent 70%)" }} />
                  {/* Scan-line overlay */}
                  <Box sx={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,245,255,0.03) 3px, rgba(0,245,255,0.03) 4px)" }} />
                  {/* Coming soon badge */}
                  <Box sx={{ position: "absolute", top: 20, right: 20 }}>
                    <Chip label="COMING SOON" sx={{ bgcolor: "#FF006E", color: "white", fontWeight: 800, fontSize: "0.7rem", letterSpacing: 2, boxShadow: "0 0 16px rgba(255,0,110,0.6)" }} />
                  </Box>
                  {/* Corner decorations */}
                  <Box sx={{ position: "absolute", top: 0, left: 0, width: 40, height: 40, borderTop: "2px solid rgba(0,245,255,0.6)", borderLeft: "2px solid rgba(0,245,255,0.6)", borderRadius: "4px 0 0 0" }} />
                  <Box sx={{ position: "absolute", bottom: 0, right: 0, width: 40, height: 40, borderBottom: "2px solid rgba(191,0,255,0.6)", borderRight: "2px solid rgba(191,0,255,0.6)", borderRadius: "0 0 4px 0" }} />
                </Box>
              </MotionBox>
            </Grid>
            <Grid item xs={12} md={6}>
              <MotionBox initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2 }}>
                {/* Neon dark text box */}
                <Box sx={{
                  bgcolor: "rgba(13,0,53,0.8)", borderRadius: 4, p: { xs: 3, md: 5 },
                  border: "1px solid rgba(0,245,255,0.2)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
                }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2.5, gap: 1 }}>
                    <Chip label="Free-Roam VR Arena" size="small" sx={{ bgcolor: "rgba(0,245,255,0.12)", color: "#00F5FF", fontWeight: 700, border: "1px solid rgba(0,245,255,0.3)" }} />
                    <Chip label="Multi-Player" size="small" sx={{ bgcolor: "rgba(191,0,255,0.12)", color: "#C084FC", fontWeight: 700, border: "1px solid rgba(191,0,255,0.3)" }} />
                  </Stack>
                  <Typography sx={{
                    fontWeight: 900, fontSize: { xs: "1.8rem", md: "2.5rem" }, lineHeight: 1.1, mb: 2,
                    background: "linear-gradient(90deg, #00F5FF 0%, #BF00FF 55%, #FF006E 100%)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                  }}>
                    Step Into Another Reality
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.8, mb: 3.5, fontSize: "1rem" }}>
                    DspireVR Zone is coming to Perungalathur — a full free-roam virtual reality arena where friends, families and thrill-seekers can battle, explore and experience worlds beyond imagination.
                  </Typography>
                  <Stack spacing={1.5}>
                    {[
                      { icon: "🎮", text: "Multiplayer free-roam VR experiences" },
                      { icon: "👨‍👩‍👧", text: "Family-friendly & age-appropriate content" },
                      { icon: "🏆", text: "Competitive arena games for groups" },
                      { icon: "🚀", text: "State-of-the-art VR headsets & haptic tech" },
                    ].map(({ icon, text }) => (
                      <Box key={text} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Typography sx={{ fontSize: 18 }}>{icon}</Typography>
                        <Typography sx={{ color: "rgba(255,255,255,0.82)", fontSize: "0.95rem" }}>{text}</Typography>
                      </Box>
                    ))}
                  </Stack>
                  <Button
                    component={RouterLink} to="/dspire-vr-zone" variant="outlined" size="large"
                    sx={{ mt: 4, borderColor: "rgba(0,245,255,0.5)", color: "#00F5FF", fontWeight: 700, borderRadius: 3, "&:hover": { borderColor: "#00F5FF", bgcolor: "rgba(0,245,255,0.08)" } }}
                  >
                    Learn More About VR Zone →
                  </Button>
                </Box>
              </MotionBox>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ============================================================
          HOW IT WORKS
      ============================================================ */}
      <Box sx={{ py: { xs: 5, md: 12 }, bgcolor: "#fff", position: "relative", overflow: "hidden" }}>
        <FloatingShape size={260} color={`${BRAND.purpleLight}18`} top="-40px" left="-60px" blur={70} opacity={1} />
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          <Box sx={{ textAlign: "center", mb: { xs: 4, md: 7 } }}>
            <Chip label="Simple Process" color="primary" sx={{ mb: 2, fontWeight: 700 }} />
            <Typography variant="h2" sx={{ mb: 2, fontSize: { xs: "2rem", md: "3rem" }, color: BRAND.charcoal }}>
              How It Works
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480, mx: "auto" }}>
              3 easy steps to your perfect celebration
            </Typography>
          </Box>
          <Grid container spacing={{ xs: 1.5, md: 4 }}>
            {HOW_IT_WORKS.map((step, i) => (
              <Grid item xs={4} md={4} key={i}>
                <MotionBox initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}>
                  <Card sx={{ height: "100%", border: `1px solid rgba(74,14,143,0.1)`, position: "relative", overflow: "visible", bgcolor: "#fff" }}>
                    <Box sx={{
                      position: "absolute", top: -14, left: 16,
                      width: 28, height: 28, borderRadius: "50%",
                      bgcolor: BRAND.purple, color: "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 11,
                    }}>
                      {step.step}
                    </Box>
                    <CardContent sx={{ pt: 2.5, pb: "12px !important", px: { xs: 1.5, md: 2 } }}>
                      <Box
                        onClick={() => isMobile && setExpandedStep(expandedStep === i ? null : i)}
                        sx={{ display: "flex", alignItems: "center", gap: 1, mb: { xs: 0, md: 1.5 }, cursor: isMobile ? "pointer" : "default" }}
                      >
                        <Box sx={{ fontSize: { xs: 20, md: 32 }, lineHeight: 1, flexShrink: 0 }}>{step.icon}</Box>
                        <Typography fontWeight={700} sx={{ fontSize: { xs: "0.8rem", md: "1.1rem" }, lineHeight: 1.2, flex: 1 }}>
                          {step.title}
                        </Typography>
                        <Box sx={{ display: { xs: "flex", md: "none" }, transition: "transform 0.25s", transform: expandedStep === i ? "rotate(180deg)" : "rotate(0deg)", color: "text.secondary", flexShrink: 0 }}>
                          <ExpandMoreIcon sx={{ fontSize: 14 }} />
                        </Box>
                      </Box>
                      <Collapse in={!isMobile || expandedStep === i}>
                        <Typography variant="body2" color="text.secondary" lineHeight={1.6} sx={{ fontSize: { xs: "0.72rem", md: "0.875rem" }, mt: { xs: 0.75, md: 0 } }}>
                          {step.desc}
                        </Typography>
                      </Collapse>
                    </CardContent>
                  </Card>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ textAlign: "center", mt: { xs: 4, md: 6 } }}>
            <Button component={RouterLink} to="/book" variant="contained" color="primary" size="large" sx={{ px: 5, py: 1.5, fontWeight: 800 }}>
              Start Booking Now →
            </Button>
          </Box>
        </Container>
      </Box>

      {/* ============================================================
          ADD-ONS GALLERY — Visual grid leading into dark text
      ============================================================ */}
      <CollapsibleSection title="📦 Packages & Add-ons">
        <Box sx={{ py: { xs: 4, md: 12 }, bgcolor: BRAND.charcoal, position: "relative", overflow: "hidden" }}>
          <FloatingShape size={400} color={`radial-gradient(circle, ${BRAND.purple}50, transparent 70%)`} top="-100px" right="-100px" blur={0} opacity={0.2} />
          <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
            {/* White bg title */}
            <Box sx={{ display: "flex", justifyContent: "center", mb: { xs: 4, md: 7 } }}>
              <Box sx={{ bgcolor: "#fff", borderRadius: 40, px: 4, py: 1, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
                <Typography variant="h4" sx={{ color: BRAND.charcoal, fontWeight: 800, fontSize: { xs: "1.2rem", md: "1.7rem" } }}>
                  📦 Packages &amp; Add-ons
                </Typography>
              </Box>
            </Box>
            <Grid container spacing={3}>
              {ADD_ON_CARDS.map((card, i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <MotionBox initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} whileHover={{ y: -6, transition: { duration: 0.2 } }}>
                    <Box sx={{ borderRadius: 3, overflow: "hidden", boxShadow: "0 6px 32px rgba(0,0,0,0.35)" }}>
                      {/* Image */}
                      <Box component="img" src={card.img} alt={card.title} sx={{ width: "100%", height: 160, objectFit: "cover", display: "block", filter: "brightness(0.85)" }} />
                      {/* Dark info box */}
                      <Box sx={{ bgcolor: "#1e1040", px: 2.5, py: 2, borderTop: `2px solid ${BRAND.gold}55` }}>
                        <Typography sx={{ fontSize: "1.5rem", mb: 0.5 }}>{card.emoji}</Typography>
                        <Typography variant="h6" sx={{ color: "white", fontWeight: 700, fontSize: "1rem", mb: 0.5 }}>{card.title}</Typography>
                        <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: "0.85rem", lineHeight: 1.6 }}>{card.desc}</Typography>
                      </Box>
                    </Box>
                  </MotionBox>
                </Grid>
              ))}
            </Grid>
            <Box sx={{ textAlign: "center", mt: { xs: 4, md: 6 } }}>
              <Button component={RouterLink} to="/packages" variant="outlined" size="large" sx={{ color: BRAND.goldLight, borderColor: `${BRAND.gold}77`, fontWeight: 700, "&:hover": { borderColor: BRAND.gold, bgcolor: `${BRAND.gold}11` } }}>
                View Full Catalog →
              </Button>
            </Box>
          </Container>
        </Box>
      </CollapsibleSection>

      {/* ============================================================
          WHAT'S INCLUDED — Image + dark checklist panel
      ============================================================ */}
      <CollapsibleSection title="✅ What's Included in Every Booking">
        <Box sx={{ py: { xs: 4, md: 12 }, bgcolor: "#fff", position: "relative", overflow: "hidden" }}>
          <FloatingShape size={350} color={`${BRAND.gold}12`} top="-60px" right="-80px" blur={80} opacity={1} rotate={30} />
          <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
            <Grid container spacing={{ xs: 3, md: 6 }} alignItems="center">
              <Grid item xs={12} md={6}>
                <MotionBox initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                  <Box sx={{ borderRadius: 4, overflow: "hidden", boxShadow: "0 8px 48px rgba(74,14,143,0.15)", position: "relative" }}>
                    <Box component="img" src={g06} alt="Included" sx={{ width: "100%", height: { xs: 220, md: 360 }, objectFit: "cover", display: "block" }} />
                    <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(26,5,64,0.5) 100%)" }} />
                    <Chip label="✅ Always Included" sx={{ position: "absolute", bottom: 16, left: 16, bgcolor: "#10B981", color: "white", fontWeight: 700 }} />
                  </Box>
                </MotionBox>
              </Grid>
              <Grid item xs={12} md={6}>
                <MotionBox initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }}>
                  {/* White section title */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h3" sx={{ color: BRAND.charcoal, fontWeight: 800, fontSize: { xs: "1.7rem", md: "2.2rem" } }}>
                      Everything You Need <Box component="span" sx={{ color: BRAND.purple }}>Included</Box>
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>Every booking comes with our essential package — no hidden surprises.</Typography>
                  </Box>
                  {/* Dark info grid */}
                  <Grid container spacing={2}>
                    {[
                      { icon: "🏠", label: "1 Private Room", sub: "Complimentary, no extra charge" },
                      { icon: "🔊", label: "AV Setup", sub: "Projector, PA system & mic" },
                      { icon: "🪑", label: "Tables & Chairs", sub: "For up to 50 guests" },
                      { icon: "❄️", label: "Air Conditioning", sub: "Climate-controlled comfort" },
                      { icon: "🚗", label: "Free Parking", sub: "On-site vehicle parking" },
                      { icon: "🧹", label: "Post-event Cleanup", sub: "Included in your booking" },
                    ].map((item) => (
                      <Grid item xs={12} sm={6} key={item.label}>
                        <Box sx={{ bgcolor: BRAND.charcoal, borderRadius: 3, p: 2, border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 2px 12px rgba(0,0,0,0.14)" }}>
                          <Typography sx={{ fontSize: 26, mb: 0.5 }}>{item.icon}</Typography>
                          <Typography sx={{ color: "white", fontWeight: 700, fontSize: "0.95rem" }}>{item.label}</Typography>
                          <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.8rem" }}>{item.sub}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                  <Button component={RouterLink} to="/book" variant="contained" color="primary" size="large" sx={{ mt: 3.5, fontWeight: 800 }}>
                    Book Now →
                  </Button>
                </MotionBox>
              </Grid>
            </Grid>
          </Container>
        </Box>
      </CollapsibleSection>

      {/* ============================================================
          GALLERY — Visual grid (collapsible on mobile)
      ============================================================ */}
      <CollapsibleSection title="🖼️ Photo Gallery">
        <Box sx={{ py: { xs: 4, md: 12 }, bgcolor: BRAND.charcoal, position: "relative", overflow: "hidden" }}>
          <FloatingShape size={300} color={`${BRAND.gold}22`} bottom="-60px" right="-60px" blur={80} opacity={1} />
          <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "center", mb: { xs: 4, md: 6 } }}>
              <Box sx={{ bgcolor: "#fff", borderRadius: 40, px: 4, py: 1, boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}>
                <Typography variant="h4" sx={{ color: BRAND.charcoal, fontWeight: 800, fontSize: { xs: "1.2rem", md: "1.7rem" } }}>
                  📸 A Glimpse of the Magic
                </Typography>
              </Box>
            </Box>
            <Grid container spacing={2}>
              {GALLERY_IMAGES.map((img, i) => (
                <Grid item xs={6} sm={4} md={3} key={i}>
                  <MotionBox whileHover={{ scale: 1.04 }} transition={{ type: "spring", stiffness: 300 }}>
                    <Box
                      component="img" src={img} alt={`Gallery ${i + 1}`}
                      onClick={() => setLightboxImg(img)}
                      sx={{
                        width: "100%", height: { xs: 130, sm: 170, md: 200 },
                        objectFit: "cover", borderRadius: 2, cursor: "pointer", display: "block",
                        border: "2px solid rgba(255,255,255,0.06)",
                        transition: "filter 0.2s", "&:hover": { filter: "brightness(1.1)" },
                      }}
                    />
                  </MotionBox>
                </Grid>
              ))}
            </Grid>
            <Box sx={{ textAlign: "center", mt: { xs: 3, md: 5 } }}>
              <Button component={RouterLink} to="/gallery" variant="outlined" sx={{ color: BRAND.goldLight, borderColor: `${BRAND.gold}55`, fontWeight: 700, "&:hover": { borderColor: BRAND.gold } }}>
                View Full Gallery →
              </Button>
            </Box>
          </Container>
        </Box>
      </CollapsibleSection>

      {/* Lightbox */}
      {lightboxImg && (
        <Box onClick={() => setLightboxImg(null)} sx={{
          position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.92)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, cursor: "pointer",
        }}>
          <Box component="img" src={lightboxImg} alt="Gallery full view" sx={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 2 }} />
        </Box>
      )}

      {/* ============================================================
          TESTIMONIALS (collapsible on mobile)
      ============================================================ */}
      <CollapsibleSection title="⭐ Guest Reviews">
        <Box sx={{ py: { xs: 4, md: 12 }, bgcolor: "#fff", position: "relative", overflow: "hidden" }}>
          <FloatingShape size={280} color={`${BRAND.purple}10`} top="-40px" left="-60px" blur={70} opacity={1} />
          <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
            <Box sx={{ textAlign: "center", mb: { xs: 4, md: 6 } }}>
              <Typography variant="h2" sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, color: BRAND.charcoal }}>
                What Our <Box component="span" sx={{ color: BRAND.purple }}>Guests</Box> Say
              </Typography>
            </Box>
            <Grid container spacing={3}>
              {TESTIMONIALS.map((t, i) => (
                <Grid item xs={12} sm={6} md={3} key={i}>
                  <MotionBox initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                    <Box sx={{ bgcolor: BRAND.charcoal, borderRadius: 3, p: { xs: 2.5, md: 3 }, height: "100%", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}>
                      <Stack direction="row" spacing={0.5} sx={{ mb: 2 }}>
                        {[...Array(t.rating)].map((_, j) => (
                          <Star key={j} sx={{ color: BRAND.gold, fontSize: 18 }} />
                        ))}
                      </Stack>
                      <Typography sx={{ color: "rgba(255,255,255,0.78)", fontStyle: "italic", lineHeight: 1.7, mb: 2.5, fontSize: "0.9rem" }}>
                        "{t.text}"
                      </Typography>
                      <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mb: 2 }} />
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: BRAND.purple, width: 36, height: 36, fontSize: 14 }}>{t.name.charAt(0)}</Avatar>
                        <Box>
                          <Typography sx={{ color: "white", fontWeight: 700, fontSize: "0.9rem", lineHeight: 1.2 }}>{t.name}</Typography>
                          <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem" }}>{t.event}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </MotionBox>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      </CollapsibleSection>

      {/* ============================================================
          FIND US (collapsible on mobile)
      ============================================================ */}
      <CollapsibleSection title="📍 Find Us">
        <Box sx={{ py: { xs: 4, md: 12 }, bgcolor: BRAND.charcoal, position: "relative", overflow: "hidden" }}>
          <FloatingShape size={300} color={`${BRAND.purpleLight}20`} top="-60px" right="-80px" blur={80} opacity={1} />
          <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "center", mb: { xs: 4, md: 6 } }}>
              <Box sx={{ bgcolor: "#fff", borderRadius: 40, px: 4, py: 1, boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}>
                <Typography variant="h4" sx={{ color: BRAND.charcoal, fontWeight: 800, fontSize: { xs: "1.2rem", md: "1.7rem" } }}>
                  📍 Find Us
                </Typography>
              </Box>
            </Box>
            <Grid container spacing={6} alignItems="center">
              <Grid item xs={12} md={5}>
                <Stack spacing={3}>
                  {[
                    { icon: <LocationOn />, title: "Address", detail: "30 Srinivasa Perumal Sannathi, Anna Salai, New Perungalathur, Chennai – 600 063, Tamil Nadu" },
                    { icon: <Email />, title: "Email", detail: "hello@dspirezone.com" },
                    { icon: <Phone />, title: "Phone", detail: "+91 98765 43210" },
                    { icon: <AccessTime />, title: "Hours", detail: "Mon–Fri: 10am–9pm  |  Sat–Sun: 9am–10pm" },
                  ].map((c) => (
                    <Box key={c.title} sx={{ display: "flex", gap: 2.5, alignItems: "flex-start" }}>
                      <Avatar sx={{ bgcolor: `${BRAND.purple}33`, color: BRAND.goldLight, flexShrink: 0 }}>{c.icon}</Avatar>
                      <Box>
                        <Typography sx={{ color: "white", fontWeight: 700, mb: 0.3 }}>{c.title}</Typography>
                        <Typography sx={{ color: "rgba(255,255,255,0.62)", fontSize: "0.9rem", lineHeight: 1.6 }}>{c.detail}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Grid>
              <Grid item xs={12} md={7}>
                <Box sx={{
                  height: 300, borderRadius: 4,
                  background: `linear-gradient(135deg, ${BRAND.purple}22 0%, ${BRAND.gold}18 100%)`,
                  border: `2px dashed rgba(245,158,11,0.35)`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                }}>
                  <LocationOn sx={{ fontSize: 52, color: BRAND.goldLight, opacity: 0.6 }} />
                  <Typography sx={{ color: "rgba(255,255,255,0.7)", textAlign: "center" }}>
                    New Perungalathur, Chennai – 600 063
                    <Box component="span" sx={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.4)", mt: 0.5 }}>(Add Google Maps embed in production)</Box>
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Container>
        </Box>
      </CollapsibleSection>

      {/* ============================================================
          BOTTOM CTA BAND
      ============================================================ */}
      <Box sx={{
        py: { xs: 7, md: 12 }, textAlign: "center", position: "relative", overflow: "hidden",
        background: `linear-gradient(135deg, ${BRAND.purpleDark} 0%, ${BRAND.purple} 60%, ${BRAND.purpleLight} 100%)`,
      }}>
        <FloatingShape size={350} color={`${BRAND.gold}20`} top="-60px" right="-80px" blur={80} opacity={1} />
        <FloatingShape size={250} color="rgba(255,255,255,0.06)" bottom="-60px" left="-60px" blur={0} opacity={1} rotate={35} />
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <Chip label="🎉 Limited slots available" sx={{ bgcolor: `${BRAND.gold}30`, color: BRAND.goldLight, fontWeight: 700, mb: 2.5, border: `1px solid ${BRAND.gold}55` }} />
          <Typography variant="h2" sx={{ color: "white", fontWeight: 900, mb: 2, fontSize: { xs: "2rem", md: "3rem" }, textShadow: "0 2px 16px rgba(0,0,0,0.3)" }}>
            Ready to Make Memories?
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.8)", mb: 5, fontSize: { xs: "1rem", md: "1.2rem" }, maxWidth: 520, mx: "auto", lineHeight: 1.8 }}>
            Book DspireZone today and let us handle every detail of your perfect celebration.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} justifyContent="center">
            <Button
              component={RouterLink} to="/book"
              variant="contained" color="secondary" size="large"
              sx={{ py: 2, px: 6, fontWeight: 900, fontSize: 18, borderRadius: 3, boxShadow: `0 8px 32px ${BRAND.gold}55` }}
            >
              Book Your Event Now
            </Button>
            <Button
              component={RouterLink} to="/modify-booking"
              variant="outlined" size="large"
              sx={{ py: 2, px: 4, fontWeight: 700, fontSize: 15, color: "white", borderColor: "rgba(255,255,255,0.5)", borderRadius: 3, borderWidth: 2, "&:hover": { borderWidth: 2, borderColor: "white", bgcolor: "rgba(255,255,255,0.08)" } }}
            >
              Modify My Booking
            </Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
