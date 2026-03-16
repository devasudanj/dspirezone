import React, { useState } from "react";
import {
  Box, Container, Typography, Grid, Accordion, AccordionSummary,
  AccordionDetails, Chip, Divider, Paper, Stack,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { BRAND } from "../theme";

const SECTIONS = [
  {
    title: "Booking Policy",
    items: [
      { q: "What is the minimum booking duration?", a: "All bookings require a minimum of 2 hours. This ensures adequate time for setup, the event, and teardown." },
      { q: "Can I book for the same day?", a: "Same-day bookings are subject to availability. We recommend booking at least 48 hours in advance to secure your preferred time slot." },
      { q: "How do I confirm my booking?", a: "After completing our online booking flow, you'll receive a unique confirmation code (e.g. DZ-ABCD1234) via the app. This code is your booking reference." },
      { q: "Can I book for recurring events?", a: "Yes! Please contact us directly at hello@dspirezone.com for recurring event pricing and scheduling." },
    ],
  },
  {
    title: "Pricing & Payments",
    items: [
      { q: "How is the venue fee calculated?", a: "The base fee is charged on an hourly rate (₹1,500/hr). All add-ons are priced separately and shown clearly during the booking flow before confirmation." },
      { q: "Is there a deposit required?", a: "Full payment is due at the time of booking confirmation. This secures your slot and prevents double-bookings." },
      { q: "Are there any hidden fees?", a: "Absolutely none. The price you see in the booking summary is the final amount — inclusive of all add-ons, food court tables, extra rooms, and favors you select." },
    ],
  },
  {
    title: "Cancellation & Rescheduling",
    items: [
      { q: "Can I cancel my booking?", a: "You may cancel up to 72 hours before your event for a full refund. Cancellations within 72 hours are non-refundable. Contact hello@dspirezone.com to initiate a cancellation." },
      { q: "Can I reschedule my event?", a: "Rescheduling is permitted with 48 hours' notice, subject to availability. Contact our team and we'll do our best to accommodate you." },
      { q: "What if DspireZone cancels my booking?", a: "In the rare event that we need to cancel your booking (e.g. emergency maintenance), we will provide a full refund and help you find an alternative date." },
    ],
  },
  {
    title: "Venue & Facilities",
    items: [
      { q: "How many guests can the venue accommodate?", a: "Our venue comfortably accommodates 20–80 guests, depending on your seating arrangement." },
      { q: "Is the venue wheelchair accessible?", a: "Yes, DspireZone has step-free access and accessible restrooms on the ground floor." },
      { q: "Is external catering allowed?", a: "We offer our own catering package as an add-on. External catering is not permitted to maintain food safety standards on our premises." },
      { q: "What AV equipment is provided?", a: "Every booking includes a projector, PA system, and microphone at no extra charge." },
    ],
  },
  {
    title: "Add-ons & Extras",
    items: [
      { q: "Can I add or remove add-ons after booking?", a: "Add-ons can be modified up to 24 hours before the event. Please contact us and we'll update your booking accordingly." },
      { q: "What are the food court tables?", a: "Food court tables are dedicated dining tables reserved for your event, available as a paid add-on. They're ideal for buffet-style serving or casual dining setups during your celebration." },
      { q: "What extra rooms are available?", a: "Beyond the 1 room included in every booking, additional rooms can be added at ₹500/hr per room. These are ideal for a separate dressing room, kids' area, or breakout space." },
      { q: "Do party favors need to be pre-ordered?", a: "Yes. Favors & Essentials (balloons, candles, return gifts, etc.) must be selected during the booking flow. We'll have everything ready on your event day." },
    ],
  },
];

export default function Policies() {
  const [expanded, setExpanded] = useState<string | false>("Booking Policy");

  const handleChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

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
            Policies & FAQs
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: 18 }}>
            Everything you need to know about booking and using DspireZone
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
        {/* Quick summary chips */}
        <Paper sx={{ p: 3, mb: 6, borderRadius: 3, bgcolor: `${BRAND.gold}0A`, border: `1px solid ${BRAND.gold}40` }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>Key Policy Highlights</Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {[
              "2hr minimum booking",
              "1 room included FREE",
              "Full payment at checkout",
              "Cancel 72hrs before = full refund",
              "30min post-event buffer",
              "No hidden fees",
            ].map((t) => (
              <Chip key={t} label={t} size="small" sx={{ fontWeight: 600 }} />
            ))}
          </Stack>
        </Paper>

        {/* FAQ Sections */}
        {SECTIONS.map((section) => (
          <Box key={section.title} sx={{ mb: 3 }}>
            <Accordion
              expanded={expanded === section.title}
              onChange={handleChange(section.title)}
              sx={{ borderRadius: "12px !important", overflow: "hidden", border: "1px solid", borderColor: "divider", "&:before": { display: "none" } }}
            >
              <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: expanded === section.title ? `${BRAND.purple}08` : "background.paper" }}>
                <Typography variant="h6" fontWeight={700}>{section.title}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={3}>
                  {section.items.map((item, i) => (
                    <Box key={i}>
                      {i > 0 && <Divider sx={{ mb: 3 }} />}
                      <Typography variant="subtitle2" fontWeight={700} color="primary" gutterBottom>
                        Q: {item.q}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
                        {item.a}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Box>
        ))}

        <Box sx={{ mt: 6, textAlign: "center", p: 4, borderRadius: 3, bgcolor: `${BRAND.purple}08` }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>Still have questions?</Typography>
          <Typography color="text.secondary">
            Contact us at <strong>hello@dspirezone.com</strong> or call <strong>+91 98765 43210</strong>.
            We're happy to help!
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
