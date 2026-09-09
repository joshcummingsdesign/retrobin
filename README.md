# Retro Log

A responsive Next.js catalog driven by local CSV files and images.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Update the collection

1. Export the `Consoles` Google Sheet tab to `public/data/consoles.csv`.
2. Export the `Items` tab to `public/data/items.csv`.
3. Put WebP artwork in the matching folder under `public/images`.
4. Commit and redeploy.

Separate multiple values in `consoleIds` with `|`. Dates use `YYYY-MM-DD`.
