# About page QR code

Destination: https://orpheus-azure.vercel.app/about

- `orpheus-about-qr.png`: black on white, suitable for documents and sharing.
- `orpheus-about-qr.svg`: scalable version for print.

The QR code encodes the destination directly, with no tracking or redirect service.
Keep the white margin intact when placing it in a document.

The `/about` route is public and does not require an Orpheus account.
The About page must be deployed before sharing the QR code: the production URL
returned HTTP 404 when checked on 2026-10-15.

Both files use error correction level Q. The PNG was decoded independently to
verify that it contains the exact destination above.
