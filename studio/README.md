# Mr Nobody Sanity Studio

This is the in-repo Studio app for editing site content.

## Setup

1. Copy `.env.example` to `.env` in this `studio` folder.
2. Set:
   - `SANITY_STUDIO_PROJECT_ID`
   - `SANITY_STUDIO_DATASET`

The Studio reads schemas from `../sanity/schemas`.

## Run

From repo root:

```bash
npm run studio
```

Or directly:

```bash
npm --prefix studio run dev
```
