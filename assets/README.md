# assets/logo.png

Drop the official SN SCORT Research Solutions logo here as `logo.png` (or `.svg`,
update the references below if so).

It is referenced from:
- `index.html` — header + favicon
- `hr.html` — header + favicon
- `hr.html` printable letterhead (payslips, attendance/leave/employee reports),
  via the `LOGO_URL` constant in the script

Nothing breaks if the file is missing — headers hide the broken image gracefully
and printed reports just omit the mark.
