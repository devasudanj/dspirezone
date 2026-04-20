import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  useScrollTrigger,
  Slide,
  Container,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  AccountCircle,
  Dashboard,
  Logout,
  EventAvailable,
  Phone,
} from "@mui/icons-material";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";

const BOOKING_PHONE = "+918065481150";
const BOOKING_PHONE_DISPLAY = "+91 80654 81150";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logoSvg from "../assets/logo/dspirezone-logo.svg";
import { BRAND } from "../theme";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Book Now", href: "/book", highlight: true },
  { label: "VR Zone", href: "/dspire-vr-zone" },
  { label: "Food Court Vendors", href: "/vendors" },
  { label: "Packages", href: "/packages" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
  { label: "Hiring", href: "/hiring" },
];

function HideOnScroll({ children }: { children: React.ReactElement }) {
  const trigger = useScrollTrigger();
  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
}

export default function Navbar() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate("/");
  };

  return (
    <>
      <HideOnScroll>
        <AppBar
          position="fixed"
          sx={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <Container maxWidth="lg">
            <Toolbar disableGutters sx={{ py: 0.5 }}>
              {/* Logo */}
              <Box
                component={RouterLink}
                to="/"
                sx={{ display: "flex", alignItems: "center", textDecoration: "none", mr: 4 }}
              >
                <Box component="img" src={logoSvg} alt="DspireZone" sx={{ height: 40 }} />
              </Box>

              {/* Desktop nav */}
              {!isMobile && (
                <Box sx={{ display: "flex", gap: 0.5, flexGrow: 1 }}>
                  {NAV_LINKS.map((link) => (
                    <Button
                      key={link.href}
                      component={RouterLink}
                      to={link.href}
                      sx={
                        link.highlight
                          ? {
                              background: "linear-gradient(135deg, #4A0E8F 0%, #BF00FF 100%)",
                              color: "white",
                              fontWeight: 700,
                              px: 1.5,
                              borderRadius: 2,
                              border: "1px solid rgba(191,0,255,0.4)",
                              boxShadow: location.pathname === link.href
                                ? "0 0 12px rgba(191,0,255,0.6)"
                                : "0 0 6px rgba(191,0,255,0.25)",
                              "&:hover": {
                                background: "linear-gradient(135deg, #6A1EAF 0%, #D420FF 100%)",
                                boxShadow: "0 0 18px rgba(191,0,255,0.5)",
                              },
                            }
                          : {
                              color:
                                location.pathname === link.href
                                  ? BRAND.purple
                                  : BRAND.charcoal,
                              fontWeight: location.pathname === link.href ? 700 : 500,
                              px: 1.5,
                              "&:hover": { background: "rgba(74,14,143,0.06)" },
                            }
                      }
                    >
                      {link.label}
                    </Button>
                  ))}
                </Box>
              )}

              <Box sx={{ flexGrow: isMobile ? 1 : 0 }} />

              {/* Booking Assistant phone – desktop */}
              {!isMobile && (
                <Tooltip title="Call us 24×7 for venue space booking" arrow>
                  <Chip
                    component="a"
                    href={`tel:${BOOKING_PHONE}`}
                    icon={<Phone sx={{ fontSize: 16 }} />}
                    label={`Booking Assistant · ${BOOKING_PHONE_DISPLAY}`}
                    clickable
                    size="small"
                    sx={{
                      mr: 2,
                      bgcolor: `${BRAND.purple}12`,
                      color: BRAND.purple,
                      fontWeight: 600,
                      border: `1px solid ${BRAND.purple}40`,
                      "& .MuiChip-icon": { color: BRAND.purple },
                      "&:hover": { bgcolor: `${BRAND.purple}22` },
                    }}
                  />
                </Tooltip>
              )}

              {/* Auth buttons */}
              {!isMobile && (
                <>
                  {user ? (
                    <>
                      <Button
                        startIcon={<EventAvailable />}
                        variant="contained"
                        color="primary"
                        component={RouterLink}
                        to="/book"
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        Book Now
                      </Button>
                      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: BRAND.purple,
                            fontSize: 14,
                            fontWeight: 700,
                          }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </Avatar>
                      </IconButton>
                      <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={() => setAnchorEl(null)}
                        PaperProps={{ sx: { mt: 1, minWidth: 180 } }}
                      >
                        <MenuItem disabled>
                          <Box>
                            <Box sx={{ fontWeight: 700, fontSize: 14 }}>{user.name}</Box>
                            <Box sx={{ fontSize: 12, color: "text.secondary" }}>{user.email}</Box>
                          </Box>
                        </MenuItem>
                        <Divider />
                        <MenuItem
                          component={RouterLink}
                          to="/my-bookings"
                          onClick={() => setAnchorEl(null)}
                        >
                          <EventAvailable sx={{ mr: 1, fontSize: 18 }} /> My Bookings
                        </MenuItem>
                        {isAdmin && (
                          <MenuItem
                            component={RouterLink}
                            to="/admin"
                            onClick={() => setAnchorEl(null)}
                          >
                            <Dashboard sx={{ mr: 1, fontSize: 18 }} /> Admin Portal
                          </MenuItem>
                        )}
                        <Divider />
                        <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
                          <Logout sx={{ mr: 1, fontSize: 18 }} /> Logout
                        </MenuItem>
                      </Menu>
                    </>
                  ) : (
                    <>
                      <Button
                        component={RouterLink}
                        to="/login"
                        sx={{ color: BRAND.charcoal, mr: 1 }}
                      >
                        Login
                      </Button>
                      <Button
                        component={RouterLink}
                        to="/register"
                        variant="contained"
                        color="primary"
                      >
                        Sign up
                      </Button>
                    </>
                  )}
                </>
              )}

              {/* Mobile hamburger */}
              {isMobile && (
                <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: BRAND.charcoal }}>
                  <MenuIcon />
                </IconButton>
              )}
            </Toolbar>
          </Container>
        </AppBar>
      </HideOnScroll>

      {/* Mobile drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: "80vw", maxWidth: 320, p: 2 } }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box component="img" src={logoSvg} alt="DspireZone" sx={{ height: 36 }} />
          <IconButton onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <List>
          {NAV_LINKS.map((link) => (
            <ListItemButton
              key={link.href}
              component={RouterLink}
              to={link.href}
              onClick={() => setDrawerOpen(false)}
              selected={location.pathname === link.href}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemText
                primary={link.label}
                primaryTypographyProps={{
                  fontWeight: location.pathname === link.href ? 700 : 500,
                }}
              />
            </ListItemButton>
          ))}
        </List>
        {/* Booking Assistant phone – mobile drawer */}
        <Box
          component="a"
          href={`tel:${BOOKING_PHONE}`}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2,
            py: 1.2,
            mb: 1,
            borderRadius: 2,
            bgcolor: `${BRAND.purple}10`,
            border: `1px solid ${BRAND.purple}30`,
            color: BRAND.purple,
            textDecoration: "none",
          }}
        >
          <Phone sx={{ fontSize: 18 }} />
          <Box>
            <Box sx={{ fontWeight: 700, fontSize: 13 }}>Booking Assistant</Box>
            <Box sx={{ fontSize: 12 }}>{BOOKING_PHONE_DISPLAY} · 24×7</Box>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />
        {user ? (
          <>
            <Box sx={{ px: 2, mb: 2 }}>
              <Box sx={{ fontWeight: 700 }}>{user.name}</Box>
              <Box sx={{ fontSize: 12, color: "text.secondary" }}>{user.email}</Box>
            </Box>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              component={RouterLink}
              to="/book"
              onClick={() => setDrawerOpen(false)}
              sx={{ mb: 1 }}
            >
              Book Now
            </Button>
            <Button
              fullWidth
              component={RouterLink}
              to="/my-bookings"
              onClick={() => setDrawerOpen(false)}
              sx={{ mb: 1 }}
            >
              My Bookings
            </Button>
            {isAdmin && (
              <Button
                fullWidth
                component={RouterLink}
                to="/admin"
                onClick={() => setDrawerOpen(false)}
                sx={{ mb: 1 }}
              >
                Admin Portal
              </Button>
            )}
            <Button fullWidth onClick={handleLogout} color="error">
              Logout
            </Button>
          </>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, px: 0 }}>
            <Button
              fullWidth
              variant="outlined"
              component={RouterLink}
              to="/login"
              onClick={() => setDrawerOpen(false)}
            >
              Login
            </Button>
            <Button
              fullWidth
              variant="contained"
              component={RouterLink}
              to="/register"
              onClick={() => setDrawerOpen(false)}
            >
              Sign up
            </Button>
          </Box>
        )}
      </Drawer>

      {/* Toolbar spacer */}
      <Toolbar />
    </>
  );
}
