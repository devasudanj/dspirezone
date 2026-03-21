import { Box, Container, Grid, Typography, Link, Divider, IconButton, Stack } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { Facebook, Instagram, Twitter, YouTube, Email, Phone, LocationOn } from "@mui/icons-material";
import logoSvg from "../assets/logo/dspirezone-logo.svg";
import { BRAND } from "../theme";

const FOOTER_LINKS = {
  "Quick Links": [
    { label: "Home", href: "/" },
    { label: "Book Now", href: "/book" },
    { label: "Packages", href: "/packages" },
    { label: "Gallery", href: "/gallery" },
  ],
  "Support": [
    { label: "Contact Us", href: "/contact" },
    { label: "Policies", href: "/policies" },
    { label: "FAQs", href: "/policies#faq" },
  ],
  "Account": [
    { label: "Login", href: "/login" },
    { label: "Register", href: "/register" },
    { label: "My Bookings", href: "/my-bookings" },
  ],
};

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        background: `linear-gradient(135deg, ${BRAND.charcoal} 0%, ${BRAND.purpleDark} 100%)`,
        color: "white",
        pt: 8,
        pb: 4,
        mt: 8,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Brand column */}
          <Grid item xs={12} md={4}>
            <Box component="img" src={logoSvg} alt="DspireZone" sx={{ height: 44, mb: 2, filter: "brightness(0) invert(1)" }} />
            <Typography variant="body2" sx={{ opacity: 0.7, mb: 3, lineHeight: 1.8, maxWidth: 320 }}>
              Chennai's premier boutique event venue — perfect for birthdays, baby showers, and intimate celebrations in New Perungalathur.
            </Typography>
            <Stack direction="row" spacing={1}>
              {[
                { Icon: Instagram, href: "https://www.instagram.com/dspirezone" },
                { Icon: Facebook, href: "https://www.facebook.com/share/1DfJVwayt5/" },
                { Icon: Twitter, href: "#" },
                { Icon: YouTube, href: \"https://www.youtube.com/@DspireZone\" },
              ].map(({ Icon, href }, i) => (
                <IconButton
                  key={i}
                  size="small"
                  component="a"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: "white",
                    opacity: 0.7,
                    border: "1px solid rgba(255,255,255,0.2)",
                    "&:hover": { bgcolor: BRAND.gold, opacity: 1, border: `1px solid ${BRAND.gold}` },
                  }}
                >
                  <Icon fontSize="small" />
                </IconButton>
              ))}
            </Stack>
          </Grid>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <Grid item xs={6} md={2} key={section}>
              <Typography
                variant="overline"
                sx={{ color: BRAND.gold, fontWeight: 700, letterSpacing: 1.5, display: "block", mb: 1.5 }}
              >
                {section}
              </Typography>
              <Stack spacing={0.75}>
                {links.map((link) => (
                  <Link
                    key={link.label}
                    component={RouterLink}
                    to={link.href}
                    underline="none"
                    sx={{
                      color: "rgba(255,255,255,0.7)",
                      fontSize: 14,
                      transition: "color 0.2s",
                      "&:hover": { color: BRAND.gold },
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </Stack>
            </Grid>
          ))}

          {/* Contact column */}
          <Grid item xs={12} md={2}>
            <Typography
              variant="overline"
              sx={{ color: BRAND.gold, fontWeight: 700, letterSpacing: 1.5, display: "block", mb: 1.5 }}
            >
              Contact
            </Typography>
            <Stack spacing={1.5}>
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <LocationOn sx={{ fontSize: 18, opacity: 0.7, mt: 0.2, flexShrink: 0 }} />
                <Typography variant="body2" sx={{ opacity: 0.7, lineHeight: 1.6 }}>
                  30 Srinivasa Perumal Sannathi, Anna Salai, New Perungalathur, Chennai – 600 063, Tamil Nadu
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Email sx={{ fontSize: 18, opacity: 0.7 }} />
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  hello@dspirezone.com
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Phone sx={{ fontSize: 18, opacity: 0.7 }} />
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  +91 98765 43210
                </Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", my: 4 }} />

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Typography variant="body2" sx={{ opacity: 0.5, fontSize: 13 }}>
            © {new Date().getFullYear()} DspireZone. All rights reserved.
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Link component={RouterLink} to="/policies" underline="none" sx={{ color: "rgba(255,255,255,0.5)", fontSize: 13, "&:hover": { color: BRAND.gold } }}>
              Privacy Policy
            </Link>
            <Link component={RouterLink} to="/policies" underline="none" sx={{ color: "rgba(255,255,255,0.5)", fontSize: 13, "&:hover": { color: BRAND.gold } }}>
              Terms of Service
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
