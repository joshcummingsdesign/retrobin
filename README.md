# RetroBin

A retro gaming console archive.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Update the collection

1. Export the `Consoles` Google Sheet tab to `public/data/consoles.csv`.
2. Export the `Items` tab to `public/data/items.csv`.
3. Put transparent 640×480 PNG artwork in the matching folder under `public/images`.
4. Commit and redeploy.

Separate multiple values in `consoleIds` with `|`. Dates use `YYYY-MM-DD`.
Item statuses are `owned`, `wanted`, `for-sale`, or `incoming`.
