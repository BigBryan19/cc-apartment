// app/components/Packages.tsx
// ---------------------------------------------------------------------------
// Retired.
//
// This file used to hold a second, hard-coded copy of the service cards with its
// own prices ("From GHS 500" for the honeymoon, "From GHS 350" for a sports car)
// and its own WhatsApp number. Those figures disagreed with the booking engine
// and with the client's rate card, which is how the site advertised a price it
// could not charge.
//
// The cards now live in app/components/Services.tsx and read their prices from
// app/lib/services.ts. This shim remains only so an old import cannot silently
// resurrect the stale copy.
// ---------------------------------------------------------------------------

export { default } from "./Services";
