# Research register (not published)

These files hold every research record, including those that are not shown on the public site:
unconfirmed, disputed and withheld records, alternative dates, original wording and source notes.

- `Public_Status` says what the public site shows for each record: Published, Published (trimmed),
  Published as Illustrative, Placeholder only, Withheld, or Shown as planned.
- `Public_Note` gives the reason, with the decision reference (D1–D9 are the owner's decisions of
  16 October 2026; R1–R2 are review rules; see the review workbook's Decision log).
- `coordinate_review.json` records candidate coordinates for the base pins and the evidence checked for them;
  candidates are applied to `public/data/` only after the owner approves them.
- `research/archive/proposal-v4/` is an unchanged copy of the Proposal v4 data these files were built from.

Nothing in `research/` is copied into the built site, and the development server refuses to serve it.
To publish a record, edit `public/data/` and record the decision here.
