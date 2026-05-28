# Sanity content model

This folder contains the schema for the website CMS content:

- `panel` document: panel title, gallery images, and case study fields.
- `aboutPage` document: About page copy.
- `contactPage` document: Contact page copy.

## In-repo Studio

The repository now includes a Studio app at `studio/` that already loads these schemas.

Run it from the repo root:

```bash
npm run studio
```

Create one `aboutPage` document, one `contactPage` document, and one `panel` document per panel slot (`panelId` values `1` through `9`).

## Frontend environment variables

Set these in your frontend `.env`:

```
REACT_APP_SANITY_PROJECT_ID=yourProjectId
REACT_APP_SANITY_DATASET=production
REACT_APP_SANITY_API_VERSION=2026-01-01
```

If these variables are missing, the app falls back to local default content.
