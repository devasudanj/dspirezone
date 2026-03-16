import React, { useState } from "react";
import {
  Box, Container, Typography, Grid, Dialog, DialogContent,
  IconButton, Chip,
} from "@mui/material";
import { Close, ZoomIn } from "@mui/icons-material";
import { motion } from "framer-motion";
import { BRAND } from "../theme";

import g01 from "../assets/media/gallery-01-birthday.svg";
import g02 from "../assets/media/gallery-02-lights.svg";
import g03 from "../assets/media/gallery-03-food.svg";
import g04 from "../assets/media/gallery-04-magic.svg";
import g05 from "../assets/media/gallery-05-decor.svg";
import g06 from "../assets/media/gallery-06-venue.svg";
import g07 from "../assets/media/gallery-07-photography.svg";
import g08 from "../assets/media/gallery-08-favors.svg";

const GALLERY = [
  { src: g01, title: "Birthday Setup", tag: "Birthday" },
  { src: g02, title: "Fairy Light Ambiance", tag: "Ambiance" },
  { src: g03, title: "Food Court", tag: "Food" },
  { src: g04, title: "Magic Show", tag: "Entertainment" },
  { src: g05, title: "Decoration Package", tag: "Decor" },
  { src: g06, title: "Main Venue Hall", tag: "Venue" },
  { src: g07, title: "Photography Add-on", tag: "Services" },
  { src: g08, title: "Party Favors", tag: "Essentials" },
];

const ALL_TAGS = ["All", ...Array.from(new Set(GALLERY.map((g) => g.tag)))];

const MotionBox = motion(Box);

export default function Gallery() {
  const [activeTag, setActiveTag] = useState("All");
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null);

  const filtered = activeTag === "All" ? GALLERY : GALLERY.filter((g) => g.tag === activeTag);

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
            Gallery
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: 18 }}>
            A glimpse into the celebrations we've helped create
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        {/* Filters */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 4, justifyContent: "center" }}>
          {ALL_TAGS.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              clickable
              color={activeTag === tag ? "primary" : "default"}
              variant={activeTag === tag ? "filled" : "outlined"}
              onClick={() => setActiveTag(tag)}
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Box>

        {/* Grid */}
        <Grid container spacing={2}>
          {filtered.map((item, i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item.src}>
              <MotionBox
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.02 }}
                sx={{ position: "relative", cursor: "pointer" }}
                onClick={() => setLightbox({ src: item.src, title: item.title })}
              >
                <Box
                  component="img"
                  src={item.src}
                  alt={item.title}
                  sx={{
                    width: "100%",
                    height: { xs: 160, sm: 200, md: 220 },
                    objectFit: "cover",
                    borderRadius: 2,
                    display: "block",
                  }}
                />
                {/* Overlay */}
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 2,
                    background: "rgba(0,0,0,0)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    p: 1.5,
                    transition: "background 0.2s",
                    "&:hover": { background: "rgba(0,0,0,0.45)" },
                    "&:hover .gallery-label": { opacity: 1 },
                  }}
                >
                  <Box className="gallery-label" sx={{ opacity: 0, transition: "opacity 0.2s" }}>
                    <Typography variant="body2" fontWeight={700} sx={{ color: "white" }}>
                      {item.title}
                    </Typography>
                    <Chip label={item.tag} size="small" sx={{ bgcolor: BRAND.gold, color: "white", fontWeight: 700 }} />
                  </Box>
                </Box>
              </MotionBox>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Lightbox */}
      <Dialog
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: "black", p: 0 } }}
      >
        <Box sx={{ position: "relative" }}>
          <IconButton
            onClick={() => setLightbox(null)}
            sx={{ position: "absolute", top: 8, right: 8, color: "white", zIndex: 1, bgcolor: "rgba(0,0,0,0.5)" }}
          >
            <Close />
          </IconButton>
          {lightbox && (
            <>
              <Box
                component="img"
                src={lightbox.src}
                alt={lightbox.title}
                sx={{ width: "100%", maxHeight: "80vh", objectFit: "contain" }}
              />
              <Box sx={{ p: 2, textAlign: "center" }}>
                <Typography sx={{ color: "white", fontWeight: 700 }}>{lightbox.title}</Typography>
              </Box>
            </>
          )}
        </Box>
      </Dialog>
    </Box>
  );
}
