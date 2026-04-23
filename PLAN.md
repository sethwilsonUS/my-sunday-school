# Sunday School CMS — PLAN.md

## Project Overview

A public-facing Sunday school resource site built with **Payload CMS v3 + Next.js 15 (App Router)**, deployed to Vercel. The admin (one user) manages lesson content via the Payload admin panel. Students browse published lessons publicly — no login required. Designed for future Clerk integration with minimal refactoring.

**Production URL:** `my-sunday-school.vercel.app`
**Stack:** Next.js 15 · Payload CMS v3 · Neon (PostgreSQL) · Vercel Blob · Tailwind CSS v4 · TypeScript

***

## Phase 0 — Project Bootstrapping

1. Scaffold with `npx create-payload-app@latest` using the **blank** template and select TypeScript.
2. Install the correct database adapter — use **`@payloadcms/db-postgres`** (the official, fully-supported adapter). **Do NOT use `@payloadcms/db-vercel-postgres`** — that package depends on the deprecated `@vercel/postgres` driver and has known build issues with Next.js 15.[^1][^2]
3. Install Vercel Blob storage plugin: `@payloadcms/storage-vercel-blob`.
4. Wrap `next.config.ts` with `withPayload()`. Add `devBundleServerPackages: false` to the `withPayload` options to avoid Vercel function size limit issues.[^2]
5. Configure `app/(payload)/admin/[[...segments]]/page.tsx` and `app/(payload)/api/[...slug]/route.ts` per Payload v3 Next.js App Router conventions.[^3]

### Environment Variables (.env.local)

```
DATABASE_URL=postgresql://...   # Neon connection string (pooled)
PAYLOAD_SECRET=...              # Long random string
BLOB_READ_WRITE_TOKEN=...       # Vercel Blob token
```

***

## Phase 1 — Database Setup (Neon)

1. Create a new project at [neon.tech](https://neon.tech). Copy the **pooled** connection string.
2. Paste into `DATABASE_URL` in `.env.local`.
3. In `payload.config.ts`:

```ts
import { postgresAdapter } from '@payloadcms/db-postgres'

export default buildConfig({
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
  }),
  // ...
})
```

4. In development, Drizzle auto-pushes schema changes (`push: true` is the default in dev). In production, schema changes are applied via migration: set the Vercel build command to `pnpm payload migrate && pnpm build`.[^4]
5. Optionally link the Neon project to the Vercel project via the Neon Vercel Marketplace integration to auto-inject `DATABASE_URL` into Vercel environment variables — this removes one manual step at deploy time.[^5]

***

## Phase 2 — Collections

### 2.1 Users Collection

Payload generates a default `users` collection. Extend it minimally now so that Clerk can be added later with minimal friction:

```ts
// collections/Users.ts
import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
  },
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      defaultValue: ['admin'],
      options: ['admin'],
      // Future: add 'student' when Clerk integration is added
    },
    // Future Clerk integration: add `clerkId` field here
    // { name: 'clerkId', type: 'text', unique: true, admin: { readOnly: true } }
  ],
}
```

> **Clerk upgrade path note:** When Clerk is added, a `clerkId` text field should be added to this collection, `auth: true` can be disabled (Payload becomes data-only, Clerk owns identity), and a webhook at `/api/clerk/webhooks` syncs `user.created` / `user.deleted` events. Access control functions swap from checking Payload JWT to verifying Clerk JWT. No collection schema changes are required beyond adding `clerkId`.[^6][^7]

### 2.2 Media Collection

```ts
// collections/Media.ts
import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  upload: true,
  access: {
    read: () => true,
  },
  fields: [
    { name: 'altText', type: 'text', required: true },
    { name: 'artist', type: 'text' },
    { name: 'artistDates', type: 'text' }, // e.g. "1606–1669"
    { name: 'workDate', type: 'text' },    // e.g. "c. 1635"
    { name: 'wikimediaUrl', type: 'text', label: 'Wikimedia Commons URL' },
  ],
}
```

Configure Vercel Blob in `payload.config.ts`:[^8][^9]

```ts
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'

plugins: [
  vercelBlobStorage({
    enabled: true,
    collections: { media: true },
    token: process.env.BLOB_READ_WRITE_TOKEN!,
    clientUploads: true, // bypasses the 4.5MB serverless upload limit
  }),
],
```

### 2.3 Lessons Collection

This is the primary content collection.

```ts
// collections/Lessons.ts
import type { CollectionConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

export const Lessons: CollectionConfig = {
  slug: 'lessons',
  access: {
    read: () => true,                          // fully public
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'liturgicalSeason', 'status'],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'date', type: 'date', required: true },
    {
      name: 'liturgicalSeason',
      type: 'select',
      required: true,
      options: [
        { label: 'Advent', value: 'advent' },
        { label: 'Christmas', value: 'christmas' },
        { label: 'Epiphany / Ordinary Time (Winter)', value: 'epiphany' },
        { label: 'Lent', value: 'lent' },
        { label: 'Holy Week', value: 'holy-week' },
        { label: 'Easter', value: 'easter' },
        { label: 'Pentecost', value: 'pentecost' },
        { label: 'Ordinary Time', value: 'ordinary-time' },
      ],
    },
    {
      name: 'lectionaryYear',
      type: 'select',
      options: ['A', 'B', 'C'],
    },
    {
      name: 'scriptures',
      type: 'array',
      fields: [
        { name: 'reference', type: 'text', required: true }, // e.g. "John 20:19-31"
        { name: 'translation', type: 'text', defaultValue: 'NRSV-UE' },
        { name: 'passageText', type: 'textarea' },
      ],
    },
    {
      name: 'studyQuestions',
      type: 'array',
      fields: [
        { name: 'question', type: 'textarea', required: true },
      ],
    },
    {
      name: 'quotes',
      type: 'array',
      fields: [
        { name: 'text', type: 'textarea', required: true },
        { name: 'author', type: 'text' },
        { name: 'source', type: 'text' },
      ],
    },
    {
      name: 'artworks',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        { name: 'caption', type: 'text' },
      ],
    },
    {
      name: 'videoLinks',
      type: 'array',
      label: 'Related Videos',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'youtubeUrl', type: 'text', required: true },
      ],
    },
    {
      name: 'links',
      type: 'array',
      label: 'Other Links',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
        { name: 'description', type: 'text' },
      ],
    },
    {
      name: 'notes',
      type: 'richText',
      editor: lexicalEditor({}),
      label: 'Additional Notes (Admin Only)',
      access: { read: isAdmin },
    },
    {
      name: 'status',
      type: 'select',
      options: ['draft', 'published'],
      defaultValue: 'draft',
      required: true,
    },
  ],
}
```

Access control helper (add to a shared `access/index.ts`):

```ts
import type { Access } from 'payload'

export const isAdmin: Access = ({ req }) => {
  return req.user?.roles?.includes('admin') ?? false
}
```

> This is the Clerk upgrade path seam — swap `req.user?.roles?.includes('admin')` for a Clerk JWT check without touching collection definitions.[^10][^11]

***

## Phase 3 — Frontend (Next.js App Router)

### 3.1 Public Routes

| Route | Description |
|-------|-------------|
| `/` | Homepage — hero + recent lessons grid |
| `/lessons` | All published lessons, filterable by season/year |
| `/lessons/[slug]` | Individual lesson page |

Fetch data server-side using Payload's local API (since Payload and Next.js share the same process):[^3]

```ts
import { getPayload } from 'payload'
import config from '@payload-config'

const payload = await getPayload({ config })
const lessons = await payload.find({
  collection: 'lessons',
  where: { status: { equals: 'published' } },
  sort: '-date',
})
```

### 3.2 Liturgical Theming

Define a single `LITURGICAL_THEMES` constant — the source of truth for all season colors. This lives in `lib/liturgical-themes.ts` and is imported everywhere season styling is needed. Never hardcode season colors inline in components:[^12][^13]

```ts
export const LITURGICAL_THEMES = {
  advent:        { accent: '#4B3070', accentDark: '#A78BCD', label: 'Advent' },
  christmas:     { accent: '#C9A84C', accentDark: '#E8CC87', label: 'Christmas' },
  epiphany:      { accent: '#2D6A4F', accentDark: '#74C69D', label: 'Epiphany' },
  lent:          { accent: '#6B2D5E', accentDark: '#C084B8', label: 'Lent' },
  'holy-week':   { accent: '#8B1A1A', accentDark: '#E06060', label: 'Holy Week' },
  easter:        { accent: '#C9A84C', accentDark: '#E8CC87', label: 'Easter' },
  pentecost:     { accent: '#CC3300', accentDark: '#FF7A57', label: 'Pentecost' },
  'ordinary-time': { accent: '#2D6A4F', accentDark: '#74C69D', label: 'Ordinary Time' },
} as const
```

Apply the season's accent as a **CSS custom property on the page/card wrapper**, not as a text color, to maintain WCAG 2.2 AA compliance:[^14]

```tsx
// In the lesson page component:
const theme = LITURGICAL_THEMES[lesson.liturgicalSeason]
// Apply via inline style or data attribute:
<article style={{ '--season-accent': theme.accent } as React.CSSProperties}>
```

In CSS:
```css
.season-border { border-left: 4px solid var(--season-accent); }
.season-badge  { background-color: var(--season-accent); color: #fff; }
/* Verify each badge text passes 4.5:1 contrast against its background */
```

### 3.3 Light/Dark Toggle

Use Tailwind v4's `dark:` variant with `data-theme` on `<html>`. No external library needed:

- On mount, read `localStorage.getItem('theme')` or `prefers-color-scheme`
- Set `document.documentElement.setAttribute('data-theme', value)`
- Persist choice to `localStorage`
- Add a toggle button in the site header; aria-label updates with current state

CSS custom property tokens to define in both light and dark modes:

```css
:root {
  --background: #ffffff;
  --foreground: #111111;
  --card: #f8f7f5;
  --card-foreground: #111111;
  --muted: #6b7280;
  --border: #e5e7eb;
}
[data-theme="dark"] {
  --background: #1a1a1a;
  --foreground: #f0ede8;
  --card: #252525;
  --card-foreground: #f0ede8;
  --muted: #9ca3af;
  --border: #374151;
}
```

Dark-mode accent colors use the `accentDark` values from `LITURGICAL_THEMES` above, applied via a small JS utility that reads `data-theme` at render time.

### 3.4 WCAG 2.2 AA Requirements[^15][^14]

- **Normal text:** minimum 4.5:1 contrast ratio against background
- **Large text (18pt+ or 14pt+ bold):** minimum 3:1
- **UI components and focus indicators:** minimum 3:1
- **Liturgical accent colors:** used only on decorative elements (borders, badges), never as body text color
- **Focus styles:** visible focus rings on all interactive elements (`outline: 2px solid; outline-offset: 2px` minimum)
- **Verify** all season badge combinations (accent background + white text) at [webaim.org/resources/contrastchecker](https://webaim.org/resources/contrastchecker/)[^16]

***

## Phase 4 — Build & Deploy

### 4.1 Vercel Configuration

In `vercel.json` or the Vercel dashboard:

```json
{
  "buildCommand": "pnpm payload migrate && pnpm build",
  "outputDirectory": ".next"
}
```

Environment variables to add in Vercel dashboard:
- `DATABASE_URL` (Neon pooled connection string)
- `PAYLOAD_SECRET`
- `BLOB_READ_WRITE_TOKEN`
- `NEXT_PUBLIC_SERVER_URL` (set to `https://my-sunday-school.vercel.app`)

### 4.2 Vercel Pro — No Keepalive Cron Needed

This project is on Vercel Pro, which uses Fluid Compute and keeps production instances warm. No cron job is needed to prevent cold starts.[^17]

### 4.3 Type Generation

After any collection schema changes, run:
```
pnpm payload generate:types
```
Commit the generated `payload-types.ts` file. Import collection types from it throughout the frontend for full TypeScript coverage.[^18]

***

## Phase 5 — Future: Clerk Integration (Minimal Refactor Path)

The following changes — and only these — are required to add Clerk later. No collection field additions beyond `clerkId` on `Users`, and no public-facing page changes:[^19][^7][^6]

1. Install `@clerk/nextjs`
2. Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to env vars
3. Wrap `app/layout.tsx` with `<ClerkProvider>`
4. Add `clerkId: text` field to `Users` collection
5. Create `app/api/clerk/webhooks/route.ts` to handle `user.created` / `user.deleted` events → sync to Payload `users` collection
6. Update `isAdmin` access control to verify Clerk JWT instead of Payload session token
7. Optionally disable `auth: true` on the Users collection (Payload becomes data-only; Clerk owns identity)
8. Add `<SignInButton>` / `<UserButton>` to site header as needed

***

## Dependency Reference

| Package | Purpose |
|---------|---------|
| `payload` | CMS core |
| `@payloadcms/next` | Next.js adapter |
| `@payloadcms/db-postgres` | PostgreSQL adapter (Neon) |
| `@payloadcms/richtext-lexical` | Rich text editor |
| `@payloadcms/storage-vercel-blob` | Media storage |
| `next` | App framework |
| `tailwindcss` v4 | Styling |
| `typescript` | Types |

**Do NOT install:** `@payloadcms/db-vercel-postgres`, `@vercel/postgres`[^1][^2]

---

## References

1. [Transition plan away from `@vercel/postgres` in `db-vercel ... - GitHub](https://github.com/payloadcms/payload/discussions/13404) - Vercel's PostgreSQL storage service (white-labeled Neon) has been phased out in favor of a marketpla...

2. [Blank template with new vercel postgres fails on `pnpm run build ...](https://github.com/payloadcms/payload/issues/12197) - Create a new postgres database on vercel (v17) Create new blank payload using pnpx create-payload-ap...

3. [Installation | Documentation - Payload CMS](https://payloadcms.com/docs/getting-started/installation) - To quickly get started with Payload, simply run npx create-payload-app or install from scratch.

4. [Deploy Next.js & Payload CMS using Vercel (2026 Guide)](https://www.youtube.com/watch?v=Fv5Tb6FV2s4) - In this video, I’ll show you exactly how to deploy a Next.js app powered by Payload CMS to Vercel. W...

5. [Neon for Vercel](https://vercel.com/marketplace/neon) - Postgres serverless platform designed to build reliable and scalable apps

6. [Handling 3rd party auth clerk over rest api - Payload CMS](https://payloadcms.com/community-help/github/handling-3rd-party-auth-clerk-over-rest-api) - On my front end I'm using Clerk for user authentication. I'm trying to figure out the "best" way to ...

7. [Payload and Clerk advanced integration - YouTube](https://www.youtube.com/watch?v=egKaeOuddFA) - Payload CMS and Clerk - advanced integration with Clerk webhooks and custom components tested with P...

8. [@payloadcms/storage-vercel-blob - NPM](https://www.npmjs.com/package/@payloadcms/storage-vercel-blob) - This package provides a simple way to use Vercel Blob storage with Payload. NOTE: This package remov...

9. [Vercel Blob, Cloudflare R2, and Uploadthing - Payload CMS](https://payloadcms.com/posts/guides/how-to-configure-file-storage-in-payload-with-vercel-blob-r2-and-uploadthing) - In this tutorial, we'll walk through configuring three popular storage adapters in Payload: Vercel B...

10. [PayloadCMS from Scratch #3 - Access Control and Users - Adrian Maj](https://adrianmaj.com/posts/payloadcms-from-scratch-3-users-and-access-control) - You've learned how to precisely define access to documents for different user groups and how to crea...

11. [Setting up Auth and Role-Based Access Control in Next.js + Payload](https://payloadcms.com/posts/guides/setting-up-auth-and-role-based-access-control-in-nextjs-payload) - Learn how to set up authentication and define user roles in Payload, then lock down your Next.js app...

12. [What are the 6 liturgical seasons and their colors?](https://www.colorwithleo.com/what-are-the-6-liturgical-seasons-and-their-colors/) - https://www.youtube.com/watch?v=_x5vvE3qb_E The liturgical calendar divides the year into six season...

13. [Understanding the Liturgical Colors | USCCB](https://www.usccb.org/prayer-and-worship/liturgical-year-and-calendar/understanding-the-liturgical-colors) - In the liturgical calendar, the color for each day corresponds to that day's main liturgical celebra...

14. [Contrast requirements for WCAG 2.2 Level AA](https://www.makethingsaccessible.com/guides/contrast-requirements-for-wcag-2-2-level-aa/) - But there has to be a minimum value and the values for contrast at Level AA are either 3:1 or 4.5:1 ...

15. [Accessible Colors: From WCAG to APCA - Capellic](https://capellic.com/insights/accessible-colors) - To meet the WCAG's AA standard, your text and its background color must have a contrast ratio of at ...

16. [Contrast Checker - WebAIM](https://webaim.org/resources/contrastchecker/) - WCAG Level AAA requires a contrast ratio of at least 7:1 for normal text and 4.5:1 for large text. L...

17. [Scale to one: How Fluid solves cold starts - Vercel](https://vercel.com/blog/scale-to-one-how-fluid-solves-cold-starts) - Learn how Vercel solves serverless cold starts with scale to one, Fluid compute, predictive scaling,...

18. [Building AI-Native Applications with Payload CMS and the Vercel AI ...](https://finly.ch/engineering-blog/916926-building-ai-native-applications-with-payload-cms-and-the-vercel-ai-sdk) - A technical breakdown of how we use Payload CMS and the Vercel AI SDK to build AI-native FinSureTech...

19. [Integrating Payload CMS with fully synced Clerk auth/identity ...](https://www.reddit.com/r/PayloadCMS/comments/1n2fvy5/integrating_payload_cms_with_fully_synced_clerk/) - This evening I took u/DanailMinchev's excellent payload-clerk-example and updated it to work with th...

