import React, { useEffect, useState } from "react";
import {
  Box, Container, Typography, Grid, Card, CardContent,
  Avatar, Chip, CircularProgress, Stack,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { motion } from "framer-motion";
import { BRAND } from "../theme";
import api from "../api/client";
import type { CatalogItem } from "../types";
import { AutoFixHigh, CameraAlt, CelebrationOutlined, FoodBank, MusicNote, PartyMode, TableBar, CardGiftcard } from "@mui/icons-material";

const ICON_MAP: Record<string, React.ReactNode> = {
  "Magic Show": <AutoFixHigh />,
  "Photography": <CameraAlt />,
  "Decoration": <CelebrationOutlined />,
  "Catering": <FoodBank />,
  "DJ": <MusicNote />,
  "Food Court": <TableBar />,
  "Favors": <PartyMode />,
  "Gift": <CardGiftcard />,
};

function getIcon(name: string) {
  for (const [key, icon] of Object.entries(ICON_MAP)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return <CelebrationOutlined />;
}

const MotionBox = motion(Box);

export default function Packages() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<CatalogItem[]>("/catalog").then((r) => setItems(r.data)).finally(() => setLoading(false));
  }, []);

  const addons = items.filter((i) => i.type === "service_addon");
  const favors = items.filter((i) => i.type === "favor_essential");

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
            Packages & Add-ons
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: 18, maxWidth: 560, mx: "auto" }}>
            Select from our curated catalog of services and essentials to elevate your event.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Service Add-ons */}
            <Box sx={{ mb: 8 }}>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>Service Add-ons</Typography>
              <Typography color="text.secondary" sx={{ mb: 4 }}>
                Professional services selected to make your event unforgettable.
              </Typography>
              <Grid container spacing={3}>
                {addons.map((item, i) => (
                  <Grid item xs={12} sm={6} md={4} key={item.id}>
                    <MotionBox
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.07 }}
                    >
                      <Card sx={{ height: "100%", "&:hover": { transform: "translateY(-4px)", boxShadow: 6 }, transition: "all 0.2s" }}>
                        <CardContent>
                          <Avatar sx={{ bgcolor: `${BRAND.purple}18`, color: BRAND.purple, width: 52, height: 52, mb: 2 }}>
                            {getIcon(item.name)}
                          </Avatar>
                          <Typography variant="h6" fontWeight={700} gutterBottom>{item.name}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
                            {item.description ?? "A curated service for your event."}
                          </Typography>
                          <Chip
                            label={`₹${item.price.toLocaleString("en-IN")}${item.price_type === "per_hour" ? "/hr" : item.price_type === "per_unit" ? "/unit" : " flat"}`}
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 700 }}
                          />
                        </CardContent>
                      </Card>
                    </MotionBox>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Favors & Essentials */}
            <Box>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>Favors & Essentials</Typography>
              <Typography color="text.secondary" sx={{ mb: 4 }}>
                Party supplies, return gifts, and essentials — add to your booking by quantity.
              </Typography>
              <Grid container spacing={3}>
                {favors.map((item, i) => (
                  <Grid item xs={12} sm={6} md={3} key={item.id}>
                    <MotionBox
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.07 }}
                    >
                      <Card sx={{ height: "100%", "&:hover": { transform: "translateY(-4px)", boxShadow: 4 }, transition: "all 0.2s" }}>
                        <CardContent>
                          <Avatar sx={{ bgcolor: `${BRAND.gold}22`, color: BRAND.goldDark, width: 44, height: 44, mb: 2 }}>
                            {getIcon(item.name)}
                          </Avatar>
                          <Typography variant="subtitle1" fontWeight={700} gutterBottom>{item.name}</Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {item.description ?? "Party essential for your special day."}
                          </Typography>
                          <Chip
                            label={`₹${item.price.toLocaleString("en-IN")} / unit`}
                            color="secondary"
                            variant="outlined"
                            size="small"
                            sx={{ fontWeight: 700, mt: 1 }}
                          />
                        </CardContent>
                      </Card>
                    </MotionBox>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* CTA */}
            <Box
              sx={{
                mt: 8,
                py: 6,
                textAlign: "center",
                background: `linear-gradient(135deg, ${BRAND.purple}12 0%, ${BRAND.gold}12 100%)`,
                borderRadius: 4,
              }}
            >
              <Typography variant="h4" fontWeight={800} gutterBottom>Ready to book?</Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Add any of these to your booking in our easy step-by-step flow.
              </Typography>
              <RouterLink to="/book" style={{ textDecoration: "none" }}>
                <Box
                  component="button"
                  sx={{
                    bgcolor: BRAND.purple,
                    color: "white",
                    border: "none",
                    borderRadius: 2,
                    py: 1.5,
                    px: 5,
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer",
                    "&:hover": { bgcolor: BRAND.purpleDark },
                  }}
                >
                  Book Now →
                </Box>
              </RouterLink>
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
}
