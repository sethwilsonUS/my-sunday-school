# Lectionary Lessons

Payload CMS and Next.js site for publishing weekly lectionary lessons with curated artwork.

## Local Development

1. Copy local environment values into `.env.local`.
2. Install dependencies with `pnpm install`.
3. Start one dev server with `pnpm dev`.
4. Open `http://localhost:3000`.

This project currently uses the same database for local development and production. Treat local admin writes, seed scripts, and one-off maintenance scripts as live data operations.

## Admin Dev Server Recovery

Payload admin import maps and Next.js Server Action IDs can get stale after changing admin components, upload providers, or Payload config. If the admin shows a blank field, missing Payload component, missing `_not-found/page.js`, or a "Server Action was not found" error:

1. Stop every running dev server for this repo.
2. Run `rm -rf .next`.
3. Run `pnpm generate:importmap` if Payload admin components or providers changed.
4. Start exactly one server with `pnpm dev`.
5. Hard refresh the admin page in the browser.

`pnpm devsafe` combines the `.next` cleanup with `next dev`, but still make sure only one dev server is running.

## Media Uploads

Media uploads use Vercel Blob through a custom Payload upload path:

- Browser uploads get a random filename suffix before they reach Blob, which avoids "Blob already exists" collisions.
- Payload-generated image sizes are uploaded server-side with overwrite enabled, so a retry can finish after a partial failure.
- Public rendering uses generated sizes when available and falls back to the original image URL when old media has not been backfilled.

OpenGraph images use the first artwork attached to a lesson. The helper prefers `large`, then `card`, then the original media URL.

## Media Size Backfill

Backfill is intentionally separate from deploy. The script defaults to dry-run mode and only reports media records whose generated sizes are missing or stale:

```bash
pnpm media:backfill-sizes
pnpm media:backfill-sizes -- --ids 72
```

Write mode requires explicit shared-database confirmation and a bounded target:

```bash
pnpm media:backfill-sizes -- --write --confirm-shared-db --ids 72
pnpm media:backfill-sizes -- --write --confirm-shared-db --limit 5 --start-after 20
```

The script uploads new derivative files and updates only `sizes` metadata. It does not delete originals or old Blob files. Run one canary record first, inspect the admin preview, public lesson page, and OpenGraph image, then continue in small batches.

When an old media record stores a relative original URL, the script resolves it against `MEDIA_BACKFILL_ORIGIN` when set, then falls back to the configured site/Vercel/local origin and the direct Vercel Blob URL.

## Validation

```bash
pnpm run lint
pnpm run build
pnpm run test:int
pnpm run test:e2e
```

Stop the dev server before `pnpm run build` so Next.js does not read a stale `.next` tree while another process is writing to it.
