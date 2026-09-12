# RetroBin

A retro gaming console archive.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Update the collection

1. Edit the published Google Sheet's `Consoles` and `Items` tabs.
2. Put transparent 640×480 PNG artwork in the matching folder under `public/images`.

Changes to the published Sheet appear after refreshing the site; Google may briefly cache them.

Separate multiple values in `consoleIds` with `|`. Dates use `YYYY-MM-DD`.
Item statuses are `favorites`, `hunting`, `trading`, or `awaiting`. Leave the status blank for uncategorized items.
