# Payload Project Playbook

This playbook captures the things this project taught us the hard way, so the next
Payload build can start with better defaults and fewer "why is production looking
at my local test data?" moments.

It is written for Seth + Codex handoff work: practical enough to follow directly,
opinionated enough to prevent avoidable mistakes, and flexible enough for client
projects that will grow beyond a pleasant hobby-app shape.

## Default Stack

Use this as the starting point for new faith, education, publishing, or small
organization CMS projects.

- Payload CMS v3 with Next.js App Router.
- `pnpm` for package management and scripts.
- Postgres through `@payloadcms/db-postgres`.
- Vercel for hosting.
- Vercel Blob for media storage.
- Lexical rich text unless the project has a strong reason to use another editor.
- TypeScript everywhere, with generated Payload types committed when they are part
  of the app contract.

Avoid `@payloadcms/db-vercel-postgres`; use the official Postgres adapter instead.
Keep `push: false` in Payload's Postgres adapter so schema changes move through
intentional migrations.

## Environment Model

This project intentionally shares one database between local development and
production because it is a personal project and that convenience is useful. That is
not the default for client work.

For client projects, start with separate lanes:

- Production: live content, live editors, live media.
- Preview or staging: production-like deploys for review and migration rehearsal.
- Local development: developer-owned data that can be reset.
- Tests: disposable data, ideally a dedicated database or schema.

Use one `DATABASE_URL` per environment. Do not copy production credentials into
local defaults. If local work needs realistic content, export/import a scrubbed
snapshot or create a deliberate staging clone. Treat direct local writes to
production as an exception that requires a named reason.

Use separate Blob stores or tokens for production and non-production environments.
Media bugs are easier to clean up when test uploads do not land beside client
production assets.

Suggested env files for future scaffolds:

```text
.env.local        # local development only
.env.test.local   # automated tests only
.env.example      # placeholders only
```

Suggested environment variables:

```text
DATABASE_URL=postgresql://...
TEST_DATABASE_URL=postgresql://...
PAYLOAD_SECRET=replace-with-a-long-random-string
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_placeholder
SITE_URL=https://example.com
```

Never commit real secrets. `.env.example` should show required keys with safe
placeholder values only.

## Database And Migrations

Start every client project with migration discipline, even if the first version is
tiny.

- Configure `postgresAdapter({ push: false, pool: { connectionString } })`.
- Generate migrations when collections, fields, indexes, enums, or relationships
  change.
- Run migrations locally or against staging before production.
- Run production migrations only during controlled deploys.
- Confirm backups, point-in-time recovery, or an equivalent rollback story before
  production data matters.
- Keep migration files in source control.

For Vercel deploys, it is reasonable to run Payload migrations as part of the
production build command, but only if the app has already rehearsed the migration
against staging data. Do not run destructive one-off scripts from a build step.

When a script can modify production-like data, make the script ask for explicit
confirmation. Good examples:

- Require `--write` before changing anything.
- Require a second flag such as `--confirm-production` or `--confirm-shared-db`
  when the target may be live.
- Require bounded targets such as `--ids`, `--limit`, or `--start-after`.
- Default to dry-run output.

## Draft-Safe Public Reads

Public frontend routes must only expose intentionally published content.

Recommended pattern:

- Add a `status` field or Payload drafts workflow for publish state.
- Centralize public query helpers so every public read shares the same published
  filter.
- Keep admin access broader than public access, but do not let the public app call
  broad admin helpers by accident.
- Return 404s for draft or missing slugs.
- Test that draft content does not appear on index pages, detail pages, metadata,
  OpenGraph images, feeds, or search endpoints.

If a future project adds memberships or classroom access, make the access boundary
explicit before building public routes. "Published" and "allowed for this viewer"
are separate questions.

## Media And Blob Storage

Media needs early architecture because retrofitting it later is fussy in exactly
the way that makes a Tuesday longer than it needs to be.

Recommended defaults:

- Use Vercel Blob or another durable object store for deployed environments.
- Keep browser uploads collision-safe by assigning unique filenames before upload.
- Allow server-side generated image sizes to overwrite during retries, so partial
  image processing failures can recover.
- Store alt text as required editorial data, not optional decoration.
- Prefer generated image sizes in public rendering, with a fallback to the original
  image URL for older records.
- Keep media maintenance scripts dry-run first and bounded in write mode.

If a project has production and staging Blob stores, make sure copied database
records do not point at private or missing assets. When importing production data
into staging, either keep production Blob URLs readable or rewrite media URLs as
part of the import process.

## Admin Experience

Payload admin polish is worth doing early because editors live there.

Useful defaults:

- Add short admin intro components for dashboards and important collections.
- Use `admin.description`, `defaultColumns`, grouping, and clear labels to reduce
  training burden.
- Prefer field structures that match the editor's mental model, not the database
  model.
- Add public preview links only when the document is actually published or safely
  previewable.
- Keep import maps current after adding or moving custom admin components.

Admin dev server recovery checklist:

```bash
rm -rf .next
pnpm generate:importmap
pnpm dev
```

Use that when admin components disappear, fields render blank, `_not-found/page.js`
goes missing, or Next reports stale Server Action IDs. Also make sure only one dev
server is running for the repo before chasing stranger theories.

## Testing And Safety

Future scaffolds should not load `.env.local` implicitly for tests. Use
`TEST_DATABASE_URL` or `.env.test.local` so test seed data never lands in client
production by surprise.

Recommended script shape:

```json
{
  "scripts": {
    "dev": "cross-env NODE_OPTIONS=--no-deprecation next dev",
    "devsafe": "rm -rf .next && cross-env NODE_OPTIONS=--no-deprecation next dev",
    "generate:importmap": "cross-env NODE_OPTIONS=--no-deprecation payload generate:importmap",
    "generate:types": "cross-env NODE_OPTIONS=--no-deprecation payload generate:types",
    "lint": "cross-env NODE_OPTIONS=--no-deprecation eslint .",
    "payload": "cross-env NODE_OPTIONS=--no-deprecation payload",
    "test": "pnpm test:int && pnpm test:e2e",
    "test:int": "cross-env NODE_OPTIONS=--no-deprecation vitest run",
    "test:e2e": "cross-env NODE_OPTIONS=\"--no-deprecation --import=tsx/esm\" playwright test"
  }
}
```

Seed helpers should:

- Use unique, obvious test identifiers.
- Clean up after themselves.
- Refuse to run against production unless explicitly allowed.
- Avoid deleting broad data sets.

Validation before deploy:

```bash
pnpm run lint
pnpm run build
pnpm run test:int
pnpm run test:e2e
```

Stop the dev server before production builds when local `.next` churn might
interfere with build output.

## Frontend Direction

For faith and education sites, aim for calm editorial clarity rather than SaaS
confetti.

Recommended defaults:

- Semantic HTML first.
- CSS-first interactions when native controls provide the right behavior.
- Accessible color contrast, focus states, form labels, and keyboard paths.
- Readable long-form typography.
- Public pages that fail softly: useful empty states, 404s, and metadata.
- No public admin links unless there is a real user-facing reason.
- Draft-safe metadata and social images.

For visually impaired users and editors, prefer native controls, clear headings,
predictable focus order, and text that says what the action actually does. Do not
hide essential meaning in color, hover-only UI, or decorative icons.

## New Project Checklist

Use this when scaffolding the next Payload project.

1. Create the app with Payload v3, Next.js App Router, TypeScript, and `pnpm`.
2. Install and configure `@payloadcms/db-postgres`; keep `push: false`.
3. Add `Users`, `Media`, and the first domain collection.
4. Add a publish-state pattern before building public pages.
5. Create separate production, staging, local, and test database plans.
6. Configure Blob storage with separate production and non-production tokens.
7. Add `.env.example` with placeholders only.
8. Add `generate:types`, `generate:importmap`, `lint`, `build`, and test scripts.
9. Add seed/test helpers that use test-specific environment variables.
10. Build public query helpers that filter to published content by default.
11. Add basic admin guidance components where editors will start.
12. Add recovery notes for `.next` cleanup and import map regeneration.
13. Run lint, build, integration tests, and E2E tests before first deploy.
14. Rehearse migrations outside production before live content matters.

## Codex Handoff Notes

When Codex works on a future Payload client project, start by checking:

- Current `payload.config.ts` database adapter and `push` setting.
- Whether tests load `.env.local`, `.env.test.local`, or `TEST_DATABASE_URL`.
- Whether public frontend helpers centralize published-content filtering.
- Whether media storage has separate production and non-production credentials.
- Whether scripts that write data default to dry-run mode.
- Whether generated Payload types or import maps need regeneration.

For this repo specifically, remember that local and production currently share a
database by choice. Do not "fix" that unless Seth explicitly asks. For client
repos, make separated data lanes the default from the first commit.
