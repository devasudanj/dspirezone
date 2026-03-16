import React from "react";
import { Box, Container, Typography, Paper, Stack, Chip, Button } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const GUIDELINES = [
  {
    title: "Facilities at Site",
    subtitle: "Common area with 50+ seating capacity featuring large TVs for entertainment. AC rooms (middle) serve as common areas when not booked for events. Generator provisioned for basic lighting, refrigeration, and elevator operations. On-site supervisor assists vendors and ensures adherence to guidelines. Small party orders from 3rd floor events create additional business opportunities. Marketing through social media promotes health-focused options. We encourage new vendors with minimal investment requirements, offer online onboarding and stall booking, and have arcade gaming planned for future footfall. Modern ambience assured with profile lights and false ceiling. Valet parking available during events and parties.",
  },
  {
    title: "Cleanliness Ownership",
    subtitle: "Assign your own cleaning staff and keep your designated zone tidy throughout operations.",
  },
  {
    title: "Hygiene First",
    subtitle: "Head covers and serving gloves are mandatory while preparing and serving food.",
  },
  {
    title: "Cooking & Kitchen Use",
    subtitle: "Heavy cooking is not permitted. Any kitchen usage must be approved in advance.",
  },
  {
    title: "Sustainable Service",
    subtitle: "Use biodegradable serving materials and follow proper waste segregation practices.",
  },
  {
    title: "Approvals & Safety",
    subtitle: "Declare menu/pricing early, get approval for setup changes, maintain valid licenses, and follow all safety rules.",
  },
];

export default function VendorGuidelines() {
  return (
    <Box sx={{ py: { xs: 5, md: 8 }, bgcolor: "background.default", minHeight: "70vh" }}>
      <Container maxWidth="md">
        <Chip label="Vendor Reference" color="primary" sx={{ mb: 1.5 }} />
        <Typography variant="h4" fontWeight={800} sx={{ mb: 1.5 }}>
          Vendor Guidelines
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Please review these guidelines before submitting your vendor interest form.
        </Typography>

        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
          <Stack spacing={1.2}>
            {GUIDELINES.map((item, index) => (
              <Box key={item.title} sx={{ pb: 1.2 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {index + 1}. {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.subtitle}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>

        <Button component={RouterLink} to="/vendors" sx={{ mt: 3 }} variant="contained" color="secondary">
          Back to Vendor Interest Form
        </Button>
      </Container>
    </Box>
  );
}
