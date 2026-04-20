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
} from "@mui/material";
import {
  SportsEsports,
  Groups,
  Explore,
  Shield,
  FlashOn,
  Rocket,
  EmojiEvents,
  ChildCare,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { BRAND } from "../theme";

// ----------------------------------------------------------------
// Theme constants
// ----------------------------------------------------------------
const NEON_CYAN = "#00F5FF";
const NEON_PURPLE = "#BF00FF";
const NEON_PINK = "#FF006E";
const DARK_BG = "#05001A";
const DARK_CARD = "rgba(10, 2, 40, 0.85)";

const MotionBox = motion(Box);

// ----------------------------------------------------------------
// Data
// ----------------------------------------------------------------
const HIGHLIGHTS = [
  {
    icon: <Groups sx={{ fontSize: 36 }} />,
    title: "Multiplayer Team Adventures",
    desc: "Battle alongside friends and family in fully tracked, free-roam arenas built for teams.",
    color: NEON_CYAN,
  },
  {
    icon: <Explore sx={{ fontSize: 36 }} />,
    title: "Free-Roam Virtual Worlds",
    desc: "Break free from stationary VR — move, run, and interact in expansive virtual environments.",
    color: NEON_PURPLE,
  },
  {
    icon: <EmojiEvents sx={{ fontSize: 36 }} />,
    title: "Epic Battles & Missions",
    desc: "Take on wave-based combat, puzzle adventures, and high-stakes missions with real-time scoring.",
    color: NEON_PINK,
  },
  {
    icon: <ChildCare sx={{ fontSize: 36 }} />,
    title: "Fun, Safe & Exciting for All Ages",
    desc: "Carefully designed for families, teens, and adults — everyone can step into the arena.",
    color: "#FFDD00",
  },
];

const GAME_TEASERS = [
  {
    icon: "🧟",
    title: "Zombie Survival Arenas",
    desc: "Survive waves of the undead with your squad. Every round harder than the last.",
    tag: "Coming Soon",
  },
  {
    icon: "🚀",
    title: "Sci-Fi Combat Zones",
    desc: "Suit up, lock on targets, and engage in zero-gravity space warfare.",
    tag: "Coming Soon",
  },
  {
    icon: "⚔️",
    title: "Fantasy Quest Adventures",
    desc: "Navigate enchanted realms, slay monsters, and uncover ancient mysteries.",
    tag: "Coming Soon",
  },
  {
    icon: "🏎️",
    title: "High-Speed Racing",
    desc: "Push the limits in adrenaline-fuelled virtual track races across alien worlds.",
    tag: "Coming Soon",
  },
  {
    icon: "🌊",
    title: "Ocean Depth Explorers",
    desc: "Dive into bioluminescent seas, discover hidden civilisations, and evade ocean predators.",
    tag: "Coming Soon",
  },
  {
    icon: "🤖",
    title: "Robot Uprising Clash",
    desc: "Humanity's last line of defence against a rogue AI army — will your team hold the line?",
    tag: "Coming Soon",
  },
];

const HYPE_LINES = [
  { icon: <FlashOn sx={{ fontSize: 32, color: NEON_CYAN }} />, text: "Your Reality Is About to Level Up" },
  { icon: <Rocket sx={{ fontSize: 32, color: NEON_PURPLE }} />, text: "Adventure Is Loading…" },
  { icon: <Shield sx={{ fontSize: 32, color: NEON_PINK }} />, text: "Get Ready to Enter the DspireVR Zone" },
  { icon: <SportsEsports sx={{ fontSize: 32, color: "#FFDD00" }} />, text: "The Future of Play Starts Here" },
];

// ----------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------
function NeonGlow({
  color,
  size = 300,
  opacity = 0.25,
  sx = {},
}: {
  color: string;
  size?: number;
  opacity?: number;
  sx?: object;
}) {
  return (
    <Box
      sx={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity,
        pointerEvents: "none",
        ...sx,
      }}
    />
  );
}

// ----------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------
export default function DspireVRZone() {
  return (
    <Box sx={{ bgcolor: DARK_BG, color: "white", minHeight: "100vh", overflowX: "hidden" }}>
      {/* ============================================================
          HERO SECTION
      ============================================================ */}
      <Box
        sx={{
          position: "relative",
          minHeight: { xs: "92vh", md: "88vh" },
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          background: `linear-gradient(135deg, #05001A 0%, #0D0035 50%, #1A0050 100%)`,
        }}
      >
        {/* Background glow orbs */}
        <NeonGlow color={NEON_CYAN} size={500} opacity={0.12} sx={{ top: "-100px", left: "-150px" }} />
        <NeonGlow color={NEON_PURPLE} size={600} opacity={0.15} sx={{ top: "20%", right: "-200px" }} />
        <NeonGlow color={NEON_PINK} size={400} opacity={0.1} sx={{ bottom: "5%", left: "30%" }} />

        {/* Animated scan-line grid */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(0,245,255,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,245,255,0.04) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            pointerEvents: "none",
          }}
        />

        {/* Floating particles */}
        {[...Array(16)].map((_, i) => (
          <Box
            key={i}
            component={motion.div}
            animate={{ y: [0, -20, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.3 }}
            sx={{
              position: "absolute",
              width: [4, 6, 3, 8][i % 4],
              height: [4, 6, 3, 8][i % 4],
              borderRadius: "50%",
              bgcolor: [NEON_CYAN, NEON_PURPLE, NEON_PINK, "#FFDD00"][i % 4],
              top: `${8 + (i * 6) % 82}%`,
              left: `${3 + (i * 11) % 94}%`,
              filter: "blur(0.5px)",
            }}
          />
        ))}

        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={8}>
              <MotionBox
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                {/* Coming Soon badge */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
                  <Chip
                    label="⚡ COMING SOON"
                    sx={{
                      bgcolor: NEON_PINK,
                      color: "white",
                      fontWeight: 800,
                      fontSize: "0.85rem",
                      letterSpacing: 2,
                      px: 1,
                      animation: "pulse 2s infinite",
                      "@keyframes pulse": {
                        "0%, 100%": { boxShadow: `0 0 8px ${NEON_PINK}` },
                        "50%": { boxShadow: `0 0 24px ${NEON_PINK}, 0 0 48px ${NEON_PINK}60` },
                      },
                    }}
                  />
                  <Chip
                    label="🎮 Free-Roam VR Arena"
                    sx={{
                      bgcolor: "rgba(0,245,255,0.15)",
                      color: NEON_CYAN,
                      fontWeight: 700,
                      border: `1px solid ${NEON_CYAN}50`,
                      letterSpacing: 1,
                    }}
                  />
                </Box>

                {/* Main Title */}
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: "2.8rem", sm: "3.8rem", md: "5.2rem" },
                    fontWeight: 900,
                    lineHeight: 1.05,
                    mb: 3,
                    letterSpacing: "-0.02em",
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      background: `linear-gradient(90deg, ${NEON_CYAN} 0%, ${NEON_PURPLE} 50%, ${NEON_PINK} 100%)`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      filter: `drop-shadow(0 0 20px ${NEON_CYAN}60)`,
                    }}
                  >
                    DspireVR
                  </Box>
                  <br />
                  <Box component="span" sx={{ color: "white" }}>
                    Zone
                  </Box>
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    color: "rgba(255,255,255,0.72)",
                    fontWeight: 400,
                    mb: 4,
                    lineHeight: 1.6,
                    maxWidth: 580,
                  }}
                >
                  Step into the future of immersive entertainment.
                </Typography>

                <Typography
                  variant="body1"
                  sx={{
                    color: "rgba(255,255,255,0.6)",
                    lineHeight: 1.8,
                    maxWidth: 580,
                    mb: 5,
                    fontSize: "1.05rem",
                  }}
                >
                  The DspireVR Zone is coming soon — a high-energy virtual reality arena where
                  friends, families, and gamers of all ages can battle, explore, and experience
                  worlds beyond imagination.
                </Typography>

                {/* Stat pills */}
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  {[
                    { val: "Free-Roam", lbl: "Movement" },
                    { val: "All Ages", lbl: "Inclusive" },
                    { val: "Multiplayer", lbl: "Team Play" },
                  ].map((s) => (
                    <Box
                      key={s.val}
                      sx={{
                        px: 3,
                        py: 1.5,
                        borderRadius: 3,
                        border: `1px solid ${NEON_CYAN}40`,
                        bgcolor: "rgba(0,245,255,0.06)",
                        textAlign: "center",
                      }}
                    >
                      <Typography sx={{ fontWeight: 800, color: NEON_CYAN, fontSize: "1.1rem" }}>
                        {s.val}
                      </Typography>
                      <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
                        {s.lbl}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </MotionBox>
            </Grid>

            {/* Hero side panel */}
            <Grid item xs={12} md={4}>
              <MotionBox
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, delay: 0.3 }}
                sx={{ display: "flex", justifyContent: "center" }}
              >
                <Box
                  sx={{
                    width: { xs: 240, md: 300 },
                    height: { xs: 240, md: 300 },
                    borderRadius: "50%",
                    border: `3px solid ${NEON_CYAN}50`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    animation: "spin-slow 12s linear infinite",
                    "@keyframes spin-slow": {
                      from: { transform: "rotate(0deg)" },
                      to: { transform: "rotate(360deg)" },
                    },
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      inset: 12,
                      borderRadius: "50%",
                      border: `2px dashed ${NEON_PURPLE}40`,
                    },
                    boxShadow: `0 0 60px ${NEON_CYAN}30, 0 0 120px ${NEON_PURPLE}20`,
                  }}
                >
                  <Box
                    sx={{
                      animation: "spin-reverse 12s linear infinite",
                      "@keyframes spin-reverse": {
                        from: { transform: "rotate(0deg)" },
                        to: { transform: "rotate(-360deg)" },
                      },
                    }}
                  >
                    <SportsEsports
                      sx={{
                        fontSize: { xs: 90, md: 120 },
                        color: NEON_CYAN,
                        filter: `drop-shadow(0 0 20px ${NEON_CYAN})`,
                      }}
                    />
                  </Box>
                </Box>
              </MotionBox>
            </Grid>
          </Grid>
        </Container>

        {/* Bottom fade */}
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            background: `linear-gradient(transparent, ${DARK_BG})`,
            pointerEvents: "none",
          }}
        />
      </Box>

      {/* ============================================================
          EXPERIENCE HIGHLIGHTS
      ============================================================ */}
      <Box
        sx={{
          py: { xs: 8, md: 12 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        <NeonGlow color={NEON_PURPLE} size={400} opacity={0.1} sx={{ top: "20%", right: "-100px" }} />

        <Container maxWidth="lg">
          <MotionBox
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            sx={{ textAlign: "center", mb: 8 }}
          >
            <Chip
              label="EXPERIENCE HIGHLIGHTS"
              sx={{
                mb: 2,
                bgcolor: "rgba(191,0,255,0.15)",
                color: NEON_PURPLE,
                fontWeight: 800,
                letterSpacing: 2,
                border: `1px solid ${NEON_PURPLE}40`,
              }}
            />
            <Typography
              variant="h2"
              sx={{ color: "white", fontWeight: 800, fontSize: { xs: "2rem", md: "2.8rem" } }}
            >
              What Awaits You Inside
            </Typography>
            <Typography
              sx={{ color: "rgba(255,255,255,0.55)", mt: 2, maxWidth: 500, mx: "auto", lineHeight: 1.7 }}
            >
              An entirely new class of entertainment — built for everyone, powered by the latest VR technology.
            </Typography>
          </MotionBox>

          <Grid container spacing={3}>
            {HIGHLIGHTS.map((h, i) => (
              <Grid item xs={12} sm={6} key={i}>
                <MotionBox
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                >
                  <Card
                    sx={{
                      height: "100%",
                      bgcolor: DARK_CARD,
                      border: `1px solid ${h.color}30`,
                      borderRadius: 3,
                      backdropFilter: "blur(12px)",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-6px)",
                        border: `1px solid ${h.color}80`,
                        boxShadow: `0 8px 40px ${h.color}25`,
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Avatar
                        sx={{
                          bgcolor: `${h.color}15`,
                          color: h.color,
                          width: 56,
                          height: 56,
                          mb: 2,
                          border: `1px solid ${h.color}40`,
                          filter: `drop-shadow(0 0 8px ${h.color}50)`,
                        }}
                      >
                        {h.icon}
                      </Avatar>
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        sx={{ color: "white", mb: 1 }}
                      >
                        {h.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}
                      >
                        {h.desc}
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
          VR ENVIRONMENT GALLERY
      ============================================================ */}
      <Box
        sx={{
          py: { xs: 8, md: 12 },
          position: "relative",
          overflow: "hidden",
          background: `linear-gradient(180deg, ${DARK_BG} 0%, #080020 100%)`,
        }}
      >
        <NeonGlow color={NEON_CYAN} size={350} opacity={0.08} sx={{ top: "10%", left: "-80px" }} />
        <NeonGlow color={NEON_PINK} size={300} opacity={0.07} sx={{ bottom: "10%", right: "-60px" }} />

        <Container maxWidth="lg">
          <MotionBox
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            sx={{ textAlign: "center", mb: 8 }}
          >
            <Chip
              label="VR WORLDS GALLERY"
              sx={{
                mb: 2,
                bgcolor: "rgba(0,245,255,0.12)",
                color: NEON_CYAN,
                fontWeight: 800,
                letterSpacing: 2,
                border: `1px solid ${NEON_CYAN}40`,
              }}
            />
            <Typography
              variant="h2"
              sx={{ color: "white", fontWeight: 800, fontSize: { xs: "2rem", md: "2.8rem" } }}
            >
              Virtual Worlds Await
            </Typography>
            <Typography
              sx={{ color: "rgba(255,255,255,0.55)", mt: 2, maxWidth: 520, mx: "auto", lineHeight: 1.7 }}
            >
              A glimpse into the immersive arenas we're building — each one a world of its own.
            </Typography>
          </MotionBox>

          {/* Row 1 — feature cards (tall) */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {/* Zombie Arena */}
            <Grid item xs={12} md={4}>
              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 }}
              >
                <Box
                  sx={{
                    height: { xs: 220, md: 340 },
                    borderRadius: 3,
                    overflow: "hidden",
                    position: "relative",
                    background: "linear-gradient(160deg, #0a1a00 0%, #1a3300 40%, #0d2200 100%)",
                    border: "1px solid rgba(100,255,50,0.18)",
                    transition: "transform 0.3s, box-shadow 0.3s",
                    "&:hover": { transform: "scale(1.02)", boxShadow: "0 12px 48px rgba(100,255,50,0.2)" },
                    cursor: "default",
                  }}
                >
                  {/* Fog effect */}
                  <Box sx={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 80%, rgba(100,255,50,0.08) 0%, transparent 70%)" }} />
                  {/* Grid lines */}
                  <Box sx={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(100,255,50,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(100,255,50,0.05) 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
                  {/* Moon */}
                  <Box sx={{ position: "absolute", top: 20, right: 24, width: 48, height: 48, borderRadius: "50%", bgcolor: "#c8ff88", boxShadow: "0 0 30px #8dff30", opacity: 0.85 }} />
                  {/* Silhouette buildings */}
                  <Box sx={{ position: "absolute", bottom: 60, left: 0, right: 0, height: 80, display: "flex", gap: "3px", alignItems: "flex-end", px: 2 }}>
                    {[40, 70, 55, 90, 45, 75, 60, 50, 85, 40, 65, 50].map((h, i) => (
                      <Box key={i} sx={{ flex: 1, height: h, bgcolor: "#060f00", borderRadius: "2px 2px 0 0" }} />
                    ))}
                  </Box>
                  {/* Warning stripes at bottom */}
                  <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 48, background: "repeating-linear-gradient(45deg, rgba(255,60,0,0.25) 0px, rgba(255,60,0,0.25) 6px, transparent 6px, transparent 12px)" }} />
                  {/* Overlay content */}
                  <Box sx={{ position: "absolute", top: 16, left: 16 }}>
                    <Chip label="SURVIVAL" size="small" sx={{ bgcolor: "rgba(255,60,0,0.8)", color: "white", fontWeight: 800, fontSize: "0.65rem", letterSpacing: 2 }} />
                  </Box>
                  <Box sx={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
                    <Typography sx={{ color: "#a8ff60", fontWeight: 800, fontSize: "1.1rem", textShadow: "0 0 12px #64ff32" }}>☣ Zombie Survival Arena</Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.78rem", mt: 0.5 }}>2–8 Players · Outdoor night map</Typography>
                  </Box>
                </Box>
              </MotionBox>
            </Grid>

            {/* Sci-Fi Combat */}
            <Grid item xs={12} md={4}>
              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                <Box
                  sx={{
                    height: { xs: 220, md: 340 },
                    borderRadius: 3,
                    overflow: "hidden",
                    position: "relative",
                    background: "linear-gradient(160deg, #000a1a 0%, #001433 50%, #00091a 100%)",
                    border: `1px solid ${NEON_CYAN}30`,
                    transition: "transform 0.3s, box-shadow 0.3s",
                    "&:hover": { transform: "scale(1.02)", boxShadow: `0 12px 48px ${NEON_CYAN}25` },
                    cursor: "default",
                  }}
                >
                  <Box sx={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 30%, ${NEON_CYAN}12 0%, transparent 65%)` }} />
                  {/* Stars */}
                  {[...Array(30)].map((_, i) => (
                    <Box key={i} sx={{ position: "absolute", width: [2, 1, 3][i % 3], height: [2, 1, 3][i % 3], borderRadius: "50%", bgcolor: "white", top: `${(i * 23) % 70}%`, left: `${(i * 17) % 95}%`, opacity: 0.5 + (i % 5) * 0.1 }} />
                  ))}
                  {/* Planet */}
                  <Box sx={{ position: "absolute", top: -30, right: -30, width: 130, height: 130, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, #004488, #001133)`, boxShadow: `0 0 40px ${NEON_CYAN}40`, opacity: 0.9 }} />
                  {/* Ring */}
                  <Box sx={{ position: "absolute", top: 18, right: -60, width: 250, height: 60, border: `2px solid ${NEON_CYAN}30`, borderRadius: "50%", transform: "rotate(-20deg)" }} />
                  {/* HUD elements */}
                  <Box sx={{ position: "absolute", top: 16, left: 16, display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Box sx={{ width: 60, height: 4, bgcolor: NEON_CYAN, borderRadius: 2, opacity: 0.7 }} />
                    <Box sx={{ width: 40, height: 4, bgcolor: NEON_CYAN, borderRadius: 2, opacity: 0.4 }} />
                    <Box sx={{ width: 50, height: 4, bgcolor: NEON_CYAN, borderRadius: 2, opacity: 0.5 }} />
                  </Box>
                  <Box sx={{ position: "absolute", top: 16, right: 16 }}>
                    <Chip label="COMBAT" size="small" sx={{ bgcolor: `${NEON_CYAN}22`, color: NEON_CYAN, fontWeight: 800, fontSize: "0.65rem", letterSpacing: 2, border: `1px solid ${NEON_CYAN}50` }} />
                  </Box>
                  <Box sx={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
                    <Typography sx={{ color: NEON_CYAN, fontWeight: 800, fontSize: "1.1rem", textShadow: `0 0 12px ${NEON_CYAN}` }}>🚀 Sci-Fi Combat Zone</Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.78rem", mt: 0.5 }}>2–6 Players · Zero-gravity arena</Typography>
                  </Box>
                </Box>
              </MotionBox>
            </Grid>

            {/* Fantasy Quest */}
            <Grid item xs={12} md={4}>
              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
              >
                <Box
                  sx={{
                    height: { xs: 220, md: 340 },
                    borderRadius: 3,
                    overflow: "hidden",
                    position: "relative",
                    background: "linear-gradient(160deg, #1a0a00 0%, #2d1500 50%, #1a0800 100%)",
                    border: "1px solid rgba(255,180,0,0.2)",
                    transition: "transform 0.3s, box-shadow 0.3s",
                    "&:hover": { transform: "scale(1.02)", boxShadow: "0 12px 48px rgba(255,160,0,0.2)" },
                    cursor: "default",
                  }}
                >
                  <Box sx={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 20%, rgba(255,160,0,0.12) 0%, transparent 60%)" }} />
                  {/* Mystical orb */}
                  <Box sx={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", width: 70, height: 70, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #ffdd44, #ff8800)", boxShadow: "0 0 40px #ffaa00, 0 0 80px rgba(255,170,0,0.3)", opacity: 0.9 }} />
                  {/* Magic rays */}
                  {[...Array(8)].map((_, i) => (
                    <Box key={i} sx={{ position: "absolute", top: 51, left: "calc(50% - 1px)", width: 2, height: 40 + (i % 3) * 20, bgcolor: "rgba(255,200,0,0.3)", transformOrigin: "top center", transform: `rotate(${i * 45}deg)` }} />
                  ))}
                  {/* Mountain silhouettes */}
                  <Box sx={{ position: "absolute", bottom: 48, left: 0, right: 0, height: 100 }}>
                    <svg viewBox="0 0 400 100" width="100%" height="100%" preserveAspectRatio="none">
                      <polygon points="0,100 60,20 120,60 180,10 240,55 300,15 360,50 400,100" fill="#0d0500" />
                    </svg>
                  </Box>
                  {/* Fire glow at base */}
                  <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 48, background: "linear-gradient(transparent, rgba(255,100,0,0.15))" }} />
                  <Box sx={{ position: "absolute", top: 16, right: 16 }}>
                    <Chip label="QUEST" size="small" sx={{ bgcolor: "rgba(255,160,0,0.2)", color: "#ffcc44", fontWeight: 800, fontSize: "0.65rem", letterSpacing: 2, border: "1px solid rgba(255,180,0,0.4)" }} />
                  </Box>
                  <Box sx={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
                    <Typography sx={{ color: "#ffcc44", fontWeight: 800, fontSize: "1.1rem", textShadow: "0 0 12px #ff8800" }}>⚔️ Fantasy Quest Adventure</Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.78rem", mt: 0.5 }}>1–4 Players · Enchanted realm</Typography>
                  </Box>
                </Box>
              </MotionBox>
            </Grid>
          </Grid>

          {/* Row 2 — wider landscape cards */}
          <Grid container spacing={2}>
            {/* Ocean Depths */}
            <Grid item xs={12} sm={6}>
              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                <Box
                  sx={{
                    height: { xs: 180, md: 220 },
                    borderRadius: 3,
                    overflow: "hidden",
                    position: "relative",
                    background: "linear-gradient(180deg, #000d1a 0%, #001a33 40%, #003355 100%)",
                    border: "1px solid rgba(0,150,255,0.2)",
                    transition: "transform 0.3s, box-shadow 0.3s",
                    "&:hover": { transform: "scale(1.02)", boxShadow: "0 12px 40px rgba(0,150,255,0.2)" },
                    cursor: "default",
                  }}
                >
                  <Box sx={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 70% 40%, rgba(0,200,255,0.08) 0%, transparent 60%)" }} />
                  {/* Bubble particles */}
                  {[...Array(12)].map((_, i) => (
                    <Box key={i} sx={{ position: "absolute", width: [4, 6, 3, 8][i % 4], height: [4, 6, 3, 8][i % 4], borderRadius: "50%", border: "1px solid rgba(100,200,255,0.5)", top: `${20 + (i * 7) % 65}%`, left: `${5 + (i * 11) % 88}%`, opacity: 0.4 }} />
                  ))}
                  {/* Bioluminescent creature shape */}
                  <Box sx={{ position: "absolute", right: 30, top: "50%", transform: "translateY(-50%)", width: 80, height: 50, borderRadius: "40% 60% 50% 50%", background: "radial-gradient(circle at 40% 40%, rgba(0,255,255,0.3), transparent 70%)", border: "1px solid rgba(0,255,255,0.3)", boxShadow: "0 0 20px rgba(0,255,255,0.2)" }} />
                  {/* Light rays from surface */}
                  <Box sx={{ position: "absolute", top: 0, left: "30%", width: 2, height: "60%", background: "linear-gradient(rgba(0,200,255,0.3), transparent)", transform: "rotate(5deg)" }} />
                  <Box sx={{ position: "absolute", top: 0, left: "50%", width: 1, height: "50%", background: "linear-gradient(rgba(0,200,255,0.2), transparent)", transform: "rotate(-3deg)" }} />
                  <Box sx={{ position: "absolute", top: 0, right: "30%", width: 2, height: "45%", background: "linear-gradient(rgba(0,200,255,0.25), transparent)", transform: "rotate(8deg)" }} />
                  <Box sx={{ position: "absolute", top: 16, right: 16 }}>
                    <Chip label="EXPLORE" size="small" sx={{ bgcolor: "rgba(0,200,255,0.15)", color: "#44ccff", fontWeight: 800, fontSize: "0.65rem", letterSpacing: 2, border: "1px solid rgba(0,200,255,0.35)" }} />
                  </Box>
                  <Box sx={{ position: "absolute", bottom: 14, left: 16, right: 16 }}>
                    <Typography sx={{ color: "#44ccff", fontWeight: 800, fontSize: "1rem", textShadow: "0 0 10px rgba(0,200,255,0.8)" }}>🌊 Ocean Depth Explorers</Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.75rem", mt: 0.5 }}>1–4 Players · Bioluminescent seas</Typography>
                  </Box>
                </Box>
              </MotionBox>
            </Grid>

            {/* Robot Uprising */}
            <Grid item xs={12} sm={6}>
              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
              >
                <Box
                  sx={{
                    height: { xs: 180, md: 220 },
                    borderRadius: 3,
                    overflow: "hidden",
                    position: "relative",
                    background: "linear-gradient(160deg, #1a0000 0%, #330011 50%, #1a0008 100%)",
                    border: `1px solid ${NEON_PINK}25`,
                    transition: "transform 0.3s, box-shadow 0.3s",
                    "&:hover": { transform: "scale(1.02)", boxShadow: `0 12px 40px ${NEON_PINK}20` },
                    cursor: "default",
                  }}
                >
                  <Box sx={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 30% 50%, ${NEON_PINK}10 0%, transparent 60%)` }} />
                  {/* Circuit pattern */}
                  <Box sx={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${NEON_PINK}06 1px, transparent 1px), linear-gradient(90deg, ${NEON_PINK}06 1px, transparent 1px)`, backgroundSize: "20px 20px" }} />
                  {/* Robot eye glow */}
                  <Box sx={{ position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box sx={{ width: 20, height: 12, bgcolor: NEON_PINK, borderRadius: 1, boxShadow: `0 0 16px ${NEON_PINK}`, opacity: 0.9 }} />
                    <Box sx={{ width: 20, height: 12, bgcolor: NEON_PINK, borderRadius: 1, boxShadow: `0 0 16px ${NEON_PINK}`, opacity: 0.9 }} />
                  </Box>
                  {/* Energy bar */}
                  <Box sx={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 1 }}>
                    {[85, 60, 45, 70, 30].map((w, i) => (
                      <Box key={i} sx={{ width: 4, height: `${w}%`, maxHeight: 30, minHeight: 8, bgcolor: NEON_PINK, borderRadius: 2, opacity: 0.3 + i * 0.1 }} />
                    ))}
                  </Box>
                  <Box sx={{ position: "absolute", top: 16, right: 16 }}>
                    <Chip label="BATTLE" size="small" sx={{ bgcolor: `${NEON_PINK}20`, color: NEON_PINK, fontWeight: 800, fontSize: "0.65rem", letterSpacing: 2, border: `1px solid ${NEON_PINK}40` }} />
                  </Box>
                  <Box sx={{ position: "absolute", bottom: 14, left: 16, right: 16 }}>
                    <Typography sx={{ color: NEON_PINK, fontWeight: 800, fontSize: "1rem", textShadow: `0 0 10px ${NEON_PINK}` }}>🤖 Robot Uprising Clash</Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.75rem", mt: 0.5 }}>2–8 Players · Industrial war zone</Typography>
                  </Box>
                </Box>
              </MotionBox>
            </Grid>
          </Grid>

          {/* Row 3 — wide race card */}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                <Box
                  sx={{
                    height: { xs: 160, md: 200 },
                    borderRadius: 3,
                    overflow: "hidden",
                    position: "relative",
                    background: "linear-gradient(135deg, #0f0f00 0%, #1a1400 40%, #0a0800 100%)",
                    border: "1px solid rgba(255,220,0,0.2)",
                    transition: "transform 0.3s, box-shadow 0.3s",
                    "&:hover": { transform: "scale(1.01)", boxShadow: "0 10px 40px rgba(255,200,0,0.2)" },
                    cursor: "default",
                  }}
                >
                  {/* Speed lines */}
                  {[...Array(14)].map((_, i) => (
                    <Box key={i} sx={{ position: "absolute", height: 1, width: `${20 + (i % 5) * 12}%`, bgcolor: `rgba(255,${180 + i * 5},0,0.25)`, top: `${(i * 7) % 95}%`, left: `${(i * 11) % 60}%`, transform: "skewX(-20deg)" }} />
                  ))}
                  {/* Track surface */}
                  <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(transparent, rgba(80,60,0,0.4))" }} />
                  <Box sx={{ position: "absolute", bottom: 0, left: "10%", right: "10%", height: 3, background: "repeating-linear-gradient(90deg, rgba(255,220,0,0.6) 0px, rgba(255,220,0,0.6) 20px, transparent 20px, transparent 40px)" }} />
                  {/* Speedometer arc */}
                  <Box sx={{ position: "absolute", right: 30, top: "50%", transform: "translateY(-50%)", width: 80, height: 80, borderRadius: "50%", border: "3px solid rgba(255,200,0,0.3)", borderTopColor: "#ffcc00", boxShadow: "0 0 20px rgba(255,200,0,0.2)" }} />
                  <Box sx={{ position: "absolute", top: 16, right: 16 }}>
                    <Chip label="RACING" size="small" sx={{ bgcolor: "rgba(255,200,0,0.15)", color: "#ffcc00", fontWeight: 800, fontSize: "0.65rem", letterSpacing: 2, border: "1px solid rgba(255,200,0,0.3)" }} />
                  </Box>
                  <Box sx={{ position: "absolute", bottom: 18, left: 16, right: 120 }}>
                    <Typography sx={{ color: "#ffcc00", fontWeight: 800, fontSize: "1.1rem", textShadow: "0 0 12px rgba(255,180,0,0.8)" }}>🏎️ High-Speed Racing Worlds</Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.75rem", mt: 0.5 }}>Solo or multiplayer · Alien race circuits across 5 planets</Typography>
                  </Box>
                </Box>
              </MotionBox>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ============================================================
          GAME TEASERS
      ============================================================ */}
      <Box
        sx={{
          py: { xs: 8, md: 12 },
          position: "relative",
          background: `linear-gradient(180deg, ${DARK_BG} 0%, #0A0030 50%, ${DARK_BG} 100%)`,
          overflow: "hidden",
        }}
      >
        <NeonGlow color={NEON_CYAN} size={500} opacity={0.08} sx={{ bottom: "10%", left: "-150px" }} />
        <NeonGlow color={NEON_PINK} size={400} opacity={0.08} sx={{ top: "15%", right: "-100px" }} />

        <Container maxWidth="lg">
          <MotionBox
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            sx={{ textAlign: "center", mb: 8 }}
          >
            <Chip
              label="GAME & EXPERIENCE TEASERS"
              sx={{
                mb: 2,
                bgcolor: "rgba(0,245,255,0.12)",
                color: NEON_CYAN,
                fontWeight: 800,
                letterSpacing: 2,
                border: `1px solid ${NEON_CYAN}40`,
              }}
            />
            <Typography
              variant="h2"
              sx={{ color: "white", fontWeight: 800, fontSize: { xs: "2rem", md: "2.8rem" } }}
            >
              Sneak Peek: Upcoming Worlds
            </Typography>
            <Typography
              sx={{ color: "rgba(255,255,255,0.55)", mt: 2, maxWidth: 520, mx: "auto", lineHeight: 1.7 }}
            >
              These are just a taste of the adventures being crafted for your first visit.
            </Typography>
          </MotionBox>

          <Grid container spacing={3}>
            {GAME_TEASERS.map((g, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <MotionBox
                  initial={{ opacity: 0, scale: 0.92 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                >
                  <Card
                    sx={{
                      height: "100%",
                      bgcolor: "rgba(5,1,30,0.9)",
                      border: `1px solid rgba(0,245,255,0.12)`,
                      borderRadius: 3,
                      position: "relative",
                      overflow: "visible",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-6px)",
                        border: `1px solid ${NEON_CYAN}40`,
                        boxShadow: `0 8px 40px rgba(0,245,255,0.12)`,
                      },
                    }}
                  >
                    {/* Coming Soon ribbon */}
                    <Chip
                      label={g.tag}
                      size="small"
                      sx={{
                        position: "absolute",
                        top: -10,
                        right: 16,
                        bgcolor: NEON_PINK,
                        color: "white",
                        fontWeight: 700,
                        fontSize: "0.7rem",
                        letterSpacing: 1,
                        boxShadow: `0 0 12px ${NEON_PINK}60`,
                      }}
                    />
                    <CardContent sx={{ p: 3, pt: 4 }}>
                      <Typography sx={{ fontSize: "2.5rem", mb: 1.5 }}>{g.icon}</Typography>
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        sx={{ color: "white", mb: 1 }}
                      >
                        {g.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}
                      >
                        {g.desc}
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
          HYPE / ANTICIPATION SECTION
      ============================================================ */}
      <Box
        sx={{
          py: { xs: 10, md: 14 },
          position: "relative",
          overflow: "hidden",
          background: `linear-gradient(135deg, #0D0035 0%, #200060 50%, #0D0035 100%)`,
        }}
      >
        {/* Big glowing title watermark */}
        <Typography
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: { xs: "6rem", md: "12rem" },
            fontWeight: 900,
            color: "rgba(0,245,255,0.04)",
            whiteSpace: "nowrap",
            letterSpacing: "-0.05em",
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          VR ZONE
        </Typography>

        <NeonGlow color={NEON_PURPLE} size={600} opacity={0.15} sx={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />

        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <MotionBox
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            sx={{ textAlign: "center", mb: 8 }}
          >
            <Chip
              label="GET READY"
              sx={{
                mb: 3,
                bgcolor: "rgba(255,0,110,0.15)",
                color: NEON_PINK,
                fontWeight: 800,
                letterSpacing: 3,
                border: `1px solid ${NEON_PINK}50`,
              }}
            />
            <Typography
              variant="h2"
              sx={{
                color: "white",
                fontWeight: 900,
                fontSize: { xs: "2.2rem", md: "3.4rem" },
                mb: 3,
                lineHeight: 1.15,
              }}
            >
              The DspireVR Zone is{" "}
              <Box
                component="span"
                sx={{
                  background: `linear-gradient(90deg, ${NEON_CYAN}, ${NEON_PURPLE})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                loading up
              </Box>
            </Typography>
            <Typography
              sx={{ color: "rgba(255,255,255,0.6)", fontSize: "1.1rem", lineHeight: 1.8 }}
            >
              We're building something extraordinary right here at DspireZone.
              Stay tuned — the launch of Perungalathur's most thrilling VR experience is
              just around the corner.
            </Typography>
          </MotionBox>

          <Grid container spacing={3}>
            {HYPE_LINES.map((line, i) => (
              <Grid item xs={12} sm={6} key={i}>
                <MotionBox
                  initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      p: 2.5,
                      borderRadius: 3,
                      bgcolor: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      transition: "all 0.3s",
                      "&:hover": {
                        bgcolor: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        transform: "translateX(6px)",
                      },
                    }}
                  >
                    {line.icon}
                    <Typography sx={{ color: "white", fontWeight: 700, fontSize: "1rem" }}>
                      {line.text}
                    </Typography>
                  </Box>
                </MotionBox>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ my: 6, borderColor: "rgba(255,255,255,0.08)" }} />

          {/* Bottom CTA teaser */}
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            sx={{ textAlign: "center" }}
          >
            <Typography
              sx={{
                color: "rgba(255,255,255,0.45)",
                fontSize: "0.9rem",
                letterSpacing: 1,
                textTransform: "uppercase",
                mb: 2,
              }}
            >
              While you wait — celebrate with us today
            </Typography>
            <Box
              component="a"
              href="/"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1.5,
                px: 4,
                py: 1.8,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${BRAND.purple} 0%, ${BRAND.purpleLight} 100%)`,
                color: "white",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: "1rem",
                transition: "all 0.3s",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: `0 8px 30px ${BRAND.purple}60`,
                },
              }}
            >
              <SportsEsports sx={{ fontSize: 20 }} />
              Book a Party at DspireZone
            </Box>
          </MotionBox>
        </Container>
      </Box>
    </Box>
  );
}
