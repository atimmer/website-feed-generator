---
summary: "Overview of the website feed generator app and its moving parts."
read_when:
  - "Getting oriented in the repo"
  - "Working on Convex schema/functions"
  - "Touching the feed generation flow"
---

# Website Feed Generator

This project is a Vite + React frontend with a Convex backend. It generates website feeds using Convex functions and OpenAI, with local dev running both the frontend and Convex dev server.

## Key areas

- `src/`: frontend UI and client logic.
- `convex/`: Convex schema, functions, and backend utilities.
- `setup.mjs`: local bootstrap script for environment/config prep.

## Dev flow

- `pnpm dev` runs both the frontend and Convex dev server.
- `pnpm lint` runs typechecks and a Convex build + Vite build.
