# Logo & icon assets

`LOGO.jpeg` is the original source mark. Everything else here is generated from
it (background removed, cropped, and rendered at the sizes each use case needs):

- `logo.png` — transparent header logo, used in the in-page header of
  `index.html`, `hr.html`, `pv.html`, `smo.html`, and `hr.html`'s printable
  letterhead (payslips, attendance/leave/employee reports) via the `LOGO_URL`
  constant in the script.
- `favicon.ico`, `favicon-16.png`, `favicon-32.png` — browser tab icon.
- `apple-touch-icon.png` (180×180) — icon shown when the site is added to an
  iOS/iPadOS home screen.
- `icon-192.png`, `icon-512.png` + `site.webmanifest` — icon shown when the
  site is installed/bookmarked as a PWA on Android/desktop.

All four HTML pages link the same favicon/apple-touch-icon/manifest set, so a
bookmark or home-screen shortcut created from any of them shows this logo.

Nothing breaks if `logo.png` is missing — headers hide the broken image
gracefully and printed reports just omit the mark.
