# Banda visual system

This document records the frontend visual baseline. One-liner: "Composable ETFs onchain. One token, every asset inside."

The lane is a security-printed certificate: banknote green drenched across the hero, inner-page bands and closing note, foil gold for guilloche and the primary call to action, and a near-neutral security-paper body tinted toward the brand green, never cream. All colors are OKLCH tokens in `app/globals.css`, with separately defined dark-mode values.

Archivo carries every word: extended width (116–125%) for headlines and Basket names, normal width for body. Geist Mono is reserved for figures, serials and addresses. Basket serials print in red, like a note's serial number.

Imagery is generated in `components/guilloche.tsx`: rosettes, wave bands and microtext. The certificate is the hero object, framed by an inset gold rule and wave bands; the subscription panel, fee sheet and portfolio positions reuse that frame. Baskets are listed as a ledger, not a card grid. The only numbered sequence is the three-step flow.

Motion: a single staggered first-load rise for the hero, the certificate settling into a slight tilt, the one-time asset consolidation, and a very slow rosette rotation. Everything is disabled under reduced motion.
