# Accessibility UX Audit And Improvement Plan

## Summary

This audit targets WCAG 2.2 AA for the public Next.js lesson site and the Payload editor/admin experience. The public site already had a solid semantic baseline: `lang`, skip link, sticky header, primary navigation, one main region, descriptive page titles, native form controls, and native scripture accordions. The main risks were user-authored Markdown heading levels, mobile visual order differing from DOM focus order, artwork lightbox focus restoration, and border/focus contrast in both public and admin themes.

For the backend/admin side, the priority is the Payload editor UX rather than API accessibility: field labels, instructional copy, focus visibility, status announcements, and editor workflows that preserve accessible public output.

## Audit Findings

- **Logical headings and landmarks:** Public pages use header/nav/main/footer and a single public page `h1`, but musing Markdown could previously inject `h1`/`h2` headings inside an `h3` musing card. Normalize public musing body headings so author-provided `#` starts at `h4`.
- **Keyboard focus order:** The homepage featured lesson image was visually moved before text on mobile while remaining later in the DOM. Remove that CSS reorder so visual order and tab order match.
- **Modals and lightbox escape:** The artwork viewer used native `<dialog>`, which is the right primitive, but focus restoration after Escape/close needed to be explicit. The dialog should label itself, focus the close button on open, close on Escape/backdrop/close button, and restore focus to the image trigger.
- **Minimum contrast:** Public and admin border tokens were below the 3:1 non-text contrast target. Raise the public `--border` and Payload `--admin-border` tokens while preserving the existing editorial palette. Keep text/link/focus contrast at AA or better in both light and dark themes.
- **Admin/editor UX:** Media alt text is required and already well-directed. Strengthen admin helper text so editors understand that Markdown headings are nested under the musing title, expose public-link state as a polite status, and make custom admin focus states consistently visible.

## Implementation Plan

- Keep semantic HTML as the default: native links/buttons/selects/details/dialog, one main landmark, descriptive section headings, and no ARIA unless native semantics need help.
- Treat Payload content as part of the accessibility system: required alt text remains required, Markdown heading output is normalized on the public site, and admin descriptions explain how authored content maps to public semantics.
- Make keyboard behavior testable: skip link reaches `main`, featured content follows DOM order on mobile, artwork lightbox opens from the trigger, Escape closes it, and focus returns to the trigger.
- Maintain contrast with tokens instead of one-off overrides: public and admin theme variables must meet 4.5:1 for text and 3:1 for UI boundaries/focus indicators in light and dark modes.
- Keep motion quiet by default for reduced-motion users: decorative transitions and transforms stay inside `prefers-reduced-motion: no-preference`.

## Verification Plan

- Add unit coverage for Markdown heading normalization.
- Add Playwright accessibility coverage for public landmarks/headings, skip-link keyboard behavior, lightbox Escape/focus restoration, custom Payload admin guidance, and public/admin contrast tokens.
- Run `pnpm run lint`, `pnpm run test:int`, `pnpm run test:e2e`, and `pnpm run build`.
- Run `coderabbit review --plain --base origin/main`; ensure the CodeRabbit binary is on `PATH`, then incorporate actionable feedback before opening the PR.
