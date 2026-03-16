import { createTheme, alpha } from "@mui/material/styles";

// Brand colors
export const BRAND = {
  purple: "#4A0E8F",
  purpleLight: "#7B42D1",
  purpleDark: "#2D0860",
  gold: "#F59E0B",
  goldLight: "#FCD34D",
  goldDark: "#D97706",
  cream: "#FAFAF8",
  charcoal: "#1A0540",
  grey: "#6B7280",
};

const theme = createTheme({
  palette: {
    primary: {
      main: BRAND.purple,
      light: BRAND.purpleLight,
      dark: BRAND.purpleDark,
      contrastText: "#ffffff",
    },
    secondary: {
      main: BRAND.gold,
      light: BRAND.goldLight,
      dark: BRAND.goldDark,
      contrastText: "#1A0540",
    },
    background: {
      default: BRAND.cream,
      paper: "#FFFFFF",
    },
    text: {
      primary: BRAND.charcoal,
      secondary: BRAND.grey,
    },
    error: { main: "#EF4444" },
    success: { main: "#10B981" },
    info: { main: "#3B82F6" },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", sans-serif',
    h1: { fontWeight: 800, letterSpacing: "-0.02em" },
    h2: { fontWeight: 700, letterSpacing: "-0.01em" },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: "none", letterSpacing: "0.02em" },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 24,
          paddingRight: 24,
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${BRAND.purple} 0%, ${BRAND.purpleLight} 100%)`,
          "&:hover": {
            background: `linear-gradient(135deg, ${BRAND.purpleDark} 0%, ${BRAND.purple} 100%)`,
          },
        },
        containedSecondary: {
          background: `linear-gradient(135deg, ${BRAND.gold} 0%, ${BRAND.goldLight} 100%)`,
          "&:hover": {
            background: `linear-gradient(135deg, ${BRAND.goldDark} 0%, ${BRAND.gold} 100%)`,
          },
        },
        outlinedPrimary: {
          borderWidth: 2,
          "&:hover": { borderWidth: 2 },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 16 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
          backdropFilter: "blur(12px)",
        },
      },
    },
  },
});

export default theme;
