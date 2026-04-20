import React from "react";
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Stack,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  SportsEsports,
  Celebration,
  Groups,
  Rocket,
  CheckCircle,
  Email,
  EventAvailable,
  School,
  Schedule,
  EmojiObjects,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { BRAND } from "../theme";

const MotionBox = motion(Box);

// ----------------------------------------------------------------
// Data
// ----------------------------------------------------------------
const WHY_WORK = [
  {
    icon: <SportsEsports sx={{ fontSize: 32 }} />,
    title: "Cutting-Edge Technology",
    desc: "Work hands-on with VR systems, gaming technology, and professional AV setups.",
    color: BRAND.purple,
  },
  {
    icon: <Celebration sx={{ fontSize: 32 }} />,
    title: "Exciting Events",
    desc: "Be part of immersive experiences, parties, and special events every day.",
    color: BRAND.gold,
  },
  {
    icon: <Groups sx={{ fontSize: 32 }} />,
    title: "Great Team Culture",
    desc: "Friendly, energetic, and collaborative environment where everyone is valued.",
    color: "#10B981",
  },
  {
    icon: <Rocket sx={{ fontSize: 32 }} />,
    title: "Learn & Grow",
    desc: "Build real skills in tech, event management, and customer experience.",
    color: "#EF4444",
  },
];

const JOBS = [
  {
    icon: <EventAvailable sx={{ fontSize: 36 }} />,
    emoji: "🎉",
    title: "Event Manager",
    badge: "Full-time / Part-time",
    badgeColor: BRAND.purple,
    focus: ["Events", "Vendors", "Customer Experience"],
    responsibilities: [
      "Manage event space bookings and schedules",
      "Coordinate vendors, catering, and food facilities",
      "Arrange and oversee AV needs for each event",
      "Ensure smooth event execution and guest satisfaction",
    ],
    idealFor: [
      "Organised, people-focused individuals",
      "Event planning or hospitality experience",
      "Strong customer relationship skills",
    ],
  },
  {
    icon: <SportsEsports sx={{ fontSize: 36 }} />,
    emoji: "🕶️",
    title: "DspireVR Zone Manager",
    badge: "Full-time / Part-time",
    badgeColor: "#7C3AED",
    focus: ["VR", "Gaming Technology", "Customer Support"],
    responsibilities: [
      "Manage and maintain VR systems and gaming equipment",
      "Assist guests with immersive VR experiences",
      "Support VR events and group activities",
      "Learn and work with advanced gaming technologies",
    ],
    idealFor: [
      "VR, gaming, or tech enthusiasts",
      "Strong communication and customer service skills",
      "AV setup or event organising experience (a plus)",
    ],
  },
];

// ----------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------
export default function Hiring() {
  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      {/* ============================================================
          HERO / HEADER
      ============================================================ */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${BRAND.purpleDark} 0%, ${BRAND.purple} 60%, ${BRAND.purpleLight} 100%)`,
          py: { xs: 10, md: 14 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative blobs */}
        <Box sx={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 20% 50%, rgba(245,158,11,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(123,66,209,0.2) 0%, transparent 50%)", pointerEvents: "none" }} />
        {[...Array(8)].map((_, i) => (
          <Box key={i} sx={{ position: "absolute", width: [6, 10, 8][i % 3], height: [6, 10, 8][i % 3], borderRadius: "50%", bgcolor: [BRAND.gold, "rgba(255,255,255,0.5)", "#C084FC"][i % 3], top: `${15 + (i * 10) % 70}%`, left: `${5 + (i * 14) % 90}%`, opacity: 0.5 }} />
        ))}

        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <MotionBox initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <Chip
              label="🚀 We're Hiring!"
              sx={{ mb: 3, bgcolor: `${BRAND.gold}25`, color: BRAND.goldLight, fontWeight: 800, fontSize: "0.9rem", border: `1px solid ${BRAND.gold}`, px: 1 }}
            />
            <Typography
              variant="h1"
              sx={{ color: "white", fontSize: { xs: "2.4rem", sm: "3.2rem", md: "4rem" }, fontWeight: 900, lineHeight: 1.1, mb: 3 }}
            >
              Join the{" "}
              <Box component="span" sx={{ color: BRAND.gold }}>
                DspireZone
              </Box>{" "}
              Team
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 400, lineHeight: 1.7, maxWidth: 580, mx: "auto" }}
            >
              Be part of something exciting — where technology, events, and unforgettable guest experiences come together every day.
            </Typography>
          </MotionBox>
        </Container>
      </Box>

      {/* ============================================================
          STUDENTS & PART-TIME CALLOUT
      ============================================================ */}
      <Box sx={{ py: { xs: 4, md: 5 }, bgcolor: `${BRAND.gold}0E` }}>
        <Container maxWidth="lg">
          <MotionBox initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <Paper
              elevation={0}
              sx={{
                border: `2px solid ${BRAND.gold}`,
                borderRadius: 3,
                p: { xs: 3, md: 4 },
                bgcolor: `${BRAND.gold}08`,
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: { xs: "flex-start", md: "center" },
                gap: 3,
              }}
            >
              <Avatar sx={{ bgcolor: BRAND.gold, width: 60, height: 60, flexShrink: 0 }}>
                <School sx={{ fontSize: 32, color: "white" }} />
              </Avatar>
              <Box flex={1}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                  <Chip label="🎓 Students & Part-Time Friendly" sx={{ bgcolor: BRAND.gold, color: "white", fontWeight: 800, fontSize: "0.85rem" }} />
                </Stack>
                <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
                  Flexible schedules available — great fit for students and early-career professionals.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  We understand that your schedule matters. Our roles are designed to work around your studies or other commitments, giving you hands-on, real-world experience in a vibrant event and technology environment.
                </Typography>
              </Box>
              <Stack spacing={1} sx={{ flexShrink: 0 }}>
                {[
                  { icon: <Schedule sx={{ fontSize: 16 }} />, label: "Flexible Hours" },
                  { icon: <EmojiObjects sx={{ fontSize: 16 }} />, label: "Real-world Experience" },
                ].map((item) => (
                  <Chip
                    key={item.label}
                    icon={item.icon}
                    label={item.label}
                    variant="outlined"
                    size="small"
                    sx={{ color: BRAND.goldDark, borderColor: BRAND.gold, fontWeight: 600 }}
                  />
                ))}
              </Stack>
            </Paper>
          </MotionBox>
        </Container>
      </Box>

      {/* ============================================================
          WHY WORK AT DSPIREZONE
      ============================================================ */}
      <Box sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <MotionBox initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} sx={{ textAlign: "center", mb: 7 }}>
            <Chip label="Culture & Benefits" sx={{ mb: 2, fontWeight: 700, bgcolor: `${BRAND.purple}15`, color: BRAND.purple }} />
            <Typography variant="h2" sx={{ fontWeight: 800, fontSize: { xs: "2rem", md: "2.6rem" }, mb: 2 }}>
              Why Work at DspireZone?
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: "auto", lineHeight: 1.7 }}>
              More than a job — a chance to grow, connect, and make every event extraordinary.
            </Typography>
          </MotionBox>

          <Grid container spacing={3}>
            {WHY_WORK.map((item, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <MotionBox
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                >
                  <Card
                    sx={{
                      height: "100%",
                      textAlign: "center",
                      transition: "all 0.25s",
                      "&:hover": { transform: "translateY(-6px)", boxShadow: 6 },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Avatar
                        sx={{
                          bgcolor: `${item.color}18`,
                          color: item.color,
                          width: 64,
                          height: 64,
                          mx: "auto",
                          mb: 2,
                        }}
                      >
                        {item.icon}
                      </Avatar>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
                        {item.desc}
                      </Typography>
                    </CardContent>
                  </Card>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ============================================================
          OPEN POSITIONS
      ============================================================ */}
      <Box
        sx={{
          py: { xs: 8, md: 12 },
          background: `linear-gradient(180deg, ${BRAND.purpleDark}06 0%, white 100%)`,
        }}
      >
        <Container maxWidth="lg">
          <MotionBox initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} sx={{ textAlign: "center", mb: 7 }}>
            <Chip label="Now Recruiting" sx={{ mb: 2, fontWeight: 700, bgcolor: `${BRAND.gold}22`, color: BRAND.goldDark }} />
            <Typography variant="h2" sx={{ fontWeight: 800, fontSize: { xs: "2rem", md: "2.6rem" }, mb: 2 }}>
              Open Positions
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480, mx: "auto", lineHeight: 1.7 }}>
              Two exciting roles — choose the one that fits your passion and skills.
            </Typography>
          </MotionBox>

          <Grid container spacing={4}>
            {JOBS.map((job, i) => (
              <Grid item xs={12} md={6} key={i}>
                <MotionBox
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.6 }}
                >
                  <Card
                    sx={{
                      height: "100%",
                      border: `1px solid ${job.badgeColor}25`,
                      transition: "all 0.25s",
                      "&:hover": { transform: "translateY(-6px)", boxShadow: 8, border: `1px solid ${job.badgeColor}50` },
                    }}
                  >
                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                      {/* Card header */}
                      <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2.5 }}>
                        <Avatar
                          sx={{
                            bgcolor: `${job.badgeColor}15`,
                            color: job.badgeColor,
                            width: 60,
                            height: 60,
                            fontSize: "1.8rem",
                            flexShrink: 0,
                          }}
                        >
                          {job.emoji}
                        </Avatar>
                        <Box flex={1}>
                          <Typography variant="h5" fontWeight={800} gutterBottom sx={{ lineHeight: 1.2 }}>
                            {job.title}
                          </Typography>
                          <Chip
                            label={job.badge}
                            size="small"
                            sx={{ bgcolor: `${job.badgeColor}15`, color: job.badgeColor, fontWeight: 700, border: `1px solid ${job.badgeColor}35` }}
                          />
                        </Box>
                      </Stack>

                      {/* Focus tags */}
                      <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
                        {job.focus.map((f) => (
                          <Chip
                            key={f}
                            label={f}
                            size="small"
                            variant="outlined"
                            sx={{ color: "text.secondary", fontSize: "0.75rem" }}
                          />
                        ))}
                      </Stack>

                      <Divider sx={{ mb: 2.5 }} />

                      {/* Responsibilities */}
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: BRAND.charcoal, textTransform: "uppercase", letterSpacing: 0.8, fontSize: "0.73rem" }}>
                        Responsibilities
                      </Typography>
                      <List dense disablePadding sx={{ mb: 2.5 }}>
                        {job.responsibilities.map((r, ri) => (
                          <ListItem key={ri} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 28 }}>
                              <CheckCircle sx={{ fontSize: 16, color: "#4ADE80" }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={r}
                              primaryTypographyProps={{ variant: "body2", color: "text.secondary", lineHeight: 1.6 }}
                            />
                          </ListItem>
                        ))}
                      </List>

                      {/* Ideal for */}
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: BRAND.charcoal, textTransform: "uppercase", letterSpacing: 0.8, fontSize: "0.73rem" }}>
                        Ideal For
                      </Typography>
                      <List dense disablePadding>
                        {job.idealFor.map((f, fi) => (
                          <ListItem key={fi} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 28 }}>
                              <CheckCircle sx={{ fontSize: 16, color: job.badgeColor, opacity: 0.8 }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={f}
                              primaryTypographyProps={{ variant: "body2", color: "text.secondary", lineHeight: 1.6 }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ============================================================
          APPLY SECTION
      ============================================================ */}
      <Box
        sx={{
          py: { xs: 8, md: 12 },
          background: `linear-gradient(135deg, ${BRAND.purple} 0%, ${BRAND.purpleLight} 100%)`,
          color: "white",
        }}
      >
        <Container maxWidth="sm">
          <MotionBox
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            sx={{ textAlign: "center" }}
          >
            <Avatar sx={{ bgcolor: "rgba(255,255,255,0.15)", width: 72, height: 72, mx: "auto", mb: 3 }}>
              <Email sx={{ fontSize: 36, color: "white" }} />
            </Avatar>
            <Typography variant="h3" sx={{ color: "white", fontWeight: 800, mb: 2, fontSize: { xs: "1.8rem", md: "2.4rem" } }}>
              Ready to Apply?
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.8)", lineHeight: 1.8, mb: 4 }}>
              Interested candidates can reach out directly. Include a brief introduction and any relevant experience — we'd love to hear from you!
            </Typography>

            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                backdropFilter: "blur(8px)",
                mb: 3,
              }}
            >
              <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", mb: 1, textTransform: "uppercase", letterSpacing: 1 }}>
                How to Apply
              </Typography>
              <Typography sx={{ color: "white", fontWeight: 600, mb: 0.5 }}>
                Send your introduction &amp; experience to:
              </Typography>
              <Box
                component="a"
                href="mailto:admin@dspirezone.com"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  color: BRAND.goldLight,
                  fontWeight: 800,
                  fontSize: "1.1rem",
                  textDecoration: "none",
                  "&:hover": { color: BRAND.gold, textDecoration: "underline" },
                }}
              >
                <Email sx={{ fontSize: 20 }} />
                admin@dspirezone.com
              </Box>
            </Paper>

            <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.85rem" }}>
              We review every application personally and will be in touch soon.
            </Typography>
          </MotionBox>
        </Container>
      </Box>
    </Box>
  );
}
