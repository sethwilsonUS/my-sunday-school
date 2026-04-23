# Project Notes For Codex

## Workflow
- Do not commit or push changes unless Seth explicitly asks for a commit or push.
- Assume `pnpm dev` is already running unless Seth says otherwise. Do not start a dev server by default.
- Prefer local edits plus validation commands, then let Seth test in the browser before deployment.
- If a generated file is already modified, do not overwrite it unless it is directly required for the task.

## Project
- This is a Payload CMS v3 + Next.js app using `pnpm`.
- Keep the public site draft-safe: public frontend reads should only expose published lessons.
- Do not add real secrets to committed files. Keep `.env.local` local and update `.env.example` only with placeholder values.

## Style
- Keep the frontend in the editorial lectionary direction already established: readable, refined, calm, and accessible.
- Favor semantic HTML and CSS-first interactions when they fit, especially for content controls like accordions.
- Be thoughtful about screen-reader and keyboard behavior; native controls are preferred when they provide the right semantics.
