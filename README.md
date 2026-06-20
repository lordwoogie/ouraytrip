# Ouray Family Trip Site

A small 3-page static site for the OKC → Ouray, CO road trip (June 23–29, 2026).

## Pages

| URL        | File                  | Audience              | Purpose                                      |
|------------|-----------------------|-----------------------|----------------------------------------------|
| `/`        | `public/index.html`   | Whole family          | Trip dossier: itinerary, map, bookings, crew |
| `/ripley`  | `public/ripley.html`  | Hudson (dog-sitter)   | Ripley's house & care guide                  |
| `/owen`    | `public/owen.html`    | Greg & Stephanie      | Owen's feeding/care schedule (printable)     |

All three pages cross-link in their footers/headers. `vercel.json` enables
clean URLs, so `/ripley` and `/owen` work without the `.html`.

## Deploy

From this folder:

```bash
vercel          # preview deploy
vercel --prod   # production deploy
```

Or push to a Git repo connected to Vercel. No build step — it's static.

## Notes

- The trip map uses Leaflet from cdnjs (no build needed).
- Owen's page is designed to print to one page (Cmd/Ctrl-P → Save as PDF).
  The top nav bar is hidden automatically when printing.
- To re-deploy after edits, just save the file and run `vercel --prod` again.
